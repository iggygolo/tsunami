import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import { usePlaylistTrackResolution } from '@/hooks/usePlaylistTrackResolution';
import { useStaticSingleReleaseCache } from '@/hooks/useStaticSingleReleaseCache';
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
 * Enhanced release data hook with SSG cache-first strategy
 * 
 * CACHING INTEGRATION:
 * - First checks static cache from SSG build (instant loading)
 * - Then checks runtime cache from useReleases hook
 * - Uses initialData to provide instant loading when navigating from releases list
 * - Falls back to network requests only when all caches miss
 */
export function useReleaseData({ eventId, addressableEvent }: UseReleaseDataProps) {
  const { nostr } = useNostr();
  const queryClient = useQueryClient();

  // Generate release ID for cache lookup - use eventId directly when available
  const releaseId = eventId || (addressableEvent ? 
    `${addressableEvent.pubkey}:${addressableEvent.kind}:${addressableEvent.identifier}` : 
    undefined
  );

  // Try to load from static cache first (SSG)
  const { data: staticCachedRelease, isLoading: isLoadingStatic, error: staticCacheError } = useStaticSingleReleaseCache(releaseId);

  console.log('useReleaseData - Cache status:', {
    releaseId,
    hasCache: !!staticCachedRelease,
    isLoadingStatic,
    cacheError: staticCacheError?.message
  });

  // Only run network queries if cache is not available
  const shouldFetchFromNetwork = !staticCachedRelease && !isLoadingStatic;

  console.log('useReleaseData - Network fetch decision:', {
    shouldFetchFromNetwork,
    hasCache: !!staticCachedRelease,
    isLoadingStatic
  });

  // Single query to fetch the release event
  const { data: releaseEvent, isLoading: isLoadingEvent } = useQuery<NostrEvent | null>({
    queryKey: ['release-event', releaseId],
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
    enabled: shouldFetchFromNetwork && !!(eventId || addressableEvent),
    staleTime: 300000, // 5 minutes
    // Check cache first - if we have cached data from releases list, use it immediately
    initialData: () => {
      if (addressableEvent && shouldFetchFromNetwork) {
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
    enabled: shouldFetchFromNetwork && !!releaseEvent && (!trackReferences.length || !!resolvedTracks),
    staleTime: 300000, // 5 minutes
    // Check cache first - if we have cached converted release data, use it immediately
    initialData: () => {
      if (releaseEvent && shouldFetchFromNetwork) {
        const cachedRelease = queryClient.getQueryData<PodcastRelease>(['release-conversion', releaseEvent.id, resolvedTracks?.length]);
        if (cachedRelease) {
          console.log('useReleaseData - Using cached converted release data');
          return cachedRelease;
        }
      }
      return undefined;
    },
  });

  // If we have cached data, use it and create a mock event
  if (staticCachedRelease) {
    console.log('useReleaseData - Using static cache data:', {
      title: staticCachedRelease.title,
      source: 'static-cache'
    });

    // Create a mock event object for comments and interactions
    const mockEvent: NostrEvent = {
      id: staticCachedRelease.eventId,
      pubkey: staticCachedRelease.artistPubkey,
      created_at: Math.floor(staticCachedRelease.createdAt.getTime() / 1000),
      kind: PODCAST_KINDS.MUSIC_PLAYLIST,
      tags: [
        ['d', staticCachedRelease.identifier || staticCachedRelease.eventId],
        ['title', staticCachedRelease.title],
        ...(staticCachedRelease.description ? [['description', staticCachedRelease.description]] : []),
        ...(staticCachedRelease.imageUrl ? [['image', staticCachedRelease.imageUrl]] : []),
        ...staticCachedRelease.tags.map(tag => ['t', tag])
      ],
      content: staticCachedRelease.content || '',
      sig: ''
    };

    return {
      release: staticCachedRelease,
      event: mockEvent,
      commentEvent: mockEvent,
      totalDuration: staticCachedRelease.tracks.reduce((sum, track) => sum + (track.duration || 0), 0),
      isLoading: false,
      resolvedTracks: []
    };
  }

  // Calculate total duration
  const totalDuration = release?.tracks.reduce((sum, track) => sum + (track.duration || 0), 0) || 0;

  const isLoading = isLoadingStatic || (shouldFetchFromNetwork && (isLoadingEvent || isLoadingTracks || isLoadingConversion));

  console.log('useReleaseData - Network fallback result:', {
    hasRelease: !!release,
    title: release?.title,
    trackCount: release?.tracks.length,
    isLoading,
    source: 'network'
  });

  return {
    release: release || null,
    event: releaseEvent || null,
    commentEvent: releaseEvent || null,
    totalDuration,
    isLoading,
    resolvedTracks: resolvedTracks || []
  };
}