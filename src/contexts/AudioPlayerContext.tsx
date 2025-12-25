import { useState, useRef, useEffect, ReactNode } from 'react';
import { AudioPlayerContext, type AudioPlayerState, type AudioPlayerContextType } from './AudioPlayerContext';
import type { MusicRelease, MusicTrackData } from '@/types/music';

interface AudioPlayerProviderProps {
  children: ReactNode;
}

export function AudioPlayerProvider({ children }: AudioPlayerProviderProps) {
  const audioRef = useRef<HTMLAudioElement>(null);

  const [state, setState] = useState<AudioPlayerState>({
    currentRelease: null,
    currentTrack: null,
    currentTrackIndex: 0,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 1,
    playbackRate: 1,
    isLoading: false,
    error: null,
  });

  // Audio event handlers
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadStart = () => {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
    };

    const handleLoadedMetadata = () => {
      setState(prev => ({
        ...prev,
        duration: audio.duration || 0,
        isLoading: false
      }));
    };

    const handleTimeUpdate = () => {
      setState(prev => ({ ...prev, currentTime: audio.currentTime }));
    };

    const handlePlay = () => {
      setState(prev => ({ ...prev, isPlaying: true }));
    };

    const handlePause = () => {
      setState(prev => ({ ...prev, isPlaying: false }));
    };

    const handleEnded = () => {
      setState(prev => ({
        ...prev,
        isPlaying: false,
        currentTime: 0
      }));
    };

    const handleError = () => {
      setState(prev => ({
        ...prev,
        isPlaying: false,
        isLoading: false,
        error: 'Failed to load audio'
      }));
    };

    const handleVolumeChange = () => {
      setState(prev => ({ ...prev, volume: audio.volume }));
    };

    const handleRateChange = () => {
      setState(prev => ({ ...prev, playbackRate: audio.playbackRate }));
    };

    // Add event listeners
    audio.addEventListener('loadstart', handleLoadStart);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    audio.addEventListener('volumechange', handleVolumeChange);
    audio.addEventListener('ratechange', handleRateChange);

    // Cleanup
    return () => {
      audio.removeEventListener('loadstart', handleLoadStart);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('volumechange', handleVolumeChange);
      audio.removeEventListener('ratechange', handleRateChange);
    };
  }, []);

  // Actions
  const playRelease = (release: MusicRelease, trackIndex: number = 0) => {
    const audio = audioRef.current;
    if (!audio) return;

    // Validate release has tracks
    if (!release.tracks || release.tracks.length === 0) {
      console.error('Release has no tracks:', release);
      setState(prev => ({
        ...prev,
        error: 'No tracks available in this release'
      }));
      return;
    }

    const validTrackIndex = Math.max(0, Math.min(trackIndex, release.tracks.length - 1));
    const track = release.tracks[validTrackIndex];

    // Validate track has audio URL
    if (!track.audioUrl) {
      console.error('Track has no audio URL:', track);
      setState(prev => ({
        ...prev,
        error: 'Track audio URL is missing'
      }));
      return;
    }

    // If it's a different release or different track, load it
    if (state.currentRelease?.eventId !== release.eventId || state.currentTrackIndex !== validTrackIndex) {
      setState(prev => ({
        ...prev,
        currentRelease: release,
        currentTrack: track,
        currentTrackIndex: validTrackIndex,
        currentTime: 0,
        error: null
      }));

      audio.src = track.audioUrl;
      audio.load();
    }

    // Play the release
    audio.play().catch(error => {
      console.error('Failed to play audio:', error);
      setState(prev => ({
        ...prev,
        error: 'Failed to play audio: ' + error.message,
        isLoading: false
      }));
    });
  };

  const playTrack = (release: MusicRelease, trackIndex: number) => {
    playRelease(release, trackIndex);
  };

  const playTrackDirect = (track: MusicTrackData) => {
    const audio = audioRef.current;
    if (!audio) return;

    // Validate track has audio URL
    if (!track.audioUrl) {
      console.error('Track has no audio URL:', track);
      setState(prev => ({
        ...prev,
        error: 'Track audio URL is missing'
      }));
      return;
    }

    // Convert MusicTrackData to a minimal MusicRelease format for internal consistency
    const releaseFromTrack: MusicRelease = {
      id: track.identifier,
      title: track.title,
      imageUrl: track.imageUrl,
      description: track.description,
      content: track.lyrics,
      tracks: [{
        title: track.title,
        audioUrl: track.audioUrl,
        duration: track.duration,
        explicit: track.explicit || false,
        language: track.language || null,
        imageUrl: track.imageUrl // Include individual track image
      }],
      publishDate: track.createdAt || new Date(),
      tags: track.genres || [],
      genre: track.genres?.[0] || null,
      eventId: track.eventId || '',
      artistPubkey: track.artistPubkey || '',
      identifier: track.identifier,
      createdAt: track.createdAt || new Date(),
      zapCount: track.zapCount,
      totalSats: track.totalSats,
      commentCount: track.commentCount,
      repostCount: 0
    };

    // Use the existing playRelease logic with the converted release
    playRelease(releaseFromTrack, 0);
  };

  const play = () => {
    const audio = audioRef.current;
    if (!audio || !state.currentRelease) return;

    audio.play().catch(error => {
      console.error('Failed to play audio:', error);
      setState(prev => ({
        ...prev,
        error: 'Failed to play audio'
      }));
    });
  };

  const pause = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
  };

  const stop = () => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.pause();
    audio.currentTime = 0;
    setState(prev => ({
      ...prev,
      currentRelease: null,
      currentTrack: null,
      currentTime: 0,
      isPlaying: false
    }));
  };

  const seekTo = (time: number) => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.currentTime = Math.max(0, Math.min(time, state.duration));
  };

  const setVolume = (volume: number) => {
    const audio = audioRef.current;
    if (!audio) return;

    const clampedVolume = Math.max(0, Math.min(1, volume));
    audio.volume = clampedVolume;
  };

  const setPlaybackRate = (rate: number) => {
    const audio = audioRef.current;
    if (!audio) return;

    const clampedRate = Math.max(0.25, Math.min(3, rate));
    audio.playbackRate = clampedRate;
  };

  const nextTrack = () => {
    if (!state.currentRelease) return;
    const nextIndex = state.currentTrackIndex + 1;
    if (nextIndex < state.currentRelease.tracks.length) {
      playTrack(state.currentRelease, nextIndex);
    }
  };

  const previousTrack = () => {
    if (!state.currentRelease) return;
    const prevIndex = state.currentTrackIndex - 1;
    if (prevIndex >= 0) {
      playTrack(state.currentRelease, prevIndex);
    }
  };

  const contextValue: AudioPlayerContextType = {
    state,
    playRelease,
    playTrack,
    playTrackDirect,
    play,
    pause,
    stop,
    seekTo,
    setVolume,
    setPlaybackRate,
    nextTrack,
    previousTrack,
    audioRef,
  };

  return (
    <AudioPlayerContext.Provider value={contextValue}>
      {children}
      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        preload="metadata"
        style={{ display: 'none' }}
      />
    </AudioPlayerContext.Provider>
  );
}

