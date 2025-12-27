import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import { usePlaylistTrackResolution } from '@/hooks/usePlaylistTrackResolution';
import type { MusicRelease, ReleaseSearchOptions, MusicTrackData } from '@/types/music';
import { MUSIC_KINDS } from '@/lib/musicConfig';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import {
  validateMusicTrack,
  validateMusicPlaylist,
  eventToMusicTrack,
  eventToMusicPlaylist,
  playlistToRelease,
  trackToRelease,
  eventToRelease,
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

  // Step 1: Fetch playlist events from all artists (not individual tracks)
  const { data: playlistEvents, isLoading: isLoadingEvents } = useQuery({
    queryKey: ['multi-artist-playlist-events', searchOptions.limit, searchOptions.offset],
    queryFn: async (context) => {
      const signal = AbortSignal.any([context.signal, AbortSignal.timeout(15000)]);

      console.log('Fetching playlist events from all artists...');

      // Fetch playlists from all artists (remove authors filter)
      const playlistEvents = await nostr.query([{
        kinds: [MUSIC_KINDS.MUSIC_PLAYLIST],
        // No authors filter - get from all artists
        limit: searchOptions.limit || 100 // Increased limit for multi-artist content
      }], { signal });

      // Deduplicate playlist events
      const deduplicatedEvents = deduplicateEventsByIdentifier(playlistEvents, getEventIdentifier);

      console.log('Found playlist events from all artists:', {
        playlists: playlistEvents.length,
        deduplicated: deduplicatedEvents.length,
        uniqueArtists: [...new Set(deduplicatedEvents.map(e => e.pubkey))].length
      });

      return deduplicatedEvents;
    },
    staleTime: 300000, // 5 minutes
    enabled: searchOptions.enabled !== false, // Default to enabled unless explicitly disabled
  });

  // Step 2: Process playlist events and extract track references
  const processedEvents = playlistEvents || [];
  const validPlaylistEvents = processedEvents.filter(event => 
    event.kind === MUSIC_KINDS.MUSIC_PLAYLIST && validateMusicPlaylist(event)
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
    queryKey: ['multi-artist-releases-conversion', validPlaylistEvents.length, resolvedTracks?.length],
    queryFn: async () => {
      if (!validPlaylistEvents.length) return [];

      console.log('Converting playlist events to releases from multiple artists');

      const releases: MusicRelease[] = [];

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
          const releaseKey = `${release.artistPubkey}:${MUSIC_KINDS.MUSIC_PLAYLIST}:${release.identifier}`;
          
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

      console.log('Multi-artist conversion complete:', {
        totalReleases: releases.length,
        filteredReleases: filteredReleases.length,
        uniqueArtists: [...new Set(releases.map(r => r.artistPubkey))].length,
        searchQuery: searchOptions.query,
        sortBy,
        sortOrder
      });

      return filteredReleases;
    },
    enabled: !!validPlaylistEvents.length && searchOptions.enabled !== false,
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
 * Hook to fetch a single release by playlist ID
 * Improved to handle all event types properly with the reworked conversion functions
 */
export function usePlaylist(playlistId: string) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['playlist', playlistId],
    queryFn: async (context) => {
      const signal = AbortSignal.any([context.signal, AbortSignal.timeout(5000)]);

      console.log('🔍 usePlaylist - Fetching release:', playlistId);

      // First try to fetch the event
      const events = await nostr.query([{
        ids: [playlistId]
      }], { signal });

      const event = events[0];
      if (!event) {
        console.log('❌ usePlaylist - No event found for ID:', playlistId);
        return null;
      }

      console.log('📄 usePlaylist - Event found:', {
        id: event.id,
        kind: event.kind,
        created_at: event.created_at,
        pubkey: event.pubkey?.slice(0, 8) + '...',
        tags: event.tags?.length || 0
      });

      // Handle music playlist events (Kind 34139)
      if (event.kind === MUSIC_KINDS.MUSIC_PLAYLIST && validateMusicPlaylist(event)) {
        console.log('🎵 usePlaylist - Processing playlist event');
        const playlist = eventToMusicPlaylist(event);
        
        console.log('📋 usePlaylist - Playlist data:', {
          title: playlist.title,
          identifier: playlist.identifier,
          trackReferences: playlist.tracks?.length || 0,
          tracks: playlist.tracks?.map(ref => ({
            pubkey: ref.pubkey?.slice(0, 8) + '...',
            identifier: ref.identifier,
            title: ref.title
          })) || []
        });
        
        // Extract track references and fetch tracks
        const trackReferences = new Set<string>();
        const referencedPubkeys = new Set<string>();
        
        playlist.tracks.forEach(trackRef => {
          trackReferences.add(`${trackRef.pubkey}:${trackRef.identifier}`);
          referencedPubkeys.add(trackRef.pubkey);
        });

        console.log('🔗 usePlaylist - Track references to resolve:', {
          totalReferences: trackReferences.size,
          uniquePubkeys: referencedPubkeys.size,
          references: Array.from(trackReferences).map(ref => {
            const [pubkey, identifier] = ref.split(':');
            return `${pubkey.slice(0, 8)}.../${identifier}`;
          })
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
            kinds: [MUSIC_KINDS.MUSIC_TRACK],
            authors: [pubkey],
            '#d': identifiers,
            limit: identifiers.length * 2
          }));

          console.log('🔍 usePlaylist - Fetching track events with queries:', trackQueries.length);
          
          const allTrackEvents = await Promise.all(
            trackQueries.map(query => nostr.query([query], { signal }))
          );
          
          trackEvents = allTrackEvents.flat();
          
          console.log('📦 usePlaylist - Track events fetched:', {
            totalEvents: trackEvents.length,
            events: trackEvents.map(e => ({
              id: e.id?.slice(0, 8) + '...',
              kind: e.kind,
              pubkey: e.pubkey?.slice(0, 8) + '...',
              dTag: e.tags?.find(t => t[0] === 'd')?.[1]
            }))
          });
        }

        const validTracks = trackEvents.filter(validateMusicTrack);
        console.log('✅ usePlaylist - Valid track events:', validTracks.length);
        
        const tracksMap = new Map<string, MusicTrackData>();
        
        validTracks.forEach(trackEvent => {
          const track = eventToMusicTrack(trackEvent);
          const key = `${track.artistPubkey}:${track.identifier}`;
          
          const existing = tracksMap.get(key);
          if (!existing || trackEvent.created_at > (existing as any).created_at) {
            tracksMap.set(key, track);
            console.log('🎵 usePlaylist - Track added to map:', {
              key,
              title: track.title,
              audioUrl: track.audioUrl ? '✓' : '✗',
              duration: track.duration
            });
          }
        });

        const release = playlistToRelease(playlist, tracksMap);
        
        console.log('🎉 usePlaylist - Final release created:', {
          title: release.title,
          tracksInRelease: release.tracks?.length || 0,
          tracksWithAudio: release.tracks?.filter(t => t.audioUrl).length || 0,
          tracksWithTitle: release.tracks?.filter(t => t.title).length || 0
        });

        return release;
      }

      // Handle music track events (Kind 36787)
      if (event.kind === MUSIC_KINDS.MUSIC_TRACK && validateMusicTrack(event)) {
        console.log('🎵 usePlaylist - Processing single track event');
        const track = eventToMusicTrack(event);
        const release = trackToRelease(track);
        
        console.log('🎉 usePlaylist - Single track release created:', {
          title: release.title,
          hasAudio: !!release.tracks?.[0]?.audioUrl
        });
        
        return release;
      }

      // Handle any other supported event type
      try {
        console.log('🔄 usePlaylist - Attempting generic event conversion');
        const release = eventToRelease(event);
        
        console.log('🎉 usePlaylist - Generic release created:', {
          title: release.title,
          tracksCount: release.tracks?.length || 0
        });
        
        return release;
      } catch (error) {
        console.error('❌ usePlaylist - Event conversion failed:', error);
        return null;
      }
    },
    enabled: !!playlistId,
    staleTime: 300000, // 5 minutes
  });
}

