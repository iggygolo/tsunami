import { useState } from 'react';
import { Play, Pause, Clock, Music, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ZapDialog } from '@/components/ZapDialog';
import { useFormatDuration } from '@/hooks/useFormatDuration';
import { useTrackPlayback } from '@/hooks/useTrackPlayback';
import { MUSIC_KINDS } from '@/lib/musicConfig';
import { cn } from '@/lib/utils';
import type { MusicRelease } from '@/types/music';
import type { NostrEvent } from '@nostrify/nostrify';

interface TrackListProps {
  release: MusicRelease;
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

  // Create NostrEvent for individual track zapping
  const createTrackEvent = (trackIndex: number): NostrEvent => {
    const track = release.tracks[trackIndex];
    return {
      id: `${release.eventId}-track-${trackIndex}`, // Unique ID for each track
      pubkey: release.artistPubkey,
      created_at: Math.floor(release.createdAt.getTime() / 1000),
      kind: 36787, // Music track kind (individual track)
      tags: [
        ['d', `${release.identifier || release.eventId}-track-${trackIndex}`],
        ['title', track.title],
        ['r', track.audioUrl || ''],
        ['duration', (track.duration || 0).toString()],
        ...(track.language ? [['language', track.language]] : []),
        ...(track.explicit ? [['content-warning', 'explicit']] : []),
        // Reference to parent release
        ['a', `${MUSIC_KINDS.MUSIC_PLAYLIST}:${release.artistPubkey}:${release.identifier || release.eventId}`]
      ],
      content: JSON.stringify({
        title: track.title,
        audioUrl: track.audioUrl,
        audioType: track.audioType,
        duration: track.duration,
        explicit: track.explicit,
        language: track.language
      }),
      sig: ''
    };
  };

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
              "group flex items-center gap-2 sm:gap-4 p-2 sm:p-3 rounded-lg transition-all duration-200",
              "hover:bg-white/5 cursor-pointer",
              isCurrentTrack && "bg-white/10",
              !hasAudio && "opacity-50 cursor-not-allowed"
            )}
            onMouseEnter={() => setHoveredTrack(index)}
            onMouseLeave={() => setHoveredTrack(null)}
            onClick={() => hasAudio && handleTrackPlay(index)}
          >
            {/* Track Number / Play Button */}
            <div className="w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center flex-shrink-0">
              {hasAudio && (isHovered || isCurrentTrack) ? (
                <Button
                  size="icon"
                  variant="ghost"
                  className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-white/10 hover:bg-white/20 text-white"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTrackPlay(index);
                  }}
                >
                  {isPlaying ? (
                    <Pause className="w-3 h-3 sm:w-4 sm:h-4" fill="currentColor" />
                  ) : (
                    <Play className="w-3 h-3 sm:w-4 sm:h-4 ml-0.5" fill="currentColor" />
                  )}
                </Button>
              ) : (
                <span className={cn(
                  "text-xs sm:text-sm font-medium",
                  isCurrentTrack ? "text-white" : "text-white/60",
                  !hasAudio && "text-white/30"
                )}>
                  {index + 1}
                </span>
              )}
            </div>

            {/* Track Info */}
            <div className="flex-1 min-w-0 pr-2">
              <div className="flex items-center gap-1 flex-wrap">
                <h4 className={cn(
                  "font-medium truncate max-w-full",
                  isCurrentTrack ? "text-white" : "text-white/90",
                  !hasAudio && "text-white/50"
                )}>
                  {track.title}
                </h4>
                {track.explicit && (
                  <Badge variant="destructive" className="text-xs px-1.5 py-0.5 h-5 flex-shrink-0">
                    E
                  </Badge>
                )}
                {!hasAudio && (
                  <Badge variant="outline" className="text-xs px-1.5 py-0.5 h-5 border-white/30 text-white/50 flex-shrink-0">
                    No Audio
                  </Badge>
                )}
              </div>
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

            {/* Duration and Actions */}
            <div className="flex items-center gap-2 sm:gap-3 text-white/60 text-sm flex-shrink-0">
              <div className="hidden xs:flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span className="text-xs sm:text-sm">{formatDuration(track.duration || 0)}</span>
              </div>
              <div className="flex xs:hidden items-center">
                <span className="text-xs">{formatDuration(track.duration || 0)}</span>
              </div>
              
              {/* Zap Button for Track - Always visible when track has audio */}
              {hasAudio && (
                <div onClick={(e) => e.stopPropagation()}>
                  <ZapDialog target={createTrackEvent(index)}>
                    <Button
                      size="icon"
                      variant="ghost"
                      className={cn(
                        "w-7 h-7 sm:w-8 sm:h-8 rounded-full hover:bg-white/10 text-white/60 hover:text-yellow-400 flex-shrink-0",
                      )}
                      title={`Zap "${track.title}"`}
                    >
                      <Zap className="w-3 h-3" />
                    </Button>
                  </ZapDialog>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}