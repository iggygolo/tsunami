import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import { usePodcastRelease } from '@/hooks/usePodcastReleases';
import { usePlaylistTrackResolution } from '@/hooks/usePlaylistTrackResolution';
import { 
  validateMusicTrack, 
  validateMusicPlaylist, 
  eventToMusicTrack, 
  eventToMusicPlaylist, 
  playlistToRelease, 
  trackToRelease,
  eventToPodcastRelease
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

export function useReleaseData({ eventId, addressableEvent }: UseReleaseDataProps) {
  const { nostr } = useNostr();
  
  // Determine the release ID for the usePodcastRelease hook
  const releaseId = eventId || addressableEvent?.identifier;

  // Try to use the existing usePodcastRelease hook first
  const { data: hookRelease, isLoading: isLoadingHook } = usePodcastRelease(releaseId || '');

  // If the hook works, use it; otherwise fall back to manual querying
  const shouldUseManualQuery = !hookRelease && !isLoadingHook && releaseId;

  // Manual query for the release event (fallback when usePodcastRelease doesn't work)
  const { data: releaseEvent, isLoading: isLoadingManual } = useQuery<NostrEvent | null>({
    queryKey: ['release-manual', eventId || `${addressableEvent?.pubkey}:${addressableEvent?.kind}:${addressableEvent?.identifier}`],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(5000)]);

      if (eventId) {
        // Query by event ID (for note1/nevent1)
        const events = await nostr.query([{
          ids: [eventId],
          limit: 1
        }], { signal });
        return events[0] || null;
      } else if (addressableEvent) {
        // Query by addressable event coordinates (for naddr1)
        const events = await nostr.query([{
          kinds: [addressableEvent.kind],
          authors: [addressableEvent.pubkey],
          '#d': [addressableEvent.identifier],
          limit: 1
        }], { signal });
        
        // If we found the addressable event, return it
        if (events.length > 0) {
          return events[0];
        }
        
        // Fallback: For legacy releases that don't have 'd' tags,
        // try to find by event ID if the identifier looks like an event ID (64 hex chars)
        if (/^[0-9a-f]{64}$/.test(addressableEvent.identifier)) {
          const legacyEvents = await nostr.query([{
            ids: [addressableEvent.identifier],
            kinds: [addressableEvent.kind],
            authors: [addressableEvent.pubkey],
            limit: 1
          }], { signal });
          return legacyEvents[0] || null;
        }
        
        return null;
      }

      return null;
    },
    staleTime: 60000, // 1 minute
    enabled: !!shouldUseManualQuery
  });

  // Convert NostrEvent to PodcastRelease format with proper track resolution
  const release: PodcastRelease | null = useMemo(() => {
    if (!releaseEvent) return null;

    // Handle new music playlist events (Kind 34139)
    if (releaseEvent.kind === PODCAST_KINDS.MUSIC_PLAYLIST && validateMusicPlaylist(releaseEvent)) {
      // For playlists, we need to resolve tracks separately
      // This will be handled by the playlist resolution logic below
      return null; // Will be set by the playlist resolution logic
    }

    // Handle new music track events (Kind 36787)
    if (releaseEvent.kind === PODCAST_KINDS.MUSIC_TRACK && validateMusicTrack(releaseEvent)) {
      const track = eventToMusicTrack(releaseEvent);
      return trackToRelease(track);
    }

    // Handle legacy events or other event types - try the old conversion function
    try {
      const legacyRelease = eventToPodcastRelease(releaseEvent);
      return legacyRelease;
    } catch (error) {
      console.error('useReleaseData - Legacy conversion failed:', error);
      return null;
    }
  }, [releaseEvent]);

  // For playlist events, resolve tracks and create release
  const playlistData = useMemo(() => {
    if (!releaseEvent || releaseEvent.kind !== PODCAST_KINDS.MUSIC_PLAYLIST || !validateMusicPlaylist(releaseEvent)) {
      return null;
    }
    return eventToMusicPlaylist(releaseEvent);
  }, [releaseEvent]);

  // Resolve playlist tracks if this is a playlist
  const { data: resolvedTracks, isLoading: isLoadingTracks } = usePlaylistTrackResolution(
    playlistData?.tracks || []
  );

  // Create final release object for playlists
  const playlistRelease: PodcastRelease | null = useMemo(() => {
    if (!playlistData || !resolvedTracks) {
      return null;
    }

    // Create tracks map from resolved tracks
    const tracksMap = new Map<string, MusicTrackData>();
    resolvedTracks.forEach(resolved => {
      if (resolved.trackData) {
        const key = `${resolved.trackData.artistPubkey}:${resolved.trackData.identifier}`;
        tracksMap.set(key, resolved.trackData);
      }
    });

    return playlistToRelease(playlistData, tracksMap);
  }, [playlistData, resolvedTracks]);

  // Create event object for comments (needed for CommentsSection)
  const commentEvent: NostrEvent | null = useMemo(() => {
    if (releaseEvent) {
      return releaseEvent;
    }
    
    // If we're using hookRelease, create a minimal event object for comments
    if (hookRelease && releaseId) {
      return {
        id: hookRelease.eventId,
        pubkey: hookRelease.artistPubkey,
        created_at: Math.floor(hookRelease.createdAt.getTime() / 1000),
        kind: PODCAST_KINDS.MUSIC_PLAYLIST, // Assume playlist for now
        tags: [
          ['d', hookRelease.identifier],
          ['title', hookRelease.title],
          ...(hookRelease.description ? [['description', hookRelease.description]] : []),
          ...(hookRelease.imageUrl ? [['image', hookRelease.imageUrl]] : []),
          ...hookRelease.tags.map(tag => ['t', tag])
        ],
        content: JSON.stringify(hookRelease.tracks || []),
        sig: ''
      };
    }
    
    return null;
  }, [releaseEvent, hookRelease, releaseId]);

  // Final release object (use hook result first, then manual conversion, then playlist conversion)
  const finalRelease = hookRelease || release || playlistRelease;

  // Create event object for interactions
  const event = useMemo(() => {
    if (!finalRelease) return null;
    return {
      id: finalRelease.eventId,
      kind: PODCAST_KINDS.MUSIC_PLAYLIST,
      pubkey: finalRelease.artistPubkey,
      created_at: Math.floor(finalRelease.createdAt.getTime() / 1000),
      tags: [
        ['d', finalRelease.identifier],
        ['title', finalRelease.title],
        ['t', 'playlist'],
      ],
      content: finalRelease.content || finalRelease.description || '',
      sig: ''
    } as NostrEvent;
  }, [finalRelease]);

  // Calculate total duration
  const totalDuration = useMemo(() => {
    if (!finalRelease?.tracks) return 0;
    return finalRelease.tracks.reduce((sum, track) => sum + (track.duration || 0), 0);
  }, [finalRelease?.tracks]);

  return {
    release: finalRelease,
    event,
    commentEvent,
    totalDuration,
    isLoading: isLoadingHook || isLoadingManual || isLoadingTracks,
    resolvedTracks: resolvedTracks || []
  };
}