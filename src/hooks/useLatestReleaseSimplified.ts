import { useQuery } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import { usePlaylistTrackResolution } from '@/hooks/usePlaylistTrackResolution';
import { 
  validateMusicPlaylist, 
  eventToMusicPlaylist, 
  playlistToRelease
} from '@/lib/eventConversions';
import { PODCAST_KINDS, getArtistPubkeyHex } from '@/lib/podcastConfig';
import type { PodcastRelease, MusicTrackData } from '@/types/podcast';
import type { NostrEvent } from '@nostrify/nostrify';

/**
 * Simplified latest release hook using the same pattern as useReleaseData
 * This eliminates the complex logic from the original useLatestRelease hook
 */
export function useLatestReleaseSimplified() {
  const { nostr } = useNostr();

  // Step 1: Fetch the latest playlist event from the artist
  const { data: latestPlaylistEvent, isLoading: isLoadingEvent } = useQuery<NostrEvent | null>({
    queryKey: ['latest-playlist-event'],
    queryFn: async (context) => {
      const signal = AbortSignal.any([context.signal, AbortSignal.timeout(10000)]);
      const artistPubkey = getArtistPubkeyHex();

      console.log('Fetching latest playlist from artist:', artistPubkey.slice(0, 8) + '...');

      // Get the latest playlist from the artist
      const playlistEvents = await nostr.query([{
        kinds: [PODCAST_KINDS.MUSIC_PLAYLIST],
        authors: [artistPubkey],
        limit: 1 // Only get the latest one
      }], { signal });

      const latestEvent = playlistEvents[0];
      
      if (!latestEvent) {
        console.log('No playlist events found');
        return null;
      }

      if (!validateMusicPlaylist(latestEvent)) {
        console.log('Latest event is not a valid playlist');
        return null;
      }

      console.log('Found latest playlist:', {
        id: latestEvent.id,
        title: latestEvent.tags.find(([key]) => key === 'title')?.[1] || 'Untitled'
      });

      return latestEvent;
    },
    staleTime: 300000, // 5 minutes
  });

  // Step 2: Extract track references from the playlist
  const trackReferences = latestPlaylistEvent && validateMusicPlaylist(latestPlaylistEvent)
    ? eventToMusicPlaylist(latestPlaylistEvent).tracks
    : [];

  // Step 3: Resolve track references to actual track data
  const { data: resolvedTracks, isLoading: isLoadingTracks } = usePlaylistTrackResolution(trackReferences);

  // Step 4: Convert to final release format
  const { data: release, isLoading: isLoadingConversion } = useQuery<PodcastRelease | null>({
    queryKey: ['latest-release-conversion', latestPlaylistEvent?.id, resolvedTracks?.length],
    queryFn: async () => {
      if (!latestPlaylistEvent || !resolvedTracks) return null;

      console.log('Converting playlist to release');

      const playlist = eventToMusicPlaylist(latestPlaylistEvent);
      
      // Create tracks map from resolved tracks
      const tracksMap = new Map<string, MusicTrackData>();
      resolvedTracks.forEach(resolved => {
        if (resolved.trackData) {
          const key = `${resolved.trackData.artistPubkey}:${resolved.trackData.identifier}`;
          tracksMap.set(key, resolved.trackData);
        }
      });

      const release = playlistToRelease(playlist, tracksMap);
      
      console.log('Conversion complete:', { 
        title: release.title, 
        trackCount: release.tracks.length,
        tracksWithAudio: release.tracks.filter(t => t.audioUrl).length 
      });

      return release;
    },
    enabled: !!latestPlaylistEvent && !!resolvedTracks,
    staleTime: 300000, // 5 minutes
  });

  const isLoading = isLoadingEvent || isLoadingTracks || isLoadingConversion;

  console.log('Final result:', {
    hasRelease: !!release,
    title: release?.title,
    trackCount: release?.tracks.length,
    isLoading
  });

  return {
    data: release || null,
    isLoading,
    error: null // Could add error handling if needed
  };
}