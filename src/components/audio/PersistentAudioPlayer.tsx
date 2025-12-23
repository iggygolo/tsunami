import { useState } from 'react';
import { Link } from 'react-router-dom';
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
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import * as SliderPrimitive from '@radix-ui/react-slider';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import { encodeReleaseAsNaddr } from '@/lib/nip19Utils';
import { PODCAST_KINDS } from '@/lib/podcastConfig';
import { ReleaseActions } from '@/components/podcast/ReleaseActions';
import { CommentsSection } from '@/components/comments/CommentsSection';

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

  const [isExpanded, setIsExpanded] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [previousVolume, setPreviousVolume] = useState(1);

  // Don't render if no release is loaded
  if (!state.currentRelease) {
    return null;
  }

  const release = state.currentRelease;
  const releaseNaddr = encodeReleaseAsNaddr(release.artistPubkey, release.identifier);

  // Create NostrEvent for social features - must match the real release event structure
  // For addressable events (kind 34139), comments are identified by #a tag: kind:pubkey:identifier
  // CRITICAL: Use the same identifier logic as everywhere else in the app
  const releaseIdentifier = release.identifier || release.eventId;
  
  const releaseEvent: NostrEvent = {
    id: release.eventId, // Real event ID from the release
    pubkey: release.artistPubkey,
    created_at: Math.floor(release.createdAt.getTime() / 1000),
    kind: PODCAST_KINDS.MUSIC_PLAYLIST, // Music playlist events (releases)
    tags: [
      ['d', releaseIdentifier], // CRITICAL: Must match identifier logic used in ReleasePage
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

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-t from-background via-background to-background/95 backdrop-blur-xl border-t border-border/50 shadow-[0_-8px_30px_rgb(0,0,0,0.12)] dark:shadow-[0_-8px_30px_rgb(0,0,0,0.3)]">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        {/* Main Player Bar */}
        <div className="px-4 sm:px-6 py-4">
          {/* release Info Row */}
          <div className="flex items-center space-x-4 mb-4">
            {release.imageUrl && (
              <div className="relative">
                <img
                  src={release.imageUrl}
                  alt={release.title}
                  className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg object-cover flex-shrink-0 shadow-lg ring-1 ring-black/5 dark:ring-white/10"
                />
                {state.isPlaying && (
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center shadow-md">
                    <div className="w-1.5 h-1.5 bg-primary-foreground rounded-full animate-pulse" />
                  </div>
                )}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <Link
                to={`/${releaseNaddr}`}
                className="font-medium text-xs sm:text-sm hover:text-primary transition-colors line-clamp-1"
              >
                {release.tracks[state.currentTrackIndex]?.title || `Track ${state.currentTrackIndex + 1}`}
              </Link>
              <p className="text-xs text-muted-foreground line-clamp-1">
                {release.title}
              </p>
              <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                {state.error && (
                  <Badge variant="destructive" className="text-xs">
                    Error
                  </Badge>
                )}
                {state.isLoading && (
                  <Badge variant="secondary" className="text-xs">
                    Loading...
                  </Badge>
                )}
              </div>
            </div>
            
            {/* Social Actions */}
            <div className="hidden sm:flex items-center">
              <ReleaseActions
                release={release}
                showComments={showComments}
                onToggleComments={() => {
                  if (!showComments) {
                    setIsExpanded(true);
                    setShowComments(true);
                  } else {
                    setShowComments(false);
                  }
                }}
                className="scale-90"
              />
            </div>
            
            {/* Expand & Close Controls - Top right */}
            <div className="flex items-center space-x-1">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 sm:h-9 sm:w-9 p-0">
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 sm:h-5 sm:w-5" />
                  ) : (
                    <ChevronUp className="h-4 w-4 sm:h-5 sm:w-5" />
                  )}
                </Button>
              </CollapsibleTrigger>

              <Button
                variant="ghost"
                size="sm"
                onClick={stop}
                className="h-8 w-8 sm:h-9 sm:w-9 p-0 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
            </div>
          </div>

          {/* Playback Controls Row - Centered with volume on the right */}
          <div className="flex items-center justify-between mb-4">
            {/* Spacer for balance on desktop */}
            <div className="hidden sm:block w-32" />
            
            {/* Center: Playback Controls */}
            <div className="flex items-center justify-center space-x-1 sm:space-x-2 flex-1 sm:flex-none">
              {/* Previous Track */}
              <Button
                variant="ghost"
                size="sm"
                onClick={previousTrack}
                disabled={!release.tracks || release.tracks.length <= 1 || state.currentTrackIndex === 0}
                className="h-10 w-10 sm:h-11 sm:w-11 p-0 rounded-full hover:bg-accent hover:text-accent-foreground transition-colors"
                title="Previous track"
              >
                <SkipBack className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>

              {/* Rewind 15s */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSkipBack}
                disabled={!release.tracks || release.tracks.length === 0}
                className="h-11 w-11 sm:h-12 sm:w-12 p-0 rounded-full hover:bg-accent hover:text-accent-foreground transition-colors"
                title="Rewind 15 seconds"
              >
                <RotateCcw className="h-5 w-5 sm:h-6 sm:w-6" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={handlePlayPause}
              disabled={!release.tracks || release.tracks.length === 0 || state.isLoading}
              className="h-14 w-14 sm:h-16 sm:w-16 p-0 rounded-full bg-gradient-to-br from-primary to-primary/80 text-primary-foreground hover:from-primary/90 hover:to-primary/70 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 ring-2 ring-primary/20"
            >
              {state.isPlaying ? (
                <Pause className="h-6 w-6 sm:h-7 sm:w-7" />
              ) : (
                <Play className="h-6 w-6 sm:h-7 sm:w-7 ml-0.5" />
              )}
            </Button>

            {/* Forward 15s */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSkipForward}
              disabled={!release.tracks || release.tracks.length === 0}
              className="h-11 w-11 sm:h-12 sm:w-12 p-0 rounded-full hover:bg-accent hover:text-accent-foreground transition-colors"
              title="Forward 15 seconds"
            >
              <RotateCw className="h-5 w-5 sm:h-6 sm:w-6" />
            </Button>

            {/* Next Track */}
            <Button
              variant="ghost"
              size="sm"
              onClick={nextTrack}
              disabled={!release.tracks || release.tracks.length <= 1 || state.currentTrackIndex >= release.tracks.length - 1}
              className="h-10 w-10 sm:h-11 sm:w-11 p-0 rounded-full hover:bg-accent hover:text-accent-foreground transition-colors"
              title="Next track"
            >
              <SkipForward className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
            </div>

            {/* Right: Volume Controls - Visible on desktop only */}
            <div className="hidden sm:flex items-center space-x-2 bg-muted/40 rounded-full px-3 py-1.5">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMuteToggle}
                className="h-8 w-8 p-0 rounded-full hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                {isMuted || state.volume === 0 ? (
                  <VolumeX className="h-4 w-4" />
                ) : (
                  <Volume2 className="h-4 w-4" />
                )}
              </Button>

              <div className="w-20">
                <Slider
                  value={[isMuted ? 0 : state.volume]}
                  max={1}
                  step={0.1}
                  onValueChange={handleVolumeChange}
                  className="cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Bottom Row: Progress Bar & Time */}
          <div className="flex items-center space-x-4 bg-muted/30 rounded-full px-4 py-2">
            <span className="text-xs font-medium text-muted-foreground min-w-[40px] tabular-nums">
              {formatTime(state.currentTime)}
            </span>
            <div className="flex-1">
              <SliderPrimitive.Root
                value={[state.currentTime]}
                max={state.duration || 100}
                step={1}
                onValueChange={handleSeek}
                disabled={!release.tracks || release.tracks.length === 0 || state.isLoading}
                className="relative flex w-full touch-none select-none items-center cursor-pointer"
              >
                <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-muted">
                  <SliderPrimitive.Range className="absolute h-full bg-emerald-500" />
                </SliderPrimitive.Track>
                <SliderPrimitive.Thumb className="block h-4 w-4 rounded-full border-2 border-emerald-500 bg-background shadow-md ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-emerald-50 dark:hover:bg-emerald-950" />
              </SliderPrimitive.Root>
            </div>
            <span className="text-xs font-medium text-muted-foreground min-w-[40px] tabular-nums text-right">
              {formatTime(state.duration)}
            </span>
          </div>
        </div>

        {/* Expanded Controls */}
        <CollapsibleContent>
          <div className="px-4 sm:px-6 pb-6 pt-4 border-t border-border/50 max-h-[70vh] sm:max-h-none overflow-y-auto">
            <div className="space-y-6">
              {/* Now Playing Details */}
              <div className="flex items-start space-x-4">
                {release.imageUrl && (
                  <img
                    src={release.imageUrl}
                    alt={release.title}
                    className="w-20 h-20 rounded-lg object-cover flex-shrink-0 shadow-md"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-lg">
                    {release.tracks[state.currentTrackIndex]?.title || `Track ${state.currentTrackIndex + 1}`}
                  </p>
                  <Link
                    to={`/${releaseNaddr}`}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    {release.title}
                  </Link>
                  {release.description && (
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                      {release.description}
                    </p>
                  )}
                  {release.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {release.tags.slice(0, 4).map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          #{tag}
                        </Badge>
                      ))}
                      {release.tags.length > 4 && (
                        <span className="text-xs text-muted-foreground">
                          +{release.tags.length - 4} more
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Settings Row */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 py-3 border-y border-border/50">
                {/* Volume Controls - Visible on mobile */}
                <div className="sm:hidden flex items-center space-x-3">
                  <span className="text-sm font-medium text-muted-foreground w-16">Volume</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleMuteToggle}
                    className="h-8 w-8 p-0"
                  >
                    {isMuted || state.volume === 0 ? (
                      <VolumeX className="h-4 w-4" />
                    ) : (
                      <Volume2 className="h-4 w-4" />
                    )}
                  </Button>
                  <div className="flex-1">
                    <Slider
                      value={[isMuted ? 0 : state.volume]}
                      max={1}
                      step={0.1}
                      onValueChange={handleVolumeChange}
                      className="cursor-pointer"
                    />
                  </div>
                </div>

                {/* Playback Speed */}
                <div className="flex items-center space-x-3">
                  <span className="text-sm font-medium text-muted-foreground">Speed</span>
                  <div className="flex items-center space-x-1">
                    {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
                      <Button
                        key={rate}
                        variant={state.playbackRate === rate ? "default" : "ghost"}
                        size="sm"
                        onClick={() => handlePlaybackRateChange(rate)}
                        className="text-xs h-7 px-2"
                      >
                        {rate}×
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="sm:ml-auto">
                  <Link
                    to={`/${releaseNaddr}`}
                    className="text-sm text-primary hover:underline"
                  >
                    View full release →
                  </Link>
                </div>
              </div>

              {/* Comments Section */}
              {showComments && (
                <div className="space-y-3">
                  <h4 className="font-semibold">Discussion</h4>
                  <div className="max-h-60 sm:max-h-80 overflow-y-auto rounded-lg bg-muted/30 p-3">
                    <CommentsSection
                      root={releaseEvent}
                      title=""
                      emptyStateMessage="No comments yet"
                      emptyStateSubtitle="Be the first to share your thoughts!"
                      limit={50}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}