import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import type { PodcastRelease } from '@/types/podcast';

export function useTrackPlayback(release: PodcastRelease | null) {
  const { playRelease, pause, play, state } = useAudioPlayer();

  const isCurrentRelease = release ? state.currentRelease?.eventId === release.eventId : false;
  const currentTrackIndex = isCurrentRelease ? state.currentTrackIndex : -1;
  const isReleaseLoading = isCurrentRelease && state.isLoading;
  const isReleasePlaying = isCurrentRelease && state.isPlaying;

  const handleTrackPlay = (trackIndex: number) => {
    if (release?.tracks && release.tracks.length > trackIndex) {
      playRelease(release, trackIndex);
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
        playRelease(release);
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