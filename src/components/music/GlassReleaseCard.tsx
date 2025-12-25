import { formatDistanceToNow } from 'date-fns';
import { Play, Pause, Music, Clock, Calendar, Zap, Heart, Volume2, Share } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { ZapDialog } from '@/components/ZapDialog';
import { useUniversalTrackPlayback } from '@/hooks/useUniversalTrackPlayback';
import { useReleasePrefetch } from '@/hooks/useReleasePrefetch';
import { useReleaseInteractions } from '@/hooks/useReleaseInteractions';
import { useMusicConfig } from '@/hooks/useMusicConfig';
import { MUSIC_KINDS } from '@/lib/musicConfig';
import { cn } from '@/lib/utils';
import type { MusicRelease } from '@/types/music';
import type { Event } from 'nostr-tools';

interface GlassReleaseCardProps {
  release: MusicRelease;
  className?: string;
  layout?: 'vertical' | 'horizontal'; // Add layout option
}

export function GlassReleaseCard({ release, className, layout = 'vertical' }: GlassReleaseCardProps) {
  const trackPlayback = useUniversalTrackPlayback(release);
  const { prefetchRelease } = useReleasePrefetch();
  const musicConfig = useMusicConfig();

  // Create NostrEvent for social interactions - only if we have required data
  const releaseEvent: Event | null = release.eventId && release.artistPubkey ? {
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
    content: release.description || '',
    sig: ''
  } : null;

  // Use release interactions hook
  const {
    hasUserLiked,
    handleLike,
    handleShare
  } = useReleaseInteractions({ 
    release: release, 
    event: releaseEvent, 
    commentEvent: releaseEvent 
  });

  const formatDuration = (seconds?: number): string => {
    if (!seconds) return '';

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  // Get first track for explicit badge
  const firstTrack = release.tracks?.[0];
  
  // Calculate total duration from all tracks
  const totalDuration = release.tracks?.reduce((sum, track) => sum + (track.duration || 0), 0) || 0;

  // Generate release URL
  const releaseId = release.eventId || release.id;
  const releaseUrl = `/releases/${releaseId}`;

  const handleMouseEnter = () => {
    // Prefetch release data when hovering for instant navigation
    prefetchRelease(release);
  };

  const handlePlayClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    trackPlayback.handleReleasePlay();
  };

  return (
    <div 
      className={cn(
        "group relative overflow-hidden rounded-2xl bg-card/40 border border-border/60 backdrop-blur-xl hover:bg-card/50 hover:border-border/80 transition-all duration-300 shadow-lg hover:shadow-xl",
        layout === 'horizontal' && "flex flex-row",
        className
      )}
      onMouseEnter={handleMouseEnter}
    >
      {/* Cover Image */}
      <Link 
        to={releaseUrl} 
        className={cn(
          "block relative overflow-hidden",
          layout === 'horizontal' ? "w-24 h-24 flex-shrink-0 rounded-l-2xl" : "aspect-square rounded-t-2xl"
        )}
      >
        {release.imageUrl ? (
          <img
            src={release.imageUrl}
            alt={release.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full bg-muted/50 flex items-center justify-center">
            <Music className="w-16 h-16 text-muted-foreground/50" />
          </div>
        )}
        
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        {/* Play button overlay */}
        {trackPlayback?.hasPlayableTracks && (
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <Button
              size="lg"
              onClick={handlePlayClick}
              disabled={trackPlayback?.isReleaseLoading}
              className="rounded-full w-16 h-16 p-0 bg-white/90 hover:bg-white text-black border-0 shadow-lg backdrop-blur-sm"
            >
              {trackPlayback?.isReleaseLoading ? (
                <div className="w-6 h-6 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              ) : trackPlayback?.isReleasePlaying ? (
                <Pause className="w-8 h-8" fill="currentColor" />
              ) : (
                <Play className="w-8 h-8 ml-1" fill="currentColor" />
              )}
            </Button>
          </div>
        )}

        {/* Playing Status Indicator - Top Right */}
        {trackPlayback?.isReleasePlaying && (
          <div className="absolute top-3 right-3">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/90 text-white rounded-full text-xs font-medium backdrop-blur-sm shadow-lg">
              <Volume2 className="w-3 h-3 animate-pulse" />
              <span>Playing</span>
            </div>
          </div>
        )}

        {/* Explicit Content Badge - Top Left */}
        {firstTrack?.explicit && (
          <div className="absolute top-3 left-3">
            <Badge variant="destructive" className="text-xs px-2 py-1 bg-red-500/90 text-white border-0 backdrop-blur-sm">
              E
            </Badge>
          </div>
        )}
      </Link>

      {/* Content */}
      <div className={cn(
        "flex flex-col",
        layout === 'horizontal' ? "p-3 flex-1 justify-center" : "p-4"
      )}>
        {/* Title and Artist */}
        <div className="mb-3">
          <Link 
            to={releaseUrl} 
            className="block group/title"
            onMouseEnter={handleMouseEnter}
          >
            <h3 className="font-bold text-foreground leading-tight line-clamp-2 group-hover/title:text-primary transition-colors mb-1">
              {release.title}
            </h3>
          </Link>
          <p className="text-sm text-muted-foreground font-medium">
            {musicConfig.music.artistName}
          </p>
        </div>

        {/* Stats Row */}
        {layout === 'vertical' && (
          <div className="flex items-center justify-between pt-3 border-t border-border/50">
            {/* Stats Display */}
            <div className="flex items-center gap-4">
              {release.totalSats && (
                <div className="flex items-center gap-1.5 text-xs">
                  <Zap className="w-3 h-3 text-yellow-500" />
                  <span className="text-muted-foreground font-medium">{release.totalSats.toLocaleString()}</span>
                  <span className="text-muted-foreground/70">sats</span>
                </div>
              )}
              
              {release.zapCount && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <span className="font-medium">{release.zapCount}</span>
                  <span>zaps</span>
                </div>
              )}
              
              {release.commentCount && (
                <div className="flex items-center gap-1.5 text-xs">
                  <Heart className="w-3 h-3 text-red-400" />
                  <span className="text-muted-foreground font-medium">{release.commentCount}</span>
                </div>
              )}
            </div>

            {/* Social Action Buttons */}
            <div 
              className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                // Stop propagation to prevent card navigation when clicking social buttons
                e.stopPropagation();
              }}
            >
              {/* Like Button */}
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleLike();
                }}
                className={cn(
                  "w-8 h-8 p-0 rounded-full transition-all duration-200",
                  hasUserLiked 
                    ? "text-red-500 bg-red-500/20 hover:bg-red-500/30" 
                    : "text-muted-foreground hover:text-red-500 hover:bg-red-500/20"
                )}
                title={hasUserLiked ? "Unlike this release" : "Like this release"}
              >
                <Heart className={cn(
                  "w-3.5 h-3.5 transition-all duration-200", 
                  hasUserLiked && "fill-current scale-110"
                )} />
              </Button>

              {/* Zap Button */}
              {releaseEvent ? (
                <ZapDialog target={releaseEvent}>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="w-8 h-8 p-0 rounded-full text-muted-foreground hover:text-yellow-500 hover:bg-yellow-500/20 transition-colors"
                    title="Zap this release"
                  >
                    <Zap className="w-3.5 h-3.5" />
                  </Button>
                </ZapDialog>
              ) : (
                <Button
                  size="sm"
                  variant="ghost"
                  disabled
                  className="w-8 h-8 p-0 rounded-full text-muted-foreground/50 cursor-not-allowed"
                  title="Zap not available"
                >
                  <Zap className="w-3.5 h-3.5" />
                </Button>
              )}

              {/* Share Button */}
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleShare();
                }}
                className="w-8 h-8 p-0 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/20 transition-colors"
                title="Share this release"
              >
                <Share className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}

        {/* Horizontal Layout Social Actions */}
        {layout === 'horizontal' && (
          <div className="flex items-center justify-between mt-2">
            {/* Compact Stats */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {release.totalSats && (
                <span className="flex items-center gap-1">
                  <Zap className="w-3 h-3 text-yellow-500" />
                  {release.totalSats.toLocaleString()}
                </span>
              )}
              {release.zapCount && <span>{release.zapCount} zaps</span>}
              {release.commentCount && (
                <span className="flex items-center gap-1">
                  <Heart className="w-3 h-3 text-red-400" />
                  {release.commentCount}
                </span>
              )}
            </div>

            {/* Social Actions */}
            <div 
              className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                // Stop propagation to prevent card navigation when clicking social buttons
                e.stopPropagation();
              }}
            >
              {/* Like Button */}
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleLike();
                }}
                className={cn(
                  "w-7 h-7 p-0 rounded-full transition-all duration-200",
                  hasUserLiked 
                    ? "text-red-500 bg-red-500/20 hover:bg-red-500/30 opacity-100" 
                    : "text-muted-foreground hover:text-red-500 hover:bg-red-500/20"
                )}
                title={hasUserLiked ? "Unlike this release" : "Like this release"}
              >
                <Heart className={cn(
                  "w-3 h-3 transition-all duration-200", 
                  hasUserLiked && "fill-current scale-110"
                )} />
              </Button>

              {/* Zap Button */}
              {releaseEvent ? (
                <ZapDialog target={releaseEvent}>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="w-7 h-7 p-0 rounded-full text-muted-foreground hover:text-yellow-500 hover:bg-yellow-500/20 transition-colors"
                    title="Zap this release"
                  >
                    <Zap className="w-3 h-3" />
                  </Button>
                </ZapDialog>
              ) : (
                <Button
                  size="sm"
                  variant="ghost"
                  disabled
                  className="w-7 h-7 p-0 rounded-full text-muted-foreground/50 cursor-not-allowed"
                  title="Zap not available"
                >
                  <Zap className="w-3 h-3" />
                </Button>
              )}

              {/* Share Button */}
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleShare();
                }}
                className="w-7 h-7 p-0 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/20 transition-colors"
                title="Share this release"
              >
                <Share className="w-3 h-3" />
              </Button>
            </div>
          </div>
        )}

        {/* Description - Only for vertical layout */}
        {release.description && layout === 'vertical' && (
          <div className="mt-3 pt-3 border-t border-border/50">
            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
              {release.description}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}