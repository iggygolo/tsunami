import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import { usePlaylistTrackResolution } from '@/hooks/usePlaylistTrackResolution';
import type { PodcastRelease, ReleaseSearchOptions, MusicTrackData } from '@/types/podcast';
import { getArtistPubkeyHex, PODCAST_KINDS } from '@/lib/podcastConfig';
import { extractZapAmount, validateZapEvent } from '@/lib/zapUtils';
import {
  validateMusicTrack,
  validateMusicPlaylist,
  eventToMusicTrack,
  eventToMusicPlaylist,
  playlistToRelease,
  trackToRelease,
  eventToPodcastRelease,
  deduplicateEventsByIdentifier,
  getEventIdentifier
} from '@/lib/eventConversions';

/**
 * Hook to fetch playlist releases using simplified playlist track resolution
 * Only shows playlists (which can contain multiple tracks), not individual tracks
 * Follows the same pattern as useLatestReleaseSimplified for consistency
 * 
 * CACHING STRATEGY:
 * - When releases are fetched for the list, individual release data is cached
 * - This includes: release events, resolved tracks, and converted release objects
 * - When navigating to a specific release page, useReleaseData will find cached data
 * - This eliminates the need to re-fetch and re-resolve tracks for instant navigation
 */
export function useReleases(searchOptions: ReleaseSearchOptions = {}) {
  const { nostr } = useNostr();
  const queryClient = useQueryClient();

  // Step 1: Fetch only playlist events from the artist (not individual tracks)
  const { data: playlistEvents, isLoading: isLoadingEvents } = useQuery({
    queryKey: ['playlist-events', searchOptions.limit, searchOptions.offset],
    queryFn: async (context) => {
      const signal = AbortSignal.any([context.signal, AbortSignal.timeout(15000)]);
      const artistPubkey = getArtistPubkeyHex();

      console.log('Fetching playlist events from artist:', artistPubkey.slice(0, 8) + '...');

      // Fetch only playlists (not individual tracks)
      const playlistEvents = await nostr.query([{
        kinds: [PODCAST_KINDS.MUSIC_PLAYLIST],
        authors: [artistPubkey],
        limit: searchOptions.limit || 50
      }], { signal });

      // Deduplicate playlist events
      const deduplicatedEvents = deduplicateEventsByIdentifier(playlistEvents, getEventIdentifier);

      console.log('Found playlist events:', {
        playlists: playlistEvents.length,
        deduplicated: deduplicatedEvents.length
      });

      return deduplicatedEvents;
    },
    staleTime: 300000, // 5 minutes
  });

  // Step 2: Process playlist events and extract track references
  const processedEvents = playlistEvents || [];
  const validPlaylistEvents = processedEvents.filter(event => 
    event.kind === PODCAST_KINDS.MUSIC_PLAYLIST && validateMusicPlaylist(event)
  );

  // Extract all track references from playlists
  const allTrackReferences = validPlaylistEvents.flatMap(event => {
    const playlist = eventToMusicPlaylist(event);
    return playlist.tracks;
  });

  // Step 3: Resolve track references to actual track data
  const { data: resolvedTracks, isLoading: isLoadingTracks } = usePlaylistTrackResolution(allTrackReferences);

  // Step 4: Convert playlist events to releases
  const { data: releases, isLoading: isLoadingConversion } = useQuery({
    queryKey: ['releases-conversion', validPlaylistEvents.length, resolvedTracks?.length],
    queryFn: async () => {
      if (!validPlaylistEvents.length) return [];

      console.log('Converting playlist events to releases');

      const releases: PodcastRelease[] = [];

      // Create tracks map from resolved tracks
      const tracksMap = new Map<string, MusicTrackData>();
      if (resolvedTracks) {
        resolvedTracks.forEach(resolved => {
          if (resolved.trackData) {
            const key = `${resolved.trackData.artistPubkey}:${resolved.trackData.identifier}`;
            tracksMap.set(key, resolved.trackData);
          }
        });
      }

      // Convert only playlist events to releases
      for (const event of validPlaylistEvents) {
        try {
          const playlist = eventToMusicPlaylist(event);
          const release = playlistToRelease(playlist, tracksMap);
          releases.push(release);

          // Cache individual release data for instant loading when navigating to release page
          const releaseKey = `${release.artistPubkey}:${PODCAST_KINDS.MUSIC_PLAYLIST}:${release.identifier}`;
          
          console.log('useReleases - Caching release data for instant navigation:', {
            title: release.title,
            releaseKey,
            eventId: event.id
          });
          
          // Cache the release event
          queryClient.setQueryData(
            ['release-event', releaseKey],
            event,
            { updatedAt: Date.now() }
          );

          // Cache the resolved tracks for this release
          const releaseTrackReferences = playlist.tracks;
          const releaseResolvedTracks = resolvedTracks?.filter(resolved => 
            releaseTrackReferences.some(ref => 
              resolved.trackData && 
              `${resolved.trackData.artistPubkey}:${resolved.trackData.identifier}` === `${ref.pubkey}:${ref.identifier}`
            )
          ) || [];

          if (releaseResolvedTracks.length > 0) {
            queryClient.setQueryData(
              ['playlist-track-resolution', JSON.stringify(releaseTrackReferences)],
              releaseResolvedTracks,
              { updatedAt: Date.now() }
            );
          }

          // Cache the final converted release
          queryClient.setQueryData(
            ['release-conversion', event.id, releaseResolvedTracks.length],
            release,
            { updatedAt: Date.now() }
          );

        } catch (error) {
          console.error('Failed to convert playlist to release:', error);
        }
      }

      // Apply search filtering
      let filteredReleases = releases;

      if (searchOptions.query) {
        const query = searchOptions.query.toLowerCase();
        filteredReleases = filteredReleases.filter(release =>
          release.title.toLowerCase().includes(query) ||
          release.description?.toLowerCase().includes(query)
        );
      }

      // Apply sorting
      const sortBy = searchOptions.sortBy || 'date';
      const sortOrder = searchOptions.sortOrder || 'desc';

      filteredReleases.sort((a, b) => {
        let comparison = 0;

        switch (sortBy) {
          case 'date':
            comparison = a.publishDate.getTime() - b.publishDate.getTime();
            break;
          case 'title':
            comparison = a.title.localeCompare(b.title);
            break;
          case 'zaps':
            comparison = (a.zapCount || 0) - (b.zapCount || 0);
            break;
          case 'comments':
            comparison = (a.commentCount || 0) - (b.commentCount || 0);
            break;
        }

        return sortOrder === 'desc' ? -comparison : comparison;
      });

      console.log('Conversion complete:', {
        totalReleases: releases.length,
        filteredReleases: filteredReleases.length,
        searchQuery: searchOptions.query,
        sortBy,
        sortOrder
      });

      return filteredReleases;
    },
    enabled: !!validPlaylistEvents.length,
    staleTime: 300000, // 5 minutes
  });

  const isLoading = isLoadingEvents || isLoadingTracks || isLoadingConversion;

  return {
    data: releases || [],
    isLoading,
    error: null // Could add error handling if needed
  };
}

