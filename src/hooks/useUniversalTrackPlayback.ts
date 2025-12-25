import { useUniversalAudioPlayer, releaseTracksToUniversal } from '@/contexts/UniversalAudioPlayerContext';
import type { MusicRelease } from '@/types/music';

export function useUniversalTrackPlayback(release: MusicRelease | null) {
  const { playQueue, pause, play, state } = useUniversalAudioPlayer();

  // Check if this release is currently loaded in the queue
  const isCurrentRelease = release ? 
    state.currentTrack?.source?.releaseId === release.eventId : false;
  
  const currentTrackIndex = isCurrentRelease ? state.currentTrackIndex : -1;
  const isReleaseLoading = isCurrentRelease && state.isLoading;
  const isReleasePlaying = isCurrentRelease && state.isPlaying;

  const handleTrackPlay = (trackIndex: number) => {
    if (!release?.tracks || release.tracks.length <= trackIndex) {
      return;
    }

    // Convert release tracks to universal format
    const universalTracks = releaseTracksToUniversal(release, 'release');
    
    // If clicking on the currently playing track, pause it
    if (isCurrentRelease && currentTrackIndex === trackIndex && state.isPlaying) {
      pause();
    }
    // If clicking on the current track that's paused, resume it
    else if (isCurrentRelease && currentTrackIndex === trackIndex && !state.isPlaying) {
      play();
    }
    // If clicking on a different track or no track is loaded, play the new track
    else {
      playQueue(universalTracks, trackIndex, release.title);
    }
  };

  const handleReleasePlay = () => {
    if (release?.tracks && release.tracks.length > 0) {
      if (isCurrentRelease && state.isPlaying) {
        // If this release is currently playing, pause it
        pause();
      } else if (isCurrentRelease && !state.isPlaying) {
        // If this release is loaded but paused, resume it
        play();
      } else {
        // If this is a different release or no release is loaded, play from the beginning
        const universalTracks = releaseTracksToUniversal(release, 'release');
        playQueue(universalTracks, 0, release.title);
      }
    }
  };

  const isTrackPlaying = (trackIndex: number): boolean => {
    return currentTrackIndex === trackIndex && state.isPlaying;
  };

  const isTrackCurrent = (trackIndex: number): boolean => {
    return currentTrackIndex === trackIndex;
  };

  const hasPlayableTracks = release?.tracks && 
    release.tracks.length > 0 && 
    release.tracks.some(track => track.audioUrl);

  return {
    isCurrentRelease,
    currentTrackIndex,
    handleTrackPlay,
    handleReleasePlay,
    isTrackPlaying,
    isTrackCurrent,
    hasPlayableTracks,
    isPlaying: state.isPlaying,
    isLoading: state.isLoading,
    isReleaseLoading,
    isReleasePlaying
  };
}