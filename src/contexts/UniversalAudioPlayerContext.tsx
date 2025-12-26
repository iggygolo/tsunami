import { useState, useRef, useEffect, ReactNode, createContext, useContext } from 'react';
import { MUSIC_CONFIG } from '@/lib/musicConfig';
import type { MusicTrackData } from '@/types/music';

/**
 * Universal Track for the audio player queue
 * Normalized format that works with tracks from any source
 */
export interface UniversalTrack {
  id: string;                    // Unique identifier
  title: string;                 // Track title
  artist?: string;               // Artist name
  audioUrl: string;              // Audio file URL
  duration?: number;             // Duration in seconds
  imageUrl?: string;             // Track artwork
  explicit?: boolean;            // Explicit content flag
  language?: string;             // Language code
  
  // Source context (for UI display and navigation)
  source?: {
    type: 'release' | 'profile' | 'playlist' | 'search';
    releaseId?: string;          // If from a release
    releaseTitle?: string;       // Release title for context
    artistPubkey?: string;       // Artist pubkey
  };
  
  // Metadata for features
  eventId?: string;              // For zapping/social features
  identifier?: string;           // Nostr identifier
}

export interface UniversalAudioPlayerState {
  // Current playback
  currentTrack: UniversalTrack | null;
  currentTrackIndex: number;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  playbackRate: number;
  isLoading: boolean;
  error: string | null;
  
  // Queue management
  queue: UniversalTrack[];
  queueTitle?: string;           // Name for the current queue (e.g., "Blue Album", "Profile Tracks")
  shuffle: boolean;
  repeat: 'none' | 'one' | 'all';
  
  // History for navigation
  playHistory: UniversalTrack[];
}

export interface UniversalAudioPlayerContextType {
  // State
  state: UniversalAudioPlayerState;

  // Queue Management
  playTrack: (track: UniversalTrack, queue?: UniversalTrack[], queueTitle?: string) => void;
  playQueue: (queue: UniversalTrack[], startIndex?: number, queueTitle?: string) => void;
  addToQueue: (track: UniversalTrack) => void;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;
  
  // Playback Control
  play: () => void;
  pause: () => void;
  stop: () => void;
  seekTo: (time: number) => void;
  setVolume: (volume: number) => void;
  setPlaybackRate: (rate: number) => void;
  
  // Navigation
  nextTrack: () => void;
  previousTrack: () => void;
  jumpToTrack: (index: number) => void;
  
  // Queue Options
  toggleShuffle: () => void;
  setRepeat: (mode: 'none' | 'one' | 'all') => void;

  // Audio element ref
  audioRef: React.RefObject<HTMLAudioElement>;
}

const UniversalAudioPlayerContext = createContext<UniversalAudioPlayerContextType | null>(null);

// Helper function to convert MusicTrackData to UniversalTrack
export function musicTrackToUniversal(
  track: MusicTrackData, 
  source?: UniversalTrack['source']
): UniversalTrack {
  return {
    id: track.eventId || track.identifier || `track-${Date.now()}`,
    title: track.title,
    artist: track.artist,
    audioUrl: track.audioUrl,
    duration: track.duration,
    imageUrl: track.imageUrl,
    explicit: track.explicit,
    language: track.language,
    source,
    eventId: track.eventId,
    identifier: track.identifier,
  };
}

// Helper function to convert release tracks to UniversalTrack array
export function releaseTracksToUniversal(
  release: any, // MusicRelease type
  sourceType: 'release' | 'playlist' = 'release'
): UniversalTrack[] {
  if (!release.tracks) return [];
  
  return release.tracks.map((track: any, index: number) => {
    // Use actual track metadata if available, otherwise create synthetic ID
    const trackId = track.eventId || `${release.eventId}-track-${index}`;
    const trackIdentifier = track.identifier || `${release.identifier || release.eventId}-track-${index}`;
    
    return {
      id: trackId,
      title: track.title,
      artist: track.artist || "Unknown Artist", // Use track's artist or generic fallback
      audioUrl: track.audioUrl,
      duration: track.duration,
      imageUrl: track.imageUrl || release.imageUrl,
      explicit: track.explicit,
      language: track.language,
      source: {
        type: sourceType,
        releaseId: release.eventId,
        releaseTitle: release.title,
        artistPubkey: track.artistPubkey || release.artistPubkey, // Use track's artist pubkey if available
      },
      eventId: track.eventId, // Use actual event ID if available
      identifier: trackIdentifier,
    };
  });
}

