/**
 * UniversalTrackList Component
 * 
 * A unified track list component that works with both:
 * - Release tracks (from MusicRelease)
 * - Individual tracks (from MusicTrackData[])
 * 
 * Features: track numbers, artwork, duration, like/zap/play buttons
 * Now supports universal audio player with proper queue management
 */

import { useState } from 'react';
import { Play, Pause, Clock, Music, Zap, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ZapDialog } from '@/components/ZapDialog';
import { useFormatDuration } from '@/hooks/useFormatDuration';
import { useUniversalAudioPlayer, musicTrackToUniversal, releaseTracksToUniversal, type UniversalTrack } from '@/contexts/UniversalAudioPlayerContext';
import { MUSIC_KINDS } from '@/lib/musicConfig';
import { encodeMusicTrackAsNaddr } from '@/lib/nip19Utils';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import type { MusicRelease, MusicTrackData } from '@/types/music';
import type { NostrEvent } from '@nostrify/nostrify';

interface UniversalTrackListProps {
  // For release tracks (existing pattern)
  release?: MusicRelease;
  // For individual tracks (profile page)
  tracks?: MusicTrackData[];
  // Common props
  className?: string;
  showTrackNumbers?: boolean;
  onTrackPlay?: (track: MusicTrackData, index: number) => void;
}

