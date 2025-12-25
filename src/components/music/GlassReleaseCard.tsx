import { formatDistanceToNow } from 'date-fns';
import { Play, Pause, Music, Clock, Calendar, Zap, Heart, Volume2, Share } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { ZapDialog } from '@/components/ZapDialog';
import { useUniversalTrackPlayback } from '@/hooks/useUniversalTrackPlayback';
import { useReleasePrefetch } from '@/hooks/useReleasePrefetch';
import { useReleaseInteractions } from '@/hooks/useReleaseInteractions';
import { useAuthor } from '@/hooks/useAuthor';
import { useMusicConfig } from '@/hooks/useMusicConfig';
import { genUserName } from '@/lib/genUserName';
import { MUSIC_KINDS, getArtistPubkeyHex } from '@/lib/musicConfig';
import { cn } from '@/lib/utils';
import type { MusicRelease } from '@/types/music';
import type { Event } from 'nostr-tools';

interface GlassReleaseCardProps {
  release: MusicRelease;
  className?: string;
  layout?: 'vertical' | 'horizontal'; // Add layout option
  size?: 'default' | 'compact'; // Add size option
}

export function GlassReleaseCard({ release, className, layout = 'vertical', size = 'compact' }: GlassReleaseCardProps) {
  const trackPlayback = useUniversalTrackPlayback(release);
  const { prefetchRelease } = useReleasePrefetch();
  const musicConfig = useMusicConfig();
  
  // Resolve artist name from pubkey
  const { data: artistData } = useAuthor(release.artistPubkey);
  const artistName = artistData?.metadata?.name || genUserName(release.artistPubkey);
  
  // Fallback to config artist name if this is the configured artist
  const configArtistPubkey = getArtistPubkeyHex();
  const displayArtistName = release.artistPubkey === configArtistPubkey 
    ? musicConfig.music.artistName 
    : artistName;

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

  // Get first track for explicit badge
  const firstTrack = release.tracks?.[0];

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
        size === 'compact' && "rounded-xl", // Smaller border radius for compact
        className
      )}
      onMouseEnter={handleMouseEnter}
    >
      {/* Cover Image */}
        <Link 
        to={releaseUrl} 
        className={cn(
          "block relative overflow-hidden",
          layout === 'horizontal' ? "w-24 h-24 flex-shrink-0 rounded-l-2xl" : "aspect-square rounded-t-2xl",
          size === 'compact' && layout !== 'horizontal' && "rounded-t-xl" // Smaller radius for compact vertical
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
              size={size === 'compact' ? 'default' : 'lg'}
              onClick={handlePlayClick}
              disabled={trackPlayback?.isReleaseLoading}
              className={cn(
                "rounded-full p-0 bg-white/90 hover:bg-white text-black border-0 shadow-lg backdrop-blur-sm",
                size === 'compact' ? "w-12 h-12" : "w-16 h-16"
              )}
            >
              {trackPlayback?.isReleaseLoading ? (
                <div className={cn(
                  "border-2 border-black/30 border-t-black rounded-full animate-spin",
                  size === 'compact' ? "w-4 h-4" : "w-6 h-6"
                )} />
              ) : trackPlayback?.isReleasePlaying ? (
                <Pause className={cn(size === 'compact' ? "w-6 h-6" : "w-8 h-8")} fill="currentColor" />
              ) : (
                <Play className={cn(size === 'compact' ? "w-6 h-6 ml-0.5" : "w-8 h-8 ml-1")} fill="currentColor" />
              )}
            </Button>
          </div>
        )}

        {/* Social Actions Overlay - Always visible on card image */}
        <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2">
          <div className="flex items-center gap-3 px-4 py-2 bg-black/50 backdrop-blur-md rounded-full">
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
                "w-8 h-8 p-0 rounded-full transition-all duration-200 hover:scale-110",
                hasUserLiked 
                  ? "text-red-500" 
                  : "text-white/80 hover:text-red-500"
              )}
              title={hasUserLiked ? "Unlike this release" : "Like this release"}
            >
              <Heart className={cn(
                "w-4 h-4 transition-all duration-200", 
                hasUserLiked && "fill-current"
              )} />
            </Button>

            {/* Share Button */}
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleShare();
              }}
              className="w-8 h-8 p-0 rounded-full text-white/80 hover:text-white hover:scale-110 transition-all duration-200"
              title="Share this release"
            >
              <Share className="w-4 h-4" />
            </Button>

            {/* Zap Button */}
            {releaseEvent ? (
              <ZapDialog target={releaseEvent}>
                <Button
                  size="sm"
                  variant="ghost"
                  className="w-8 h-8 p-0 rounded-full text-white/80 hover:text-yellow-400 hover:scale-110 transition-all duration-200"
                  title="Zap this release"
                >
                  <Zap className="w-4 h-4" />
                </Button>
              </ZapDialog>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                disabled
                className="w-8 h-8 p-0 rounded-full text-white/40 cursor-not-allowed"
                title="Zap not available"
              >
                <Zap className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Playing Status Indicator - Top Right */}
        {trackPlayback?.isReleasePlaying && (
          <div className={cn(
            "absolute top-2 right-2",
            size === 'compact' && "top-1.5 right-1.5"
          )}>
            <div className={cn(
              "flex items-center gap-2 bg-primary/90 text-white rounded-full font-medium backdrop-blur-sm shadow-lg",
              size === 'compact' ? "px-2 py-1 text-xs" : "px-3 py-1.5 text-xs"
            )}>
              <Volume2 className={cn(
                "animate-pulse",
                size === 'compact' ? "w-2.5 h-2.5" : "w-3 h-3"
              )} />
              <span>Playing</span>
            </div>
          </div>
        )}

        {/* Explicit Content Badge - Top Left */}
        {firstTrack?.explicit && (
          <div className={cn(
            "absolute top-2 left-2",
            size === 'compact' && "top-1.5 left-1.5"
          )}>
            <Badge variant="destructive" className={cn(
              "bg-red-500/90 text-white border-0 backdrop-blur-sm",
              size === 'compact' ? "text-xs px-1.5 py-0.5" : "text-xs px-2 py-1"
            )}>
              E
            </Badge>
          </div>
        )}
      </Link>

      {/* Content */}
      <div className={cn(
        "flex flex-col",
        layout === 'horizontal' ? "p-3 flex-1 justify-center" : size === 'compact' ? "p-2" : "p-4"
      )}>
        {/* Title and Artist */}
        <div className={cn(
          size === 'compact' ? "mb-2" : "mb-3"
        )}>
          <Link 
            to={releaseUrl} 
            className="block group/title"
            onMouseEnter={handleMouseEnter}
          >
            <h3 className={cn(
              "font-bold text-foreground leading-tight line-clamp-2 group-hover/title:text-primary transition-colors mb-1",
              size === 'compact' ? "text-sm" : "text-base"
            )}>
              {release.title}
            </h3>
          </Link>
          <p className={cn(
            "text-muted-foreground font-medium",
            size === 'compact' ? "text-xs" : "text-sm"
          )}>
            {displayArtistName}
          </p>
          
          {/* Track count and stats */}
          <div className="flex items-center justify-between mt-1">
            {/* Track count */}
            {release.tracks && release.tracks.length > 0 && (
              <p className="text-xs text-muted-foreground/70">
                {release.tracks.length} track{release.tracks.length !== 1 ? 's' : ''}
              </p>
            )}
            
            {/* Stats */}
            <div className="flex items-center gap-2">
              {release.totalSats && (
                <div className="flex items-center gap-1 text-xs">
                  <Zap className="w-3 h-3 text-yellow-500" />
                  <span className="text-muted-foreground font-medium">{release.totalSats.toLocaleString()}</span>
                </div>
              )}
              
              {release.zapCount && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <span className="font-medium">{release.zapCount}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Stats Row */}
        {layout === 'vertical' && size !== 'compact' && (
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

        {/* Description - Only for vertical layout and non-compact size */}
        {release.description && layout === 'vertical' && size !== 'compact' && (
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