/**
 * Hook to fetch a single podcast release by playlist ID
 * Improved to handle all event types properly with the reworked conversion functions
 */
export function usePodcastRelease(playlistId: string) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['podcast-release', playlistId],
    queryFn: async (context) => {
      const signal = AbortSignal.any([context.signal, AbortSignal.timeout(5000)]);

      // First try to fetch the event
      const events = await nostr.query([{
        ids: [playlistId]
      }], { signal });

      const event = events[0];
      if (!event) return null;

      // Handle music playlist events (Kind 34139)
      if (event.kind === PODCAST_KINDS.MUSIC_PLAYLIST && validateMusicPlaylist(event)) {
        const playlist = eventToMusicPlaylist(event);
        
        // Extract track references and fetch tracks
        const trackReferences = new Set<string>();
        const referencedPubkeys = new Set<string>();
        
        playlist.tracks.forEach(trackRef => {
          trackReferences.add(`${trackRef.pubkey}:${trackRef.identifier}`);
          referencedPubkeys.add(trackRef.pubkey);
        });

        // Fetch all referenced tracks
        let trackEvents: any[] = [];
        
        if (referencedPubkeys.size > 0) {
          const identifiersByPubkey = new Map<string, string[]>();
          
          for (const ref of trackReferences) {
            const [pubkey, identifier] = ref.split(':');
            if (!identifiersByPubkey.has(pubkey)) {
              identifiersByPubkey.set(pubkey, []);
            }
            identifiersByPubkey.get(pubkey)!.push(identifier);
          }
          
          const trackQueries = Array.from(identifiersByPubkey.entries()).map(([pubkey, identifiers]) => ({
            kinds: [PODCAST_KINDS.MUSIC_TRACK],
            authors: [pubkey],
            '#d': identifiers,
            limit: identifiers.length * 2
          }));
          
          const allTrackEvents = await Promise.all(
            trackQueries.map(query => nostr.query([query], { signal }))
          );
          
          trackEvents = allTrackEvents.flat();
        }

        const validTracks = trackEvents.filter(validateMusicTrack);
        const tracksMap = new Map<string, MusicTrackData>();
        
        validTracks.forEach(trackEvent => {
          const track = eventToMusicTrack(trackEvent);
          const key = `${track.artistPubkey}:${track.identifier}`;
          
          const existing = tracksMap.get(key);
          if (!existing || trackEvent.created_at > (existing as any).created_at) {
            tracksMap.set(key, track);
          }
        });

        return playlistToRelease(playlist, tracksMap);
      }

      // Handle music track events (Kind 36787)
      if (event.kind === PODCAST_KINDS.MUSIC_TRACK && validateMusicTrack(event)) {
        const track = eventToMusicTrack(event);
        return trackToRelease(track);
      }

      // Handle any other supported event type
      try {
        return eventToPodcastRelease(event);
      } catch (error) {
        console.error('usePodcastRelease - Event conversion failed:', error);
        return null;
      }
    },
    enabled: !!playlistId,
    staleTime: 300000, // 5 minutes
  });
}