export function UniversalTrackList({ 
  release, 
  tracks, 
  className,
  showTrackNumbers = true,
  onTrackPlay 
}: UniversalTrackListProps) {
  const { formatDuration } = useFormatDuration();
  const { state: playerState, playTrack: playUniversalTrack, playQueue } = useUniversalAudioPlayer();
  const [likedTracks, setLikedTracks] = useState<Set<number>>(new Set());

  // Determine which tracks to display and source type
  const displayTracks = release ? release.tracks : tracks || [];
  const isReleaseMode = !!release;

  // Convert tracks to universal format
  const universalTracks: UniversalTrack[] = isReleaseMode && release
    ? releaseTracksToUniversal(release, 'release')
    : tracks 
      ? tracks.map(track => musicTrackToUniversal(track, { 
          type: 'profile', 
          artistPubkey: track.artistPubkey 
        }))
      : [];

  // Queue title for context
  const queueTitle = isReleaseMode && release 
    ? release.title 
    : tracks 
      ? 'Profile Tracks' 
      : 'Tracks';

  // Handle track like/unlike (same as original TrackList)
  const handleTrackLike = (trackIndex: number) => {
    setLikedTracks(prev => {
      const newLiked = new Set(prev);
      if (newLiked.has(trackIndex)) {
        newLiked.delete(trackIndex);
      } else {
        newLiked.add(trackIndex);
      }
      return newLiked;
    });
  };

  // Create NostrEvent for track zapping (based on original TrackList)
  const createTrackEvent = (trackIndex: number): NostrEvent => {
    if (isReleaseMode && release) {
      // Use original TrackList pattern for release tracks
      const track = release.tracks[trackIndex];
      return {
        id: `${release.eventId}-track-${trackIndex}`,
        pubkey: release.artistPubkey,
        created_at: Math.floor(release.createdAt.getTime() / 1000),
        kind: MUSIC_KINDS.MUSIC_TRACK,
        tags: [
          ['d', `${release.identifier || release.eventId}-track-${trackIndex}`],
          ['title', track.title],
          ['r', track.audioUrl || ''],
          ['duration', (track.duration || 0).toString()],
          ...(track.language ? [['language', track.language]] : []),
          ...(track.explicit ? [['content-warning', 'explicit']] : []),
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
    } else if (tracks) {
      // Create event for individual track
      const track = tracks[trackIndex];
      return {
        id: track.eventId || `track-${Date.now()}-${trackIndex}`,
        pubkey: track.artistPubkey || '',
        created_at: Math.floor((track.createdAt?.getTime() || Date.now()) / 1000),
        kind: MUSIC_KINDS.MUSIC_TRACK,
        tags: [
          ['d', track.identifier],
          ['title', track.title],
          ['artist', track.artist],
          ['audio', track.audioUrl],
          ...(track.album ? [['album', track.album]] : []),
          ...(track.imageUrl ? [['image', track.imageUrl]] : []),
          ...(track.genres ? track.genres.map(genre => ['t', genre]) : []),
        ],
        content: track.lyrics || track.credits || '',
        sig: ''
      };
    }
    throw new Error('Invalid track configuration');
  };

  // Convert individual track to release format for playback
  const trackToRelease = (track: MusicTrackData, index: number): MusicRelease => {
    return {
      id: track.eventId || `track-${index}`,
      title: track.title,
      description: track.album || track.title,
      content: track.lyrics || track.credits,
      imageUrl: track.imageUrl,
      publishDate: track.createdAt || new Date(),
      tags: track.genres || [],
      transcriptUrl: undefined,
      genre: track.genres?.[0] || null,
      eventId: track.eventId || `track-${index}`,
      artistPubkey: track.artistPubkey || '',
      identifier: track.identifier,
      createdAt: track.createdAt || new Date(),
      tracks: [{
        title: track.title,
        audioUrl: track.audioUrl,
        audioType: track.format ? `audio/${track.format}` : 'audio/mpeg',
        duration: track.duration,
        explicit: track.explicit || false,
        language: track.language || null,
      }],
    };
  };

  // Handle track play using universal audio player
  const handleTrackPlay = (index: number) => {
    const track = universalTracks[index];
    if (!track || !track.audioUrl) return;

    if (onTrackPlay && tracks) {
      // Use custom callback if provided
      onTrackPlay(tracks[index], index);
    } else {
      // Use universal audio player with full queue
      playQueue(universalTracks, index, queueTitle);
    }
  };

  // Check if track is playing using universal player
  const isTrackPlaying = (index: number) => {
    const track = universalTracks[index];
    if (!track) return false;
    
    return playerState.isPlaying && 
           playerState.currentTrack?.id === track.id;
  };

  // Check if track is current using universal player
  const isTrackCurrent = (index: number) => {
    const track = universalTracks[index];
    if (!track) return false;
    
    return playerState.currentTrack?.id === track.id;
  };

  // Generate track link using naddr format for standalone tracks
  const getTrackLink = (track: MusicTrackData | any, index: number): string | null => {
    // For individual tracks (profile page), check if we have proper track metadata
    if (tracks && track.artistPubkey && track.identifier) {
      // Only create links for non-synthetic tracks
      const isSyntheticTrack = track.identifier?.includes('-track-') || 
                              track.id?.includes('-track-');
      
      if (!isSyntheticTrack) {
        const naddr = encodeMusicTrackAsNaddr(track.artistPubkey, track.identifier);
        return `/track/${naddr}`;
      }
    }
    
    // For release tracks, check if they have proper standalone metadata
    if (release && track.eventId && track.identifier && track.artistPubkey) {
      // Only create links for tracks that exist as standalone events
      const isSyntheticTrack = track.identifier?.includes('-track-') || 
                              track.eventId?.includes('-track-');
      
      if (!isSyntheticTrack) {
        const naddr = encodeMusicTrackAsNaddr(track.artistPubkey, track.identifier);
        return `/track/${naddr}`;
      }
    }
    
    return null; // No link for synthetic tracks
  };

  // Empty state (using dark theme semantic colors)
  if (displayTracks.length === 0) {
    return (
      <div className={cn("text-center py-8", className)}>
        <Music className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
        <h3 className="text-foreground font-medium mb-2">No tracks available</h3>
        <p className="text-muted-foreground text-sm">No tracks to display</p>
      </div>
    );
  }

  // Main track list (same structure as original TrackList)
  return (
    <div className={cn("space-y-2", className)}>
      {displayTracks.map((track, index) => {
        const isCurrentTrack = isTrackCurrent(index);
        const isPlaying = isTrackPlaying(index);
        const hasAudio = !!track.audioUrl;

        return (
          <div
            key={`track-${index}-${track.title}`}
            className={cn(
              "group flex items-center gap-2 sm:gap-4 p-2 sm:p-3 rounded-lg transition-all duration-200",
              "hover:bg-white/5 cursor-pointer",
              isCurrentTrack && "bg-white/10",
              !hasAudio && "opacity-50 cursor-not-allowed"
            )}
            onClick={() => hasAudio && handleTrackPlay(index)}
          >
            {/* Track Number */}
            {showTrackNumbers && (
              <div className="w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center flex-shrink-0">
                <span className={cn(
                  "text-xs sm:text-sm font-medium",
                  isCurrentTrack ? "text-white" : "text-white/60",
                  !hasAudio && "text-white/30"
                )}>
                  {index + 1}
                </span>
              </div>
            )}

            {/* Track Image */}
            <div className="w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0 rounded-md overflow-hidden bg-white/10">
              {track.imageUrl ? (
                <img
                  src={track.imageUrl}
                  alt={`${track.title} artwork`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    if (release?.imageUrl && target.src !== release.imageUrl) {
                      target.src = release.imageUrl;
                    } else {
                      target.style.display = 'none';
                      target.nextElementSibling?.classList.remove('hidden');
                    }
                  }}
                />
              ) : release?.imageUrl ? (
                <img
                  src={release.imageUrl}
                  alt={`${release.title} artwork`}
                  className="w-full h-full object-cover opacity-75"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Music className="w-4 h-4 sm:w-5 sm:h-5 text-white/40" />
                </div>
              )}
              <div className="hidden w-full h-full flex items-center justify-center">
                <Music className="w-4 h-4 sm:w-5 sm:h-5 text-white/40" />
              </div>
            </div>

            {/* Track Info */}
            <div className="flex-1 min-w-0 pr-2">
              <div className="flex items-center gap-1 flex-wrap">
                {(() => {
                  const trackLink = getTrackLink(track, index);
                  const trackTitle = (
                    <span className={cn(
                      "font-medium truncate max-w-full",
                      isCurrentTrack ? "text-white" : "text-white/90",
                      !hasAudio && "text-white/50"
                    )}>
                      {track.title}
                    </span>
                  );

                  return trackLink ? (
                    <Link 
                      to={trackLink}
                      className="hover:text-white transition-colors cursor-pointer truncate max-w-full"
                      onClick={(e) => e.stopPropagation()}
                      title="View track page"
                    >
                      {trackTitle}
                    </Link>
                  ) : (
                    <h4 className={cn(
                      "font-medium truncate max-w-full",
                      isCurrentTrack ? "text-white" : "text-white/90",
                      !hasAudio && "text-white/50"
                    )}>
                      {track.title}
                    </h4>
                  );
                })()}
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
              
              {/* Action Buttons - Only show when track has audio */}
              {hasAudio && (
                <>
                  {/* Like Button */}
                  <div onClick={(e) => e.stopPropagation()}>
                    <Button
                      size="icon"
                      variant="ghost"
                      className={cn(
                        "w-7 h-7 sm:w-8 sm:h-8 rounded-full hover:bg-white/10 flex-shrink-0 transition-colors",
                        likedTracks.has(index) 
                          ? "text-red-500 hover:text-red-400" 
                          : "text-white/60 hover:text-red-400"
                      )}
                      onClick={() => handleTrackLike(index)}
                      title={likedTracks.has(index) ? `Unlike "${track.title}"` : `Like "${track.title}"`}
                    >
                      <Heart 
                        className="w-3 h-3" 
                        fill={likedTracks.has(index) ? "currentColor" : "none"}
                      />
                    </Button>
                  </div>

                  {/* Zap Button */}
                  <div onClick={(e) => e.stopPropagation()}>
                    <ZapDialog target={createTrackEvent(index)}>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="w-7 h-7 sm:w-8 sm:h-8 rounded-full hover:bg-white/10 text-white/60 hover:text-yellow-400 flex-shrink-0"
                        title={`Zap "${track.title}"`}
                      >
                        <Zap className="w-3 h-3" />
                      </Button>
                    </ZapDialog>
                  </div>

                  {/* Play/Pause Button */}
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
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}