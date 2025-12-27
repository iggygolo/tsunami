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
import { ArtistLinkCompact } from '@/components/music/ArtistLink';
import { useUniversalAudioPlayer } from '@/contexts/UniversalAudioPlayerContext';
import { useGlassEffect } from '@/hooks/useBackdropSupport';
import { MUSIC_KINDS } from '@/lib/musicConfig';
import { encodeMusicTrackAsNaddr } from '@/lib/nip19Utils';
import { useNavigate, Link } from 'react-router-dom';
import type { NostrEvent } from '@nostrify/nostrify';

export function PersistentAudioPlayer() {
  const {
    state,
    play,
    pause,
    stop,
    seekTo,
    setVolume,
    nextTrack,
    previousTrack
  } = useUniversalAudioPlayer();

  const navigate = useNavigate();
  const [isMuted, setIsMuted] = useState(false);
  const [previousVolume, setPreviousVolume] = useState(1);
  const { getGlassClass } = useGlassEffect();

  // Don't render if no track is loaded
  if (!state.currentTrack) {
    return null;
  }

  const currentTrack = state.currentTrack;
  const queueTitle = state.queueTitle || 'Unknown';

  // Determine the image to display
  const displayImage = currentTrack.imageUrl;

  // Create NostrEvent for zap functionality
  const trackEvent: NostrEvent = {
    id: currentTrack.eventId || currentTrack.id,
    pubkey: currentTrack.source?.artistPubkey || '',
    created_at: Math.floor(Date.now() / 1000),
    kind: MUSIC_KINDS.MUSIC_TRACK,
    tags: [
      ['d', currentTrack.identifier || currentTrack.id],
      ['title', currentTrack.title],
      ...(currentTrack.artist ? [['artist', currentTrack.artist]] : []),
      ...(currentTrack.audioUrl ? [['audio', currentTrack.audioUrl]] : []),
      ...(currentTrack.imageUrl ? [['image', currentTrack.imageUrl]] : []),
    ],
    content: '',
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

  // Generate track link using naddr format
  const getTrackLink = (): string | null => {
    // Only check for synthetic track identifiers, not source type
    const isSyntheticTrack = currentTrack.identifier?.includes('-track-') || 
                            currentTrack.id?.includes('-track-');
    
    if (isSyntheticTrack) {
      return null; // Will navigate to release instead
    }

    if (currentTrack.source?.artistPubkey && currentTrack.identifier) {
      // Generate naddr for standalone tracks
      const naddr = encodeMusicTrackAsNaddr(
        currentTrack.source.artistPubkey, 
        currentTrack.identifier
      );
      return `/track/${naddr}`;
    }
    
    return null;
  };

  const handleNavigateToTrack = () => {
    const trackLink = getTrackLink();
    
    if (trackLink) {
      navigate(trackLink);
    } else {
      // For synthetic tracks or tracks without proper metadata, navigate to the release instead
      handleNavigateToRelease();
    }
  };

  const handleNavigateToRelease = () => {
    if (currentTrack.source?.releaseId && currentTrack.source?.artistPubkey) {
      navigate(`/releases/${currentTrack.source.releaseId}`);
    } else if (currentTrack.source?.releaseId) {
      navigate(`/releases/${currentTrack.source.releaseId}`);
    } else if (currentTrack.source?.type === 'profile' && currentTrack.source.artistPubkey) {
      navigate(`/profile/${currentTrack.source.artistPubkey}`);
    }
  };

  return (
    <div className={`fixed bottom-0 left-0 right-0 z-50 ${getGlassClass()} shadow-[0_-8px_30px_rgb(0,0,0,0.3)]`}>
      {/* Progress Bar as Top Border */}
      <div className="relative h-1 w-full">
        <SliderPrimitive.Root
          value={[state.currentTime]}
          max={state.duration || 100}
          step={1}
          onValueChange={handleSeek}
          disabled={state.queue.length === 0 || state.isLoading}
          className="absolute inset-0 flex w-full touch-none select-none items-center cursor-pointer"
        >
          <SliderPrimitive.Track className="relative h-1 w-full grow overflow-hidden bg-white/20">
            <SliderPrimitive.Range className="absolute h-full bg-white/90" />
          </SliderPrimitive.Track>
          <SliderPrimitive.Thumb className="block h-3 w-3 rounded-full bg-white shadow-lg ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:scale-110" />
        </SliderPrimitive.Root>
      </div>

      {/* Main Player Content */}
      <div className="mx-auto px-4 sm:px-6 py-4 max-w-4xl 2xl:max-w-5xl">
        {/* Mobile Layout */}
        <div className="sm:hidden">
          {/* Top Row: Track Info */}
          <div className="flex items-center space-x-4 mb-4">
            {displayImage && (
              <div className="relative">
                {getTrackLink() ? (
                  <Link to={getTrackLink()!} className="block">
                    <img
                      src={displayImage}
                      alt={currentTrack.title}
                      className="w-12 h-12 rounded-lg object-cover flex-shrink-0 shadow-lg ring-1 ring-white/20 cursor-pointer hover:ring-white/40 transition-all"
                      title="View track page"
                    />
                  </Link>
                ) : (
                  <img
                    src={displayImage}
                    alt={currentTrack.title}
                    className="w-12 h-12 rounded-lg object-cover flex-shrink-0 shadow-lg ring-1 ring-white/20 cursor-pointer hover:ring-white/40 transition-all"
                    onClick={handleNavigateToTrack}
                    title="View release page"
                  />
                )}
                {state.isPlaying && (
                  <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-white rounded-full flex items-center justify-center shadow-md">
                    <div className="w-1 h-1 bg-black rounded-full animate-pulse" />
                  </div>
                )}
              </div>
            )}
            <div className="min-w-0 flex-1">
              {getTrackLink() ? (
                <Link 
                  to={getTrackLink()!}
                  className="text-left w-full group block"
                  title="View track page"
                >
                  <p className="font-medium text-sm line-clamp-1 text-white group-hover:text-white/90 transition-colors cursor-pointer">
                    {currentTrack.title}
                  </p>
                </Link>
              ) : (
                <button 
                  onClick={handleNavigateToTrack}
                  className="text-left w-full group"
                  title="View release page"
                >
                  <p className="font-medium text-sm line-clamp-1 text-white group-hover:text-white/90 transition-colors cursor-pointer">
                    {currentTrack.title}
                  </p>
                </button>
              )}
              <p className="text-xs text-white/70 line-clamp-1 mb-1">
                {currentTrack.source?.artistPubkey ? (
                  <ArtistLinkCompact 
                    pubkey={currentTrack.source.artistPubkey}
                    className="text-white/70 hover:text-white transition-colors"
                  />
                ) : (
                  <button 
                    onClick={handleNavigateToRelease}
                    className="hover:text-white transition-colors cursor-pointer"
                  >
                    {currentTrack.artist || queueTitle}
                  </button>
                )}
              </p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/50 tabular-nums">
                  {formatTime(state.currentTime)} / {formatTime(state.duration)}
                </span>
                <div className="flex items-center space-x-2">
                  {/* Zap Button */}
                  <ZapDialog target={trackEvent}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 rounded-full hover:bg-white/10 text-white/80 hover:text-yellow-400 transition-colors"
                      title="Zap this track"
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
              disabled={state.queue.length <= 1 || state.currentTrackIndex === 0}
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
              disabled={state.queue.length === 0}
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
              disabled={state.queue.length === 0 || state.isLoading}
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
              disabled={state.queue.length === 0}
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
              disabled={state.queue.length <= 1 || state.currentTrackIndex >= state.queue.length - 1}
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
          <div className="flex items-center space-x-4 min-w-0 w-1/3">
            {displayImage && (
              <div className="relative">
                {getTrackLink() ? (
                  <Link to={getTrackLink()!} className="block">
                    <img
                      src={displayImage}
                      alt={currentTrack.title}
                      className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg object-cover flex-shrink-0 shadow-lg ring-1 ring-white/20 cursor-pointer hover:ring-white/40 transition-all"
                      title="View track page"
                    />
                  </Link>
                ) : (
                  <img
                    src={displayImage}
                    alt={currentTrack.title}
                    className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg object-cover flex-shrink-0 shadow-lg ring-1 ring-white/20 cursor-pointer hover:ring-white/40 transition-all"
                    onClick={handleNavigateToTrack}
                    title="View release page"
                  />
                )}
                {state.isPlaying && (
                  <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-white rounded-full flex items-center justify-center shadow-md">
                    <div className="w-1 h-1 bg-black rounded-full animate-pulse" />
                  </div>
                )}
              </div>
            )}
            <div className="min-w-0 flex-1 flex flex-col">
              {getTrackLink() ? (
                <Link 
                  to={getTrackLink()!}
                  className="text-left w-full group block"
                  title="View track page"
                >
                  <p className="font-medium text-xs sm:text-sm line-clamp-1 text-white group-hover:text-white/90 transition-colors cursor-pointer">
                    {currentTrack.title}
                  </p>
                </Link>
              ) : (
                <button 
                  onClick={handleNavigateToTrack}
                  className="text-left w-full group"
                  title="View release page"
                >
                  <p className="font-medium text-xs sm:text-sm line-clamp-1 text-white group-hover:text-white/90 transition-colors cursor-pointer">
                    {currentTrack.title}
                  </p>
                </button>
              )}
              <p className="text-xs text-white/70 line-clamp-1">
                {currentTrack.source?.artistPubkey ? (
                  <ArtistLinkCompact 
                    pubkey={currentTrack.source.artistPubkey}
                    className="text-white/70 hover:text-white transition-colors"
                  />
                ) : (
                  <button 
                    onClick={handleNavigateToRelease}
                    className="hover:text-white transition-colors cursor-pointer"
                  >
                    {currentTrack.artist || queueTitle}
                  </button>
                )}
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
              disabled={state.queue.length <= 1 || state.currentTrackIndex === 0}
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
              disabled={state.queue.length === 0}
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
              disabled={state.queue.length === 0 || state.isLoading}
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
              disabled={state.queue.length === 0}
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
              disabled={state.queue.length <= 1 || state.currentTrackIndex >= state.queue.length - 1}
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
            <ZapDialog target={trackEvent}>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 rounded-full hover:bg-white/10 text-white/80 hover:text-yellow-400 transition-colors"
                title="Zap this track"
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