import { useState } from 'react';
import { Play, Pause, Clock, Music } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useFormatDuration } from '@/hooks/useFormatDuration';
import { useTrackPlayback } from '@/hooks/useTrackPlayback';
import { cn } from '@/lib/utils';
import type { PodcastRelease } from '@/types/podcast';

interface TrackListProps {
  release: PodcastRelease;
  className?: string;
}

export function TrackList({ release, className }: TrackListProps) {
  const { formatDuration } = useFormatDuration();
  const { 
    handleTrackPlay, 
    isTrackPlaying, 
    isTrackCurrent 
  } = useTrackPlayback(release);
  const [hoveredTrack, setHoveredTrack] = useState<number | null>(null);

  if (!release.tracks || release.tracks.length === 0) {
    return (
      <div className={cn("text-center py-8", className)}>
        <Music className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-muted-foreground">No tracks available</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      {release.tracks.map((track, index) => {
        const isCurrentTrack = isTrackCurrent(index);
        const isPlaying = isTrackPlaying(index);
        const isHovered = hoveredTrack === index;
        const hasAudio = !!track.audioUrl;

        return (
          <div
            key={index}
            className={cn(
              "group flex items-center gap-4 p-3 rounded-lg transition-all duration-200",
              "hover:bg-white/5 cursor-pointer",
              isCurrentTrack && "bg-white/10",
              !hasAudio && "opacity-50 cursor-not-allowed"
            )}
            onMouseEnter={() => setHoveredTrack(index)}
            onMouseLeave={() => setHoveredTrack(null)}
            onClick={() => hasAudio && handleTrackPlay(index)}
          >
            {/* Track Number / Play Button */}
            <div className="w-8 h-8 flex items-center justify-center flex-shrink-0">
              {hasAudio && (isHovered || isCurrentTrack) ? (
                <Button
                  size="icon"
                  variant="ghost"
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTrackPlay(index);
                  }}
                >
                  {isPlaying ? (
                    <Pause className="w-4 h-4" fill="currentColor" />
                  ) : (
                    <Play className="w-4 h-4 ml-0.5" fill="currentColor" />
                  )}
                </Button>
              ) : (
                <span className={cn(
                  "text-sm font-medium",
                  isCurrentTrack ? "text-white" : "text-white/60",
                  !hasAudio && "text-white/30"
                )}>
                  {index + 1}
                </span>
              )}
            </div>

            {/* Track Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4 className={cn(
                  "font-medium truncate",
                  isCurrentTrack ? "text-white" : "text-white/90",
                  !hasAudio && "text-white/50"
                )}>
                  {track.title}
                </h4>
                {track.explicit && (
                  <Badge variant="destructive" className="text-xs px-1.5 py-0.5 h-5">
                    E
                  </Badge>
                )}
                {!hasAudio && (
                  <Badge variant="outline" className="text-xs px-1.5 py-0.5 h-5 border-white/30 text-white/50">
                    No Audio
                  </Badge>
                )}
              </div>
              
              {/* Track metadata */}
              <div className="flex items-center gap-2 text-xs text-white/60">
                {track.language && track.language !== 'en' && (
                  <span className="uppercase">{track.language}</span>
                )}
                {track.audioType && (
                  <span className="uppercase">{track.audioType.replace('audio/', '')}</span>
                )}
              </div>
            </div>

            {/* Duration */}
            <div className="flex items-center gap-2 text-white/60 text-sm">
              <Clock className="w-3 h-3" />
              <span>{formatDuration(track.duration)}</span>
            </div>

            {/* Current playing indicator */}
            {isCurrentTrack && (
              <div className="flex items-center gap-1">
                <div className={cn(
                  "w-1 h-4 bg-white rounded-full",
                  isPlaying && "animate-pulse"
                )} />
                <div className={cn(
                  "w-1 h-3 bg-white/70 rounded-full",
                  isPlaying && "animate-pulse delay-75"
                )} />
                <div className={cn(
                  "w-1 h-2 bg-white/50 rounded-full",
                  isPlaying && "animate-pulse delay-150"
                )} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}