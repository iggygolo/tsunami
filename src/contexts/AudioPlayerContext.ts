import { createContext } from 'react';
import type { MusicRelease, MusicTrackData, ReleaseTrack } from '@/types/music';

interface AudioPlayerState {
  currentRelease: MusicRelease | null;
  currentTrack: ReleaseTrack | null;
  currentTrackIndex: number;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  playbackRate: number;
  isLoading: boolean;
  error: string | null;
}

interface AudioPlayerContextType {
  // State
  state: AudioPlayerState;

  // Actions
  playRelease: (release: MusicRelease, trackIndex?: number) => void;
  playTrack: (release: MusicRelease, trackIndex: number) => void;
  playTrackDirect: (track: MusicTrackData) => void; // New method for direct track playback
  play: () => void;
  pause: () => void;
  stop: () => void;
  seekTo: (time: number) => void;
  setVolume: (volume: number) => void;
  setPlaybackRate: (rate: number) => void;
  nextTrack: () => void;
  previousTrack: () => void;

  // Audio element ref for direct access if needed
  audioRef: React.RefObject<HTMLAudioElement>;
}

export const AudioPlayerContext = createContext<AudioPlayerContextType | null>(null);

export type { AudioPlayerState, AudioPlayerContextType };