interface UniversalAudioPlayerProviderProps {
  children: ReactNode;
}

export function UniversalAudioPlayerProvider({ children }: UniversalAudioPlayerProviderProps) {
  const audioRef = useRef<HTMLAudioElement>(null);

  const [state, setState] = useState<UniversalAudioPlayerState>({
    currentTrack: null,
    currentTrackIndex: 0,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 1,
    playbackRate: 1,
    isLoading: false,
    error: null,
    queue: [],
    queueTitle: undefined,
    shuffle: false,
    repeat: 'none',
    playHistory: [],
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
      setState(prev => ({ ...prev, isPlaying: false, currentTime: 0 }));
      // Auto-advance to next track based on repeat mode
      setTimeout(() => {
        if (state.repeat === 'one') {
          play();
        } else {
          nextTrack();
        }
      }, 100);
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
  }, [state.repeat]);

  // Load and play a specific track
  const loadTrack = (track: UniversalTrack, autoPlay: boolean = false) => {
    const audio = audioRef.current;
    if (!audio || !track.audioUrl) return;

    setState(prev => ({
      ...prev,
      currentTrack: track,
      currentTime: 0,
      error: null,
      playHistory: [track, ...prev.playHistory.slice(0, 49)] // Keep last 50 tracks
    }));

    // Set up one-time event listener for when audio is ready to play
    if (autoPlay) {
      const handleCanPlay = () => {
        audio.removeEventListener('canplay', handleCanPlay);
        audio.removeEventListener('error', handleError);
        audio.play().catch(error => {
          console.error('Failed to play audio:', error);
          setState(prev => ({
            ...prev,
            error: 'Failed to play audio: ' + error.message,
            isLoading: false
          }));
        });
      };

      const handleError = () => {
        audio.removeEventListener('canplay', handleCanPlay);
        audio.removeEventListener('error', handleError);
        setState(prev => ({
          ...prev,
          error: 'Failed to load audio',
          isLoading: false
        }));
      };

      audio.addEventListener('canplay', handleCanPlay, { once: true });
      audio.addEventListener('error', handleError, { once: true });
    }

    audio.src = track.audioUrl;
    audio.load();
  };

  // Play a single track (optionally with a queue)
  const playTrack = (track: UniversalTrack, queue?: UniversalTrack[], queueTitle?: string) => {
    if (queue) {
      const trackIndex = queue.findIndex(t => t.id === track.id);
      playQueue(queue, trackIndex >= 0 ? trackIndex : 0, queueTitle);
    } else {
      setState(prev => ({
        ...prev,
        queue: [track],
        currentTrackIndex: 0,
        queueTitle: track.title
      }));
      loadTrack(track, true); // Auto-play when loading single track
    }
  };

  // Play a queue of tracks
  const playQueue = (queue: UniversalTrack[], startIndex: number = 0, queueTitle?: string) => {
    if (queue.length === 0) return;
    
    const validIndex = Math.max(0, Math.min(startIndex, queue.length - 1));
    const track = queue[validIndex];

    setState(prev => ({
      ...prev,
      queue,
      currentTrackIndex: validIndex,
      queueTitle
    }));

    loadTrack(track, true); // Auto-play when loading queue
  };

  // Add track to current queue
  const addToQueue = (track: UniversalTrack) => {
    setState(prev => ({
      ...prev,
      queue: [...prev.queue, track]
    }));
  };

  // Remove track from queue
  const removeFromQueue = (index: number) => {
    setState(prev => {
      const newQueue = prev.queue.filter((_, i) => i !== index);
      let newIndex = prev.currentTrackIndex;
      
      if (index < prev.currentTrackIndex) {
        newIndex = prev.currentTrackIndex - 1;
      } else if (index === prev.currentTrackIndex && newQueue.length > 0) {
        newIndex = Math.min(prev.currentTrackIndex, newQueue.length - 1);
        // Load the new current track
        if (newQueue[newIndex]) {
          loadTrack(newQueue[newIndex]);
        }
      }

      return {
        ...prev,
        queue: newQueue,
        currentTrackIndex: newIndex
      };
    });
  };

  // Clear the entire queue
  const clearQueue = () => {
    stop();
    setState(prev => ({
      ...prev,
      queue: [],
      currentTrackIndex: 0,
      queueTitle: undefined
    }));
  };

  // Playback controls
  const play = () => {
    const audio = audioRef.current;
    if (!audio || !state.currentTrack) return;

    audio.play().catch(error => {
      console.error('Failed to play audio:', error);
      setState(prev => ({
        ...prev,
        error: 'Failed to play audio: ' + error.message,
        isLoading: false
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
    audio.volume = Math.max(0, Math.min(1, volume));
  };

  const setPlaybackRate = (rate: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.playbackRate = Math.max(0.25, Math.min(3, rate));
  };

  // Navigation
  const nextTrack = () => {
    if (state.queue.length === 0) return;

    let nextIndex: number;
    
    if (state.shuffle) {
      // Random next track (excluding current)
      const availableIndices = state.queue
        .map((_, i) => i)
        .filter(i => i !== state.currentTrackIndex);
      nextIndex = availableIndices[Math.floor(Math.random() * availableIndices.length)];
    } else {
      nextIndex = state.currentTrackIndex + 1;
    }

    // Handle repeat modes
    if (nextIndex >= state.queue.length) {
      if (state.repeat === 'all') {
        nextIndex = 0;
      } else {
        return; // End of queue
      }
    }

    jumpToTrack(nextIndex);
  };

  const previousTrack = () => {
    if (state.queue.length === 0) return;

    // If we're more than 3 seconds into the track, restart it
    if (state.currentTime > 3) {
      seekTo(0);
      return;
    }

    let prevIndex = state.currentTrackIndex - 1;
    
    if (prevIndex < 0) {
      if (state.repeat === 'all') {
        prevIndex = state.queue.length - 1;
      } else {
        return; // Beginning of queue
      }
    }

    jumpToTrack(prevIndex);
  };

  const jumpToTrack = (index: number) => {
    if (index < 0 || index >= state.queue.length) return;

    const track = state.queue[index];
    setState(prev => ({ ...prev, currentTrackIndex: index }));
    loadTrack(track, true); // Auto-play when jumping to track
  };

  // Queue options
  const toggleShuffle = () => {
    setState(prev => ({ ...prev, shuffle: !prev.shuffle }));
  };

  const setRepeat = (mode: 'none' | 'one' | 'all') => {
    setState(prev => ({ ...prev, repeat: mode }));
  };

  const contextValue: UniversalAudioPlayerContextType = {
    state,
    playTrack,
    playQueue,
    addToQueue,
    removeFromQueue,
    clearQueue,
    play,
    pause,
    stop,
    seekTo,
    setVolume,
    setPlaybackRate,
    nextTrack,
    previousTrack,
    jumpToTrack,
    toggleShuffle,
    setRepeat,
    audioRef,
  };

  return (
    <UniversalAudioPlayerContext.Provider value={contextValue}>
      {children}
      <audio
        ref={audioRef}
        preload="metadata"
        style={{ display: 'none' }}
      />
    </UniversalAudioPlayerContext.Provider>
  );
}

// Hook to use the universal audio player
export function useUniversalAudioPlayer() {
  const context = useContext(UniversalAudioPlayerContext);
  if (!context) {
    throw new Error('useUniversalAudioPlayer must be used within a UniversalAudioPlayerProvider');
  }
  return context;
}

export { UniversalAudioPlayerContext };