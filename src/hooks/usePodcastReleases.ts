import { useQuery } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import type { NostrEvent } from '@nostrify/nostrify';
import type { PodcastRelease, ReleaseSearchOptions, MusicTrackData, MusicPlaylistData } from '@/types/podcast';
import { getArtistPubkeyHex, PODCAST_KINDS } from '@/lib/podcastConfig';
import { extractZapAmount, validateZapEvent } from '@/lib/zapUtils';
import {
  validateMusicTrack,
  validateMusicPlaylist,
  eventToMusicTrack,
  eventToMusicPlaylist,
  playlistToRelease,
  eventToPodcastRelease,
  deduplicateEventsByIdentifier,
  getEventIdentifier,
  createPlaylistRef
} from '@/lib/eventConversions';

/**
 * Hook to fetch all podcast releases from the artist
 * Now queries both music tracks (36787) and playlists (34139) and combines them into releases
 */
export function useReleases(options: ReleaseSearchOptions = {}) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['releases', options],
    queryFn: async (context) => {
      const signal = AbortSignal.any([context.signal, AbortSignal.timeout(10000)]);
      const artistPubkey = getArtistPubkeyHex();

      // Step 1: Fetch all playlists (releases) from the artist
      const playlistEvents = await nostr.query([{
        kinds: [PODCAST_KINDS.MUSIC_PLAYLIST],
        authors: [artistPubkey],
        limit: options.limit || 100
      }], { signal });

      const validPlaylists = playlistEvents.filter(validateMusicPlaylist);
      console.log('Fetched playlists:', validPlaylists);

      if (validPlaylists.length === 0) {
        return [];
      }

      // Step 2: Extract all track references from playlists
      const trackReferences = new Set<string>();
      validPlaylists.forEach(playlist => {
        playlist.tags
          .filter(([key]) => key === 'a')
          .forEach(([, ref]) => {
            const parts = ref.split(':');
            if (parts.length === 3 && parts[0] === PODCAST_KINDS.MUSIC_TRACK.toString()) {
              trackReferences.add(`${parts[1]}:${parts[2]}`); // pubkey:identifier
            }
          });
      });

      // Step 3: Fetch all referenced tracks
      const trackEvents = await nostr.query([{
        kinds: [PODCAST_KINDS.MUSIC_TRACK],
        authors: [artistPubkey],
        limit: 1000 // High limit to get all tracks
      }], { signal });

      const validTracks = trackEvents.filter(validateMusicTrack);
      console.log('Fetched tracks:', validTracks);

      // Step 4: Deduplicate events using centralized utility
      const deduplicatedTracks = deduplicateEventsByIdentifier(validTracks, getEventIdentifier);
      const deduplicatedPlaylists = deduplicateEventsByIdentifier(validPlaylists, getEventIdentifier);

      // Step 5: Create track lookup map using centralized conversions
      const tracksMap = new Map<string, MusicTrackData>();
      deduplicatedTracks.forEach(trackEvent => {
        const track = eventToMusicTrack(trackEvent);
        tracksMap.set(`${track.artistPubkey}:${track.identifier}`, track);
      });

      // Step 6: Convert playlists to releases with resolved tracks using centralized conversions
      const playlistsData = deduplicatedPlaylists.map(eventToMusicPlaylist);
      const releases = playlistsData.map(playlist => playlistToRelease(playlist, tracksMap));

      console.log('Converted releases:', releases);

      // Step 7: Fetch zap data for all releases
      const releaseIds = releases.map(release => release.eventId);
      const zapData: Map<string, { count: number; totalSats: number }> = new Map();

      if (releaseIds.length > 0) {
        try {
          const zapEvents = await nostr.query([{
            kinds: [9735], // Zap receipts
            '#e': releaseIds,
            limit: 2000
          }], { signal });

          const validZaps = zapEvents.filter(validateZapEvent);
          validZaps.forEach(zapEvent => {
            const releaseId = zapEvent.tags.find(([name]) => name === 'e')?.[1];
            if (!releaseId) return;

            const amount = extractZapAmount(zapEvent);
            const existing = zapData.get(releaseId) || { count: 0, totalSats: 0 };

            zapData.set(releaseId, {
              count: existing.count + 1,
              totalSats: existing.totalSats + amount
            });
          });
        } catch (error) {
          console.warn('Failed to fetch zap data for releases:', error);
        }
      }

      // Step 8: Add zap counts to releases
      const releasesWithZaps = releases.map(release => {
        const zaps = zapData.get(release.eventId);
        return {
          ...release,
          ...(zaps && zaps.count > 0 ? { zapCount: zaps.count } : {}),
          ...(zaps && zaps.totalSats > 0 ? { totalSats: zaps.totalSats } : {})
        };
      });

      // Step 9: Apply search filtering
      let filteredReleases = releasesWithZaps;

      if (options.query) {
        const query = options.query.toLowerCase();
        filteredReleases = filteredReleases.filter(release =>
          release.title.toLowerCase().includes(query) ||
          release.description?.toLowerCase().includes(query) ||
          release.content?.toLowerCase().includes(query)
        );
      }

      if (options.tags && options.tags.length > 0) {
        filteredReleases = filteredReleases.filter(release =>
          options.tags!.some(tag => release.tags.includes(tag))
        );
      }

      // Step 10: Apply sorting
      const sortBy = options.sortBy || 'date';
      const sortOrder = options.sortOrder || 'desc';

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

      // Step 11: Apply offset
      if (options.offset) {
        filteredReleases = filteredReleases.slice(options.offset);
      }

      return filteredReleases;
    },
    staleTime: 60000, // 1 minute
  });
}

/**
 * Hook to fetch a single podcast release by playlist ID
 */
export function usePodcastRelease(playlistId: string) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['podcast-release', playlistId],
    queryFn: async (context) => {
      const signal = AbortSignal.any([context.signal, AbortSignal.timeout(5000)]);

      // First try to fetch as a playlist event
      const playlistEvents = await nostr.query([{
        ids: [playlistId]
      }], { signal });

      const playlistEvent = playlistEvents[0];
      if (!playlistEvent) return null;

      // If it's a playlist, resolve its tracks
      if (playlistEvent.kind === PODCAST_KINDS.MUSIC_PLAYLIST && validateMusicPlaylist(playlistEvent)) {
        const playlist = eventToMusicPlaylist(playlistEvent);
        
        // Fetch all referenced tracks
        const trackEvents = await nostr.query([{
          kinds: [PODCAST_KINDS.MUSIC_TRACK],
          authors: [playlistEvent.pubkey],
          limit: 100
        }], { signal });

        const validTracks = trackEvents.filter(validateMusicTrack);
        const tracksMap = new Map<string, MusicTrackData>();
        
        validTracks.forEach(trackEvent => {
          const track = eventToMusicTrack(trackEvent);
          tracksMap.set(`${track.artistPubkey}:${track.identifier}`, track);
        });

        return playlistToRelease(playlist, tracksMap);
      }

      // If it's a single track, convert to release format
      if (playlistEvent.kind === PODCAST_KINDS.MUSIC_TRACK && validateMusicTrack(playlistEvent)) {
        return eventToPodcastRelease(playlistEvent);
      }

      return null;
    },
    enabled: !!playlistId,
    staleTime: 300000, // 5 minutes
  });
}

/**
 * Hook to get the latest release
 * Uses the same query as the Recent Releases section to ensure cache consistency
 */
export function useLatestRelease() {
  const { data: releases, ...rest } = useReleases({
    limit: 50, // Use a reasonable default that covers most use cases
    sortBy: 'date',
    sortOrder: 'desc'
  });

  return {
    data: releases?.[0] || null,
    ...rest
  };
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
export { playlistToRelease, eventToPodcastRelease } from '@/lib/eventConversions';