/**
 * Hook to get podcast statistics
 */
export function usePodcastStats() {
  const { data: releases } = useReleases();

  return useQuery({
    queryKey: ['podcast-stats', releases?.length],
    queryFn: async () => {
      if (!releases) return null;

      const totalReleases = releases.length;
      const totalZaps = releases.reduce((sum, ep) => sum + (ep.zapCount || 0), 0);
      const totalComments = releases.reduce((sum, ep) => sum + (ep.commentCount || 0), 0);
      const totalReposts = releases.reduce((sum, ep) => sum + (ep.repostCount || 0), 0);

      const mostZappedRelease = releases.reduce((max, ep) =>
        (ep.zapCount || 0) > (max?.zapCount || 0) ? ep : max, releases[0]
      );

      const mostCommentedRelease = releases.reduce((max, ep) =>
        (ep.commentCount || 0) > (max?.commentCount || 0) ? ep : max, releases[0]
      );

      return {
        totalReleases,
        totalZaps,
        totalComments,
        totalReposts,
        mostZappedRelease: mostZappedRelease?.zapCount ? mostZappedRelease : undefined,
        mostCommentedRelease: mostCommentedRelease?.commentCount ? mostCommentedRelease : undefined,
        recentEngagement: [] // TODO: Implement recent engagement tracking
      };
    },
    enabled: !!releases,
    staleTime: 300000, // 5 minutes
  });
}
// Re-export centralized conversion functions for backward compatibility
export { playlistToRelease, trackToRelease, eventToPodcastRelease } from '@/lib/eventConversions';