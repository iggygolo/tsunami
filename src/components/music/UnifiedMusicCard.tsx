import { Play, Pause, Music, Zap, Heart, Volume2, Share } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { ZapDialog } from '@/components/ZapDialog';
import { ArtistLinkCompact } from '@/components/music/ArtistLink';
import { useUniversalTrackPlayback } from '@/hooks/useUniversalTrackPlayback';
import { useReleasePrefetch } from '@/hooks/useReleasePrefetch';
import { useReleaseInteractions } from '@/hooks/useReleaseInteractions';
import { useTrackInteractions } from '@/hooks/useTrackInteractions';
import { generateReleaseLink, generateTrackLink } from '@/lib/nip19Utils';
import { MUSIC_KINDS } from '@/lib/musicConfig';
import { cn } from '@/lib/utils';
import type { MusicRelease, MusicTrackData } from '@/types/music';
import type { Event } from 'nostr-tools';
import type { NostrEvent } from '@nostrify/nostrify';

interface UnifiedMusicCardProps {
  // Content (discriminated union for type safety)
  content: MusicRelease | MusicTrackData;
  
  // Optional customization
  className?: string;
  showSocialActions?: boolean;
  
  // Performance options
  prefetchOnHover?: boolean;
  
  // Legacy props for backward compatibility
  release?: MusicRelease;
  track?: MusicTrackData;
  
  // Track-specific props for TrendingTrackCard compatibility
  isCurrentTrack?: boolean;
  isPlaying?: boolean;
  isLoading?: boolean;
  onPlay?: () => void;
}

// Type guard to detect content type
function isRelease(content: MusicRelease | MusicTrackData): content is MusicRelease {
  return 'tracks' in content;
}

// Extract display information from either content type
function getDisplayInfo(content: MusicRelease | MusicTrackData) {
  const isReleaseContent = isRelease(content);
  
  return {
    title: content.title,
    artistName: isReleaseContent ? content.artistName : content.artist,
    artistPubkey: content.artistPubkey || '',
    imageUrl: content.imageUrl,
    isExplicit: isReleaseContent 
      ? content.tracks?.some(track => track.explicit) || false
      : content.explicit || false,
    hasAudio: isReleaseContent
      ? content.tracks?.some(track => track.audioUrl) || false
      : !!content.audioUrl,
    navigationUrl: isReleaseContent
      ? generateReleaseLink(content.artistPubkey, content.identifier)
      : generateTrackLink(content.artistPubkey || '', content.identifier),
    eventId: content.eventId,
    identifier: content.identifier,
    createdAt: content.createdAt
  };
}

// Create Nostr event for social interactions
function createNostrEvent(content: MusicRelease | MusicTrackData): Event | NostrEvent | null {
  const displayInfo = getDisplayInfo(content);
  
  if (!displayInfo.eventId || !displayInfo.artistPubkey) {
    return null;
  }
  
  const isReleaseContent = isRelease(content);
  
  if (isReleaseContent) {
    // Create Event for releases (compatible with useReleaseInteractions)
    return {
      id: displayInfo.eventId,
      pubkey: displayInfo.artistPubkey,
      created_at: Math.floor((displayInfo.createdAt?.getTime() || Date.now()) / 1000),
      kind: MUSIC_KINDS.MUSIC_PLAYLIST,
      tags: [
        ['d', displayInfo.identifier || displayInfo.eventId],
        ['title', content.title],
        ...(content.description ? [['description', content.description]] : []),
        ...(content.imageUrl ? [['image', content.imageUrl]] : []),
        ...(isReleaseContent && content.tags ? content.tags.map(tag => ['t', tag]) : [])
      ],
      content: content.description || '',
      sig: ''
    } as Event;
  } else {
    // Create NostrEvent for tracks (compatible with useTrackInteractions)
    return {
      id: displayInfo.eventId,
      pubkey: displayInfo.artistPubkey,
      created_at: Math.floor((displayInfo.createdAt?.getTime() || Date.now()) / 1000),
      kind: MUSIC_KINDS.MUSIC_TRACK,
      tags: [
        ['d', displayInfo.identifier],
        ['title', content.title],
        ...(content.artist ? [['artist', content.artist]] : []),
        ...(content.audioUrl ? [['audio', content.audioUrl]] : []),
        ...(content.imageUrl ? [['image', content.imageUrl]] : []),
      ],
      content: '',
      sig: ''
    } as NostrEvent;
  }
}

export function UnifiedMusicCard({
  content: propContent,
  className,
  showSocialActions = true,
  prefetchOnHover = true,
  // Legacy props
  release,
  track,
  // Track-specific props
  isCurrentTrack = false,
  isPlaying = false,
  isLoading = false,
  onPlay
}: UnifiedMusicCardProps) {
  // Handle legacy props - prioritize explicit release/track props over content
  const content = release || track || propContent;
  
  if (!content) {
    console.error('UnifiedMusicCard: No content provided');
    return null;
  }
  
  const displayInfo = getDisplayInfo(content);
  const isReleaseContent = isRelease(content);
  const nostrEvent = createNostrEvent(content);
  
  // Playback integration
  const releasePlayback = isReleaseContent ? useUniversalTrackPlayback(content) : null;
  const { prefetchRelease } = useReleasePrefetch();
  
  // Social interactions
  const releaseInteractions = isReleaseContent && nostrEvent ? useReleaseInteractions({
    release: content,
    event: nostrEvent as Event,
    commentEvent: nostrEvent as Event
  }) : null;
  
  const trackInteractions = !isReleaseContent && nostrEvent ? useTrackInteractions({
    track: content,
    event: nostrEvent as NostrEvent
  }) : null;
  
  // Unified interaction handlers
  const hasUserLiked = releaseInteractions?.hasUserLiked || trackInteractions?.hasUserLiked || false;
  const handleLike = releaseInteractions?.handleLike || trackInteractions?.handleLike || (() => {});
  const handleShare = releaseInteractions?.handleShare || trackInteractions?.handleShare || (() => {});
  
  // Playback state
  const isCurrentlyPlaying = isReleaseContent 
    ? releasePlayback?.isReleasePlaying || false
    : isCurrentTrack && isPlaying;
  const isCurrentlyLoading = isReleaseContent 
    ? releasePlayback?.isReleaseLoading || false
    : isLoading;
  const canPlay = displayInfo.hasAudio;
  
  // Event handlers
  const handleMouseEnter = () => {
    if (prefetchOnHover && isReleaseContent) {
      prefetchRelease(content);
    }
  };
  
  const handlePlayClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isReleaseContent && releasePlayback) {
      releasePlayback.handleReleasePlay();
    } else if (onPlay) {
      onPlay();
    }
  };
  
  return (
    <div className={cn("group", className)}>
      {/* Square Card Image */}
      <div className="relative overflow-hidden rounded-2xl bg-card/40 border border-border/60 backdrop-blur-xl hover:bg-card/50 hover:border-border/80 transition-all duration-300 shadow-lg hover:shadow-xl aspect-square">
        <Link 
          to={displayInfo.navigationUrl} 
          className="block relative w-full h-full"
          onMouseEnter={handleMouseEnter}
        >
          {displayInfo.imageUrl ? (
            <img
              src={displayInfo.imageUrl}
              alt={displayInfo.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full bg-muted/50 flex items-center justify-center">
              <Music className="w-16 h-16 text-muted-foreground/50" />
            </div>
          )}
          
          {/* Gradient overlay for better button visibility */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </Link>

        {/* Play button overlay - Center */}
        {canPlay ? (
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <Button
              size="default"
              onClick={handlePlayClick}
              disabled={isCurrentlyLoading}
              className="rounded-full w-12 h-12 p-0 bg-white/90 hover:bg-white text-black border-0 shadow-lg backdrop-blur-sm"
            >
              {isCurrentlyLoading ? (
                <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              ) : isCurrentlyPlaying ? (
                <Pause className="w-6 h-6" fill="currentColor" />
              ) : (
                <Play className="w-6 h-6 ml-0.5" fill="currentColor" />
              )}
            </Button>
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="px-3 py-1.5 bg-black/80 text-white/90 rounded-full text-xs font-medium backdrop-blur-sm">
              No Audio Available
            </div>
          </div>
        )}

        {/* Social Actions - Bottom Right Corner */}
        {showSocialActions && (
          <div className="absolute bottom-3 right-3 flex flex-row gap-2 opacity-80 group-hover:opacity-100 transition-opacity duration-200">
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
                "w-8 h-8 p-0 rounded-full backdrop-blur-xl transition-all duration-200 shadow-lg",
                hasUserLiked
                  ? "text-red-500 bg-red-500/10 border border-red-400/30 hover:bg-red-500/20 hover:border-red-400/40"
                  : "bg-black/30 border border-white/20 text-white hover:bg-red-500/20 hover:border-red-400/40 hover:text-red-300"
              )}
              title={hasUserLiked ? `Unlike this ${isReleaseContent ? 'release' : 'track'}` : `Like this ${isReleaseContent ? 'release' : 'track'}`}
            >
              <Heart className={cn("w-3.5 h-3.5", hasUserLiked && "fill-current")} />
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
              className="w-8 h-8 p-0 rounded-full bg-black/30 border border-white/20 text-white hover:bg-cyan-500/20 hover:border-cyan-400/40 hover:text-cyan-300 backdrop-blur-xl transition-all duration-200 shadow-lg"
              title={`Share this ${isReleaseContent ? 'release' : 'track'}`}
            >
              <Share className="w-3.5 h-3.5" />
            </Button>

            {/* Zap Button */}
            {nostrEvent ? (
              <ZapDialog target={nostrEvent}>
                <Button
                  size="sm"
                  variant="ghost"
                  className="w-8 h-8 p-0 rounded-full bg-black/30 border border-white/20 text-white hover:bg-yellow-500/20 hover:border-yellow-400/40 hover:text-yellow-300 backdrop-blur-xl transition-all duration-200 shadow-lg"
                  title={`Zap this ${isReleaseContent ? 'release' : 'track'}`}
                >
                  <Zap className="w-3.5 h-3.5" />
                </Button>
              </ZapDialog>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                disabled
                className="w-8 h-8 p-0 rounded-full bg-black/20 backdrop-blur-md border border-white/10 text-white/40 cursor-not-allowed"
                title="Zap not available"
              >
                <Zap className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        )}

        {/* Playing Status Indicator - Top Left */}
        {isCurrentlyPlaying && (
          <div className="absolute top-3 left-3">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white/90 text-black rounded-full text-xs font-medium backdrop-blur-sm shadow-lg">
              <Volume2 className="w-3 h-3 animate-pulse" />
              <span>Playing</span>
            </div>
          </div>
        )}

        {/* Explicit Content Badge - Top Left (when not playing) */}
        {displayInfo.isExplicit && !isCurrentlyPlaying && (
          <div className="absolute top-3 left-3">
            <Badge variant="destructive" className="text-xs px-2 py-1 bg-red-500/90 text-white border-0 backdrop-blur-sm">
              E
            </Badge>
          </div>
        )}
      </div>

      {/* Content Info */}
      <div className="mt-3 space-y-1">
        <Link 
          to={displayInfo.navigationUrl} 
          className="block group/title"
          onMouseEnter={handleMouseEnter}
        >
          <h3 className="font-bold text-foreground leading-tight line-clamp-2 group-hover/title:text-primary transition-colors text-sm">
            {displayInfo.title}
          </h3>
        </Link>
        
        {/* Artist Attribution */}
        {displayInfo.artistPubkey ? (
          <ArtistLinkCompact 
            pubkey={displayInfo.artistPubkey}
            className="text-xs font-medium"
          />
        ) : displayInfo.artistName ? (
          <p className="text-xs text-muted-foreground font-medium">
            {displayInfo.artistName}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground font-medium">
            Unknown Artist
          </p>
        )}
      </div>
    </div>
  );
}