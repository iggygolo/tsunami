import { useState } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  X,
  Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import * as SliderPrimitive from '@radix-ui/react-slider';
import { ZapDialog } from '@/components/ZapDialog';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import { MUSIC_KINDS } from '@/lib/musicConfig';
import { encodeReleaseAsNaddr } from '@/lib/nip19Utils';
import { useNavigate } from 'react-router-dom';
import type { NostrEvent } from '@nostrify/nostrify';

export function PersistentAudioPlayer() {
  const {
    state,
    play,
    pause,
    stop,
    seekTo,
    setVolume,
    setPlaybackRate,
    nextTrack,
    previousTrack
  } = useAudioPlayer();

  const navigate = useNavigate();
  const [isMuted, setIsMuted] = useState(false);
  const [previousVolume, setPreviousVolume] = useState(1);

  // Don't render if no release is loaded
  if (!state.currentRelease) {
    return null;
  }

  const release = state.currentRelease;

  // Create NostrEvent for zap functionality
  const releaseEvent: NostrEvent = {
    id: release.eventId,
    pubkey: release.artistPubkey,
    created_at: Math.floor(release.createdAt.getTime() / 1000),
    kind: MUSIC_KINDS.MUSIC_PLAYLIST,
    tags: [
      ['d', release.identifier || release.eventId],
      ['title', release.title],
      ...(release.description ? [['description', release.description]] : []),
      ...(release.imageUrl ? [['image', release.imageUrl]] : []),
      ...release.tags.map(tag => ['t', tag])
    ],
    content: JSON.stringify(release.tracks),
    sig: ''
  };

  const formatTime = (seconds: number): string => {
    if (!seconds || !isFinite(seconds)) return '0:00';

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePlayPause = () => {
    if (state.isPlaying) {
      pause();
    } else {
      play();
    }
  };

  const handleSeek = (value: number[]) => {
    seekTo(value[0]);
  };

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    setVolume(newVolume);
    if (newVolume > 0 && isMuted) {
      setIsMuted(false);
    }
  };

  const handleMuteToggle = () => {
    if (isMuted) {
      setVolume(previousVolume);
      setIsMuted(false);
    } else {
      setPreviousVolume(state.volume);
      setVolume(0);
      setIsMuted(true);
    }
  };

  const handleSkipBack = () => {
    seekTo(Math.max(0, state.currentTime - 15));
  };

  const handleSkipForward = () => {
    seekTo(Math.min(state.duration, state.currentTime + 15));
  };

  const handlePlaybackRateChange = (rate: number) => {
    setPlaybackRate(rate);
  };

  const handleNavigateToRelease = () => {
    if (release.eventId || release.id) {
      const eventId = release.eventId || release.id;
      navigate(`/releases/${eventId}`);
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-black/30 backdrop-blur-xl shadow-[0_-8px_30px_rgb(0,0,0,0.3)] supports-[backdrop-filter]:bg-black/20 supports-[backdrop-filter]:backdrop-blur-xl sm:bg-black/20 sm:backdrop-blur-xl mobile-glass">
      {/* Progress Bar as Top Border */}
      <div className="relative h-1 w-full">
        <SliderPrimitive.Root
          value={[state.currentTime]}
          max={state.duration || 100}
          step={1}
          onValueChange={handleSeek}
          disabled={!release.tracks || release.tracks.length === 0 || state.isLoading}
          className="absolute inset-0 flex w-full touch-none select-none items-center cursor-pointer"
        >
          <SliderPrimitive.Track className="relative h-1 w-full grow overflow-hidden bg-white/20">
            <SliderPrimitive.Range className="absolute h-full bg-white/90" />
          </SliderPrimitive.Track>
          <SliderPrimitive.Thumb className="block h-3 w-3 rounded-full bg-white shadow-lg ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:scale-110" />
        </SliderPrimitive.Root>
      </div>

      {/* Main Player Content */}
      <div className="mx-auto px-4 sm:px-6 py-3 max-w-4xl 2xl:max-w-5xl">
        {/* Mobile Layout */}
        <div className="sm:hidden">
          {/* Top Row: Track Info */}
          <div className="flex items-center space-x-3 mb-3">
            {release.imageUrl && (
              <div className="relative">
                <img
                  src={release.imageUrl}
                  alt={release.title}
                  className="w-12 h-12 rounded-lg object-cover flex-shrink-0 shadow-lg ring-1 ring-white/20 cursor-pointer hover:ring-white/40 transition-all"
                  onClick={handleNavigateToRelease}
                />
                {state.isPlaying && (
                  <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-white rounded-full flex items-center justify-center shadow-md">
                    <div className="w-1 h-1 bg-black rounded-full animate-pulse" />
                  </div>
                )}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="font-medium text-sm line-clamp-1 text-white">
                {release.tracks[state.currentTrackIndex]?.title || `Track ${state.currentTrackIndex + 1}`}
              </p>
              <p className="text-xs text-white/70 line-clamp-1">
                <button 
                  onClick={handleNavigateToRelease}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  {release.title}
                </button>
              </p>
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs text-white/50 tabular-nums">
                  {formatTime(state.currentTime)} / {formatTime(state.duration)}
                </span>
                <div className="flex items-center space-x-2">
                  {/* Zap Button */}
                  <ZapDialog target={releaseEvent}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 rounded-full hover:bg-white/10 text-white/80 hover:text-yellow-400 transition-colors"
                      title="Zap this release"
                    >
                      <Zap className="h-3 w-3" />
                    </Button>
                  </ZapDialog>
                  {/* Close Button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={stop}
                    className="h-7 w-7 p-0 text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Row: Centered Controls */}
          <div className="flex items-center justify-center space-x-3">
            {/* Previous Track */}
            <Button
              variant="ghost"
              size="sm"
              onClick={previousTrack}
              disabled={!release.tracks || release.tracks.length <= 1 || state.currentTrackIndex === 0}
              className="h-10 w-10 p-0 rounded-full hover:bg-white/10 text-white/80 hover:text-white transition-colors"
              title="Previous track"
            >
              <SkipBack className="h-4 w-4" />
            </Button>

            {/* Rewind 15s */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSkipBack}
              disabled={!release.tracks || release.tracks.length === 0}
              className="h-10 w-10 p-0 rounded-full hover:bg-white/10 text-white/80 hover:text-white transition-colors"
              title="Rewind 15 seconds"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>

            {/* Play/Pause */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePlayPause}
              disabled={!release.tracks || release.tracks.length === 0 || state.isLoading}
              className="h-12 w-12 p-0 rounded-full bg-white/95 backdrop-blur-sm text-black hover:text-black hover:bg-white shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 supports-[backdrop-filter]:bg-white/90"
            >
              {state.isPlaying ? (
                <Pause className="h-5 w-5" fill="currentColor" />
              ) : (
                <Play className="h-5 w-5 ml-0.5" fill="currentColor" />
              )}
            </Button>

            {/* Forward 15s */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSkipForward}
              disabled={!release.tracks || release.tracks.length === 0}
              className="h-10 w-10 p-0 rounded-full hover:bg-white/10 text-white/80 hover:text-white transition-colors"
              title="Forward 15 seconds"
            >
              <RotateCw className="h-4 w-4" />
            </Button>

            {/* Next Track */}
            <Button
              variant="ghost"
              size="sm"
              onClick={nextTrack}
              disabled={!release.tracks || release.tracks.length <= 1 || state.currentTrackIndex >= release.tracks.length - 1}
              className="h-10 w-10 p-0 rounded-full hover:bg-white/10 text-white/80 hover:text-white transition-colors"
              title="Next track"
            >
              <SkipForward className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Desktop Layout */}
        <div className="hidden sm:flex items-center">
          {/* Left: Album Art & Track Info */}
          <div className="flex items-center space-x-3 min-w-0 w-1/3">
            {release.imageUrl && (
              <div className="relative">
                <img
                  src={release.imageUrl}
                  alt={release.title}
                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg object-cover flex-shrink-0 shadow-lg ring-1 ring-white/20 cursor-pointer hover:ring-white/40 transition-all"
                  onClick={handleNavigateToRelease}
                />
                {state.isPlaying && (
                  <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-white rounded-full flex items-center justify-center shadow-md">
                    <div className="w-1 h-1 bg-black rounded-full animate-pulse" />
                  </div>
                )}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="font-medium text-xs sm:text-sm line-clamp-1 text-white">
                {release.tracks[state.currentTrackIndex]?.title || `Track ${state.currentTrackIndex + 1}`}
              </p>
              <p className="text-xs text-white/70 line-clamp-1">
                <button 
                  onClick={handleNavigateToRelease}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  {release.title}
                </button>
              </p>
              <div className="flex items-center space-x-2 text-xs text-white/50">
                <span className="tabular-nums">
                  {formatTime(state.currentTime)} / {formatTime(state.duration)}
                </span>
              </div>
            </div>
          </div>

          {/* Center: Playback Controls */}
          <div className="flex items-center justify-center space-x-1 sm:space-x-2 w-1/3">
            {/* Previous Track */}
            <Button
              variant="ghost"
              size="sm"
              onClick={previousTrack}
              disabled={!release.tracks || release.tracks.length <= 1 || state.currentTrackIndex === 0}
              className="h-8 w-8 sm:h-9 sm:w-9 p-0 rounded-full hover:bg-white/10 text-white/80 hover:text-white transition-colors"
              title="Previous track"
            >
              <SkipBack className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>

            {/* Rewind 15s */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSkipBack}
              disabled={!release.tracks || release.tracks.length === 0}
              className="h-8 w-8 sm:h-9 sm:w-9 p-0 rounded-full hover:bg-white/10 text-white/80 hover:text-white transition-colors"
              title="Rewind 15 seconds"
            >
              <RotateCcw className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>

            {/* Play/Pause */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePlayPause}
              disabled={!release.tracks || release.tracks.length === 0 || state.isLoading}
              className="h-10 w-10 sm:h-11 sm:w-11 p-0 rounded-full bg-white/95 backdrop-blur-sm text-black hover:text-black hover:bg-white shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 supports-[backdrop-filter]:bg-white/90"
            >
              {state.isPlaying ? (
                <Pause className="h-4 w-4 sm:h-5 sm:w-5" fill="currentColor" />
              ) : (
                <Play className="h-4 w-4 sm:h-5 sm:w-5 ml-0.5" fill="currentColor" />
              )}
            </Button>

            {/* Forward 15s */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSkipForward}
              disabled={!release.tracks || release.tracks.length === 0}
              className="h-8 w-8 sm:h-9 sm:w-9 p-0 rounded-full hover:bg-white/10 text-white/80 hover:text-white transition-colors"
              title="Forward 15 seconds"
            >
              <RotateCw className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>

            {/* Next Track */}
            <Button
              variant="ghost"
              size="sm"
              onClick={nextTrack}
              disabled={!release.tracks || release.tracks.length <= 1 || state.currentTrackIndex >= release.tracks.length - 1}
              className="h-8 w-8 sm:h-9 sm:w-9 p-0 rounded-full hover:bg-white/10 text-white/80 hover:text-white transition-colors"
              title="Next track"
            >
              <SkipForward className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
          </div>

          {/* Right: Volume, Zap & Close */}
          <div className="flex items-center justify-end space-x-2 w-1/3">
            {/* Volume Controls */}
            <div className="hidden md:flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMuteToggle}
                className="h-8 w-8 p-0 rounded-full hover:bg-white/10 text-white/80 hover:text-white transition-colors"
              >
                {isMuted || state.volume === 0 ? (
                  <VolumeX className="h-3 w-3" />
                ) : (
                  <Volume2 className="h-3 w-3" />
                )}
              </Button>
              <div className="w-12">
                <SliderPrimitive.Root
                  value={[isMuted ? 0 : state.volume]}
                  max={1}
                  step={0.1}
                  onValueChange={handleVolumeChange}
                  className="relative flex w-full touch-none select-none items-center cursor-pointer"
                >
                  <SliderPrimitive.Track className="relative h-1 w-full grow overflow-hidden rounded-full bg-white/20">
                    <SliderPrimitive.Range className="absolute h-full bg-white/90" />
                  </SliderPrimitive.Track>
                  <SliderPrimitive.Thumb className="block h-2.5 w-2.5 rounded-full bg-white shadow-lg ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:scale-110" />
                </SliderPrimitive.Root>
              </div>
            </div>

            {/* Zap Button */}
            <ZapDialog target={releaseEvent}>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 rounded-full hover:bg-white/10 text-white/80 hover:text-yellow-400 transition-colors"
                title="Zap this release"
              >
                <Zap className="h-3 w-3" />
              </Button>
            </ZapDialog>

            {/* Close Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={stop}
              className="h-8 w-8 sm:h-9 sm:w-9 p-0 text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}