/**
 * Hook to get artist statistics
 */
export function useArtistStats() {
  const { data: releases } = useReleases();

  return useQuery({
    queryKey: ['music-stats', releases?.length],
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

      // Calculate recent engagement (last 7 days)
      const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
      const recentEngagement = releases
        .filter(release => {
          const releaseDate = release.createdAt?.getTime() || 0;
          return releaseDate >= sevenDaysAgo;
        })
        .map(release => ({
          releaseId: release.id,
          title: release.title,
          zapCount: release.zapCount || 0,
          commentCount: release.commentCount || 0,
          repostCount: release.repostCount || 0,
          totalEngagement: (release.zapCount || 0) + (release.commentCount || 0) + (release.repostCount || 0),
          createdAt: release.createdAt
        }))
        .sort((a, b) => b.totalEngagement - a.totalEngagement)
        .slice(0, 10); // Top 10 most engaged releases in last 7 days

      return {
        totalReleases,
        totalZaps,
        totalComments,
        totalReposts,
        mostZappedRelease: mostZappedRelease?.zapCount ? mostZappedRelease : undefined,
        mostCommentedRelease: mostCommentedRelease?.commentCount ? mostCommentedRelease : undefined,
        recentEngagement
      };
    },
    enabled: !!releases,
    staleTime: 300000, // 5 minutes
  });
}
// Re-export centralized conversion functions for backward compatibility
export { playlistToRelease, trackToRelease, eventToRelease } from '@/lib/eventConversions';