import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import { usePlaylistTrackResolution } from '@/hooks/usePlaylistTrackResolution';
import { 
  validateMusicTrack, 
  validateMusicPlaylist, 
  eventToMusicTrack, 
  eventToMusicPlaylist, 
  playlistToRelease, 
  trackToRelease
} from '@/lib/eventConversions';
import { PODCAST_KINDS } from '@/lib/podcastConfig';
import type { PodcastRelease, MusicTrackData } from '@/types/podcast';
import type { NostrEvent } from '@nostrify/nostrify';

interface AddressableEventParams {
  pubkey: string;
  kind: number;
  identifier: string;
}

interface UseReleaseDataProps {
  eventId?: string;
  addressableEvent?: AddressableEventParams;
}

/**
 * Simplified release data hook that eliminates unnecessary complexity
 * 
 * CACHING INTEGRATION:
 * - Checks for cached data from useReleases hook first
 * - Uses initialData to provide instant loading when navigating from releases list
 * - Falls back to network requests only when cache misses occur
 */
export function useReleaseData({ eventId, addressableEvent }: UseReleaseDataProps) {
  const { nostr } = useNostr();
  const queryClient = useQueryClient();

  // Single query to fetch the release event
  const { data: releaseEvent, isLoading: isLoadingEvent } = useQuery<NostrEvent | null>({
    queryKey: ['release-event', eventId || `${addressableEvent?.pubkey}:${addressableEvent?.kind}:${addressableEvent?.identifier}`],
    queryFn: async (context) => {
      const signal = AbortSignal.any([context.signal, AbortSignal.timeout(10000)]);

      console.log('useReleaseData - Fetching event:', { eventId, addressableEvent });

      if (eventId) {
        // Query by event ID
        const events = await nostr.query([{ ids: [eventId], limit: 1 }], { signal });
        console.log('useReleaseData - Event ID query result:', { found: events.length > 0, kind: events[0]?.kind });
        return events[0] || null;
      }

      if (addressableEvent) {
        // Query by addressable coordinates
        const events = await nostr.query([{
          kinds: [addressableEvent.kind],
          authors: [addressableEvent.pubkey],
          '#d': [addressableEvent.identifier],
          limit: 1
        }], { signal });
        
        console.log('useReleaseData - Addressable query result:', { found: events.length > 0, kind: events[0]?.kind });
        return events[0] || null;
      }

      return null;
    },
    enabled: !!(eventId || addressableEvent),
    staleTime: 300000, // 5 minutes
    // Check cache first - if we have cached data from releases list, use it immediately
    initialData: () => {
      if (addressableEvent) {
        const cacheKey = `${addressableEvent.pubkey}:${addressableEvent.kind}:${addressableEvent.identifier}`;
        const cachedEvent = queryClient.getQueryData<NostrEvent>(['release-event', cacheKey]);
        if (cachedEvent) {
          console.log('useReleaseData - Using cached event data');
          return cachedEvent;
        }
      }
      return undefined;
    },
  });

  // For playlists, extract track references and resolve them
  const trackReferences = releaseEvent?.kind === PODCAST_KINDS.MUSIC_PLAYLIST && validateMusicPlaylist(releaseEvent)
    ? eventToMusicPlaylist(releaseEvent).tracks
    : [];

  const { data: resolvedTracks, isLoading: isLoadingTracks } = usePlaylistTrackResolution(trackReferences);

  // Single conversion to final release format
  const { data: release, isLoading: isLoadingConversion } = useQuery<PodcastRelease | null>({
    queryKey: ['release-conversion', releaseEvent?.id, resolvedTracks?.length],
    queryFn: async () => {
      if (!releaseEvent) return null;

      console.log('useReleaseData - Converting event:', { kind: releaseEvent.kind, id: releaseEvent.id });

      // Handle music track events
      if (releaseEvent.kind === PODCAST_KINDS.MUSIC_TRACK && validateMusicTrack(releaseEvent)) {
        const track = eventToMusicTrack(releaseEvent);
        const release = trackToRelease(track);
        console.log('useReleaseData - Track converted:', { title: release.title, hasAudio: !!release.tracks[0]?.audioUrl });
        return release;
      }

      // Handle music playlist events
      if (releaseEvent.kind === PODCAST_KINDS.MUSIC_PLAYLIST && validateMusicPlaylist(releaseEvent)) {
        if (!resolvedTracks) return null; // Wait for track resolution

        const playlist = eventToMusicPlaylist(releaseEvent);
        
        // Create tracks map from resolved tracks
        const tracksMap = new Map<string, MusicTrackData>();
        resolvedTracks.forEach(resolved => {
          if (resolved.trackData) {
            const key = `${resolved.trackData.artistPubkey}:${resolved.trackData.identifier}`;
            tracksMap.set(key, resolved.trackData);
          }
        });

        const release = playlistToRelease(playlist, tracksMap);
        console.log('useReleaseData - Playlist converted:', { 
          title: release.title, 
          trackCount: release.tracks.length,
          tracksWithAudio: release.tracks.filter(t => t.audioUrl).length 
        });
        return release;
      }

      // Unsupported event type
      console.warn('useReleaseData - Unsupported event kind:', releaseEvent.kind);
      return null;
    },
    enabled: !!releaseEvent && (!trackReferences.length || !!resolvedTracks),
    staleTime: 300000, // 5 minutes
    // Check cache first - if we have cached converted release data, use it immediately
    initialData: () => {
      if (releaseEvent) {
        const cachedRelease = queryClient.getQueryData<PodcastRelease>(['release-conversion', releaseEvent.id, resolvedTracks?.length]);
        if (cachedRelease) {
          console.log('useReleaseData - Using cached converted release data');
          return cachedRelease;
        }
      }
      return undefined;
    },
  });

  // Calculate total duration
  const totalDuration = release?.tracks.reduce((sum, track) => sum + (track.duration || 0), 0) || 0;

  const isLoading = isLoadingEvent || isLoadingTracks || isLoadingConversion;

  console.log('useReleaseData - Final result:', {
    hasRelease: !!release,
    title: release?.title,
    trackCount: release?.tracks.length,
    isLoading
  });

  return {
    release: release || null,
    event: releaseEvent || null, // Use the original event directly
    commentEvent: releaseEvent || null, // Same event for comments
    totalDuration,
    isLoading,
    resolvedTracks: resolvedTracks || []
  };
}