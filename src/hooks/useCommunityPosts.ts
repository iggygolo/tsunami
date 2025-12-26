import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import { useReleases } from '@/hooks/useReleases';
import { useDiscoveredArtists } from '@/hooks/useArtistProfiles';
import type { NostrEvent } from '@nostrify/nostrify';

/**
 * Hook to discover music artists from existing releases
 */
function useDiscoveredMusicArtists() {
  const { data: releases } = useReleases();
  
  // Extract unique artist pubkeys from releases
  const artistPubkeys = Array.from(new Set(
    (releases || []).map(release => release.artistPubkey).filter(Boolean)
  ));

  return {
    artistPubkeys,
    artistCount: artistPubkeys.length
  };
}

/**
 * Hook to fetch social posts from all discovered music artists with infinite scroll
 */
export function useCommunityPosts(limit: number = 20, artistFilter?: string) {
  const { nostr } = useNostr();
  const { artistPubkeys } = useDiscoveredMusicArtists();

  return useInfiniteQuery({
    queryKey: ['community-posts', artistFilter, limit],
    queryFn: async ({ pageParam }) => {
      const signal = AbortSignal.any([AbortSignal.timeout(10000)]);

      // Determine which artists to query
      const authorsToQuery = artistFilter ? [artistFilter] : artistPubkeys;
      
      if (authorsToQuery.length === 0) {
        console.log('No music artists discovered yet for community posts');
        return [];
      }

      console.log(`Fetching community posts from ${authorsToQuery.length} music artists...`);

      // Query for text notes (kind 1) from all music artists
      const events = await nostr.query([{
        kinds: [1], // Text notes
        authors: authorsToQuery,
        limit: limit * 2, // Get more to filter out replies
        until: pageParam, // Use until for pagination
      }], { signal });

      // Filter out replies (events that have 'e' tags) to only show root notes
      const rootNotes = events.filter(event =>
        !event.tags.some(tag => tag[0] === 'e')
      );

      // Sort by creation time (most recent first)
      const sortedNotes = rootNotes.sort((a, b) => b.created_at - a.created_at).slice(0, limit);

      console.log(`Found ${sortedNotes.length} community posts from ${authorsToQuery.length} artists`);

      return sortedNotes;
    },
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (lastPage, allPages) => {
      // If we got fewer results than requested, we've reached the end
      if (lastPage.length < limit) return undefined;

      // If no posts were returned, we've reached the end
      if (lastPage.length === 0) return undefined;

      // Get the oldest timestamp from this page
      const oldestTimestamp = lastPage[lastPage.length - 1].created_at;

      // To prevent infinite loops, check if we're getting the same timestamp
      const allTimestamps = allPages.flat().map(event => event.created_at);
      if (allTimestamps.includes(oldestTimestamp)) {
        // We've seen this timestamp before, likely no more unique posts
        return undefined;
      }

      return oldestTimestamp;
    },
    enabled: artistPubkeys.length > 0 || !!artistFilter,
    staleTime: 10000, // 10 seconds - more aggressive refresh for community posts
  });
}

/**
 * Hook to get community activity (posts + reposts + reactions) from all music artists
 */
export function useCommunityActivity(limit: number = 50, artistFilter?: string) {
  const { nostr } = useNostr();
  const { artistPubkeys } = useDiscoveredMusicArtists();

  return useQuery({
    queryKey: ['community-activity', artistFilter, limit],
    queryFn: async (context) => {
      const signal = AbortSignal.any([context.signal, AbortSignal.timeout(10000)]);

      // Determine which artists to query
      const authorsToQuery = artistFilter ? [artistFilter] : artistPubkeys;
      
      if (authorsToQuery.length === 0) {
        console.log('No music artists discovered yet for community activity');
        return [];
      }

      console.log(`Fetching community activity from ${authorsToQuery.length} music artists...`);

      // Query for multiple kinds from all music artists
      const events = await nostr.query([{
        kinds: [1, 6, 16, 7], // Text notes, legacy reposts, generic reposts, reactions
        authors: authorsToQuery,
        limit: limit * 2 // Get more to ensure we have enough after filtering
      }], { signal });

      // Sort by creation time and limit results
      const sortedEvents = events
        .sort((a, b) => b.created_at - a.created_at)
        .slice(0, limit);

      console.log(`Found ${sortedEvents.length} community activity events from ${authorsToQuery.length} artists`);

      return sortedEvents;
    },
    enabled: artistPubkeys.length > 0 || !!artistFilter,
    staleTime: 60000, // 1 minute
  });
}

/**
 * Hook to get community statistics across all music artists
 */
export function useCommunityStats() {
  const { artistCount } = useDiscoveredMusicArtists();
  const { data: communityActivity } = useCommunityActivity(200); // Get more for stats

  return useQuery({
    queryKey: ['community-stats', artistCount, communityActivity?.length],
    queryFn: async () => {
      if (!communityActivity || communityActivity.length === 0) {
        return {
          totalArtists: artistCount,
          totalPosts: 0,
          totalReposts: 0,
          totalReactions: 0,
          activeArtists: 0,
          recentActivity: []
        };
      }

      const posts = communityActivity.filter(e => e.kind === 1);
      const reposts = communityActivity.filter(e => e.kind === 6 || e.kind === 16);
      const reactions = communityActivity.filter(e => e.kind === 7);

      // Count active artists (those who posted in the last 7 days)
      const weekAgo = Math.floor(Date.now() / 1000) - (7 * 24 * 60 * 60);
      const recentEvents = communityActivity.filter(e => e.created_at > weekAgo);
      const activeArtists = new Set(recentEvents.map(e => e.pubkey)).size;

      return {
        totalArtists: artistCount,
        totalPosts: posts.length,
        totalReposts: reposts.length,
        totalReactions: reactions.length,
        activeArtists,
        recentActivity: communityActivity.slice(0, 10) // Most recent 10 events
      };
    },
    enabled: !!communityActivity,
    staleTime: 300000, // 5 minutes
  });
}

/**
 * Hook to get featured/highlighted artists based on recent activity
 */
export function useFeaturedArtists(limit: number = 6) {
  const { artistPubkeys } = useDiscoveredMusicArtists();
  const { data: communityActivity } = useCommunityActivity(100);

  // Fetch profiles for discovered artists
  const { data: artistProfiles } = useDiscoveredArtists(
    artistPubkeys.map(pubkey => ({ pubkey }))
  );

  return useQuery({
    queryKey: ['featured-artists', artistPubkeys.length, communityActivity?.length, limit],
    queryFn: async () => {
      if (!communityActivity || !artistProfiles) {
        return [];
      }

      // Calculate activity scores for each artist
      const artistScores = new Map<string, number>();
      const weekAgo = Math.floor(Date.now() / 1000) - (7 * 24 * 60 * 60);

      communityActivity.forEach(event => {
        if (event.created_at > weekAgo) {
          const currentScore = artistScores.get(event.pubkey) || 0;
          // Weight different types of activity
          let points = 0;
          switch (event.kind) {
            case 1: points = 3; break; // Posts worth 3 points
            case 6:
            case 16: points = 2; break; // Reposts worth 2 points
            case 7: points = 1; break; // Reactions worth 1 point
          }
          artistScores.set(event.pubkey, currentScore + points);
        }
      });

      // Sort artists by activity score and take top ones
      const featuredArtists = artistProfiles
        .map(artist => ({
          ...artist,
          activityScore: artistScores.get(artist.pubkey) || 0
        }))
        .sort((a, b) => b.activityScore - a.activityScore)
        .slice(0, limit);

      console.log(`Featured ${featuredArtists.length} artists based on recent activity`);

      return featuredArtists;
    },
    enabled: !!communityActivity && !!artistProfiles,
    staleTime: 300000, // 5 minutes
  });
}

/**
 * Hook to fetch social posts from a specific artist (updated to work with any artist)
 */
export function useArtistSocialPosts(artistPubkey: string, limit: number = 20) {
  const { nostr } = useNostr();

  return useInfiniteQuery({
    queryKey: ['artist-social-posts', artistPubkey],
    queryFn: async ({ pageParam }) => {
      const signal = AbortSignal.any([AbortSignal.timeout(10000)]);

      // Query for text notes (kind 1) from the specific artist
      const events = await nostr.query([{
        kinds: [1], // Text notes
        authors: [artistPubkey],
        limit: limit * 2, // Get more to filter out replies
        until: pageParam, // Use until for pagination
      }], { signal });

      // Filter out replies (events that have 'e' tags) to only show root notes
      const rootNotes = events.filter(event =>
        !event.tags.some(tag => tag[0] === 'e')
      );

      // Sort by creation time (most recent first)
      return rootNotes.sort((a, b) => b.created_at - a.created_at).slice(0, limit);
    },
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (lastPage, allPages) => {
      // If we got fewer results than requested, we've reached the end
      if (lastPage.length < limit) return undefined;

      // If no posts were returned, we've reached the end
      if (lastPage.length === 0) return undefined;

      // Get the oldest timestamp from this page
      const oldestTimestamp = lastPage[lastPage.length - 1].created_at;

      // To prevent infinite loops, check if we're getting the same timestamp
      const allTimestamps = allPages.flat().map(event => event.created_at);
      if (allTimestamps.includes(oldestTimestamp)) {
        // We've seen this timestamp before, likely no more unique posts
        return undefined;
      }

      return oldestTimestamp;
    },
    enabled: !!artistPubkey,
    staleTime: 10000, // 10 seconds
  });
}