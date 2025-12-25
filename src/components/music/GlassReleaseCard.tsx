import { Play, Pause, Music, Zap, Heart, Volume2, Share } from 'lucide-react';
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
}

export function GlassReleaseCard({ release, className}: GlassReleaseCardProps) {
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
    <div className={cn("group", className)}>
      {/* Square Card Image */}
      <div className="relative overflow-hidden rounded-2xl bg-card/40 border border-border/60 backdrop-blur-xl hover:bg-card/50 hover:border-border/80 transition-all duration-300 shadow-lg hover:shadow-xl aspect-square">
        <Link 
          to={releaseUrl} 
          className="block relative w-full h-full"
          onMouseEnter={handleMouseEnter}
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
          
          {/* Gradient overlay for better button visibility */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </Link>

        {/* Play button overlay - Center (Smaller) */}
        {trackPlayback?.hasPlayableTracks && (
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <Button
              size="default"
              onClick={handlePlayClick}
              disabled={trackPlayback?.isReleaseLoading}
              className="rounded-full w-12 h-12 p-0 bg-white/90 hover:bg-white text-black border-0 shadow-lg backdrop-blur-sm"
            >
              {trackPlayback?.isReleaseLoading ? (
                <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              ) : trackPlayback?.isReleasePlaying ? (
                <Pause className="w-6 h-6" fill="currentColor" />
              ) : (
                <Play className="w-6 h-6 ml-0.5" fill="currentColor" />
              )}
            </Button>
          </div>
        )}

        {/* Social Actions - Bottom Right Corner (Horizontal Row) */}
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
            className="w-8 h-8 p-0 rounded-full bg-black/40 backdrop-blur-md border border-white/20 text-white/90 hover:scale-105 transition-transform duration-200"
            title={hasUserLiked ? "Unlike this release" : "Like this release"}
          >
            <Heart className={cn(
              "w-3.5 h-3.5 transition-all duration-200", 
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
            className="w-8 h-8 p-0 rounded-full bg-black/40 backdrop-blur-md border border-white/20 text-white/90 hover:scale-105 transition-transform duration-200"
            title="Share this release"
          >
            <Share className="w-3.5 h-3.5" />
          </Button>

          {/* Zap Button */}
          {releaseEvent ? (
            <ZapDialog target={releaseEvent}>
              <Button
                size="sm"
                variant="ghost"
                className="w-8 h-8 p-0 rounded-full bg-black/40 backdrop-blur-md border border-white/20 text-white/90 hover:scale-105 transition-transform duration-200"
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
              className="w-8 h-8 p-0 rounded-full bg-black/20 backdrop-blur-md border border-white/10 text-white/40 cursor-not-allowed"
              title="Zap not available"
            >
              <Zap className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>

        {/* Playing Status Indicator - Top Left */}
        {trackPlayback?.isReleasePlaying && (
          <div className="absolute top-3 left-3">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/90 text-white rounded-full text-xs font-medium backdrop-blur-sm shadow-lg">
              <Volume2 className="w-3 h-3 animate-pulse" />
              <span>Playing</span>
            </div>
          </div>
        )}

        {/* Explicit Content Badge - Top Left (when not playing) */}
        {firstTrack?.explicit && !trackPlayback?.isReleasePlaying && (
          <div className="absolute top-3 left-3">
            <Badge variant="destructive" className="text-xs px-2 py-1 bg-red-500/90 text-white border-0 backdrop-blur-sm">
              E
            </Badge>
          </div>
        )}
      </div>

      {/* Footnote - No Background, Clean Text */}
      <div className="mt-3 space-y-1">
        <Link 
          to={releaseUrl} 
          className="block group/title"
          onMouseEnter={handleMouseEnter}
        >
          <h3 className="font-bold text-foreground leading-tight line-clamp-2 group-hover/title:text-primary transition-colors text-sm">
            {release.title}
          </h3>
        </Link>
        <p className="text-xs text-muted-foreground font-medium">
          {displayArtistName}
        </p>
      </div>
    </div>
  );
}