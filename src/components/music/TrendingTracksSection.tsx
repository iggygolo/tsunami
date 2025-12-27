import { ChevronRight, Music, Play, Pause, Heart, Share, Zap, Volume2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ZapDialog } from '@/components/ZapDialog';
import { useTrendingTracks } from '@/hooks/useTrendingTracks';
import { useStaticTrendingTracksCache } from '@/hooks/useStaticTrendingTracksCache';
import { useTrackInteractions } from '@/hooks/useTrackInteractions';
import { useUniversalAudioPlayer, musicTrackToUniversal } from '@/contexts/UniversalAudioPlayerContext';
import { generateTrackLink } from '@/lib/nip19Utils';
import { MUSIC_KINDS } from '@/lib/musicConfig';
import { TRENDING_CONFIG } from '@/lib/trendingAlgorithm';
import { cn } from '@/lib/utils';
import type { NostrEvent } from '@nostrify/nostrify';

interface TrendingTracksSectionProps {
  limit?: number;
  excludeTrackIds?: string[];
  className?: string;
  useCache?: boolean; // Enable cache usage for better performance
}

interface TrendingTrackCardProps {
  track: any; // TrendingTrack type
  index: number;
  allTracks: any[]; // TrendingTrack[] type
  isCurrentTrack: boolean;
  isPlaying: boolean;
  isLoading: boolean;
  onPlay: () => void;
}

function TrendingTrackCard({ 
  track,
  isCurrentTrack, 
  isPlaying, 
  isLoading, 
  onPlay 
}: TrendingTrackCardProps) {
  const trackData = track.track;
  
  // Generate track URL using naddr format
  const trackUrl = generateTrackLink(trackData.artistPubkey, trackData.identifier);

  // Create NostrEvent for interactions
  const trackEvent: NostrEvent = {
    id: trackData.eventId || trackData.identifier,
    pubkey: trackData.artistPubkey || '',
    created_at: Math.floor(Date.now() / 1000),
    kind: MUSIC_KINDS.MUSIC_TRACK,
    tags: [
      ['d', trackData.identifier],
      ['title', trackData.title],
      ...(trackData.artist ? [['artist', trackData.artist]] : []),
      ...(trackData.audioUrl ? [['audio', trackData.audioUrl]] : []),
      ...(trackData.imageUrl ? [['image', trackData.imageUrl]] : []),
    ],
    content: '',
    sig: ''
  };

  // Use track interactions hook
  const { handleLike, handleShare, hasUserLiked } = useTrackInteractions({ 
    track: trackData, 
    event: trackEvent 
  });

  const handlePlayClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onPlay();
  };

  return (
    <div className="group">
      {/* Square Card Image */}
      <div className="relative overflow-hidden rounded-2xl bg-card/40 border border-border/60 backdrop-blur-xl hover:bg-card/50 hover:border-border/80 transition-all duration-300 shadow-lg hover:shadow-xl aspect-square">
        <Link 
          to={trackUrl} 
          className="block relative w-full h-full"
        >
          {trackData.imageUrl ? (
            <img
              src={trackData.imageUrl}
              alt={trackData.title}
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

        {/* Play button overlay - Center */}
        {trackData.audioUrl && (
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <Button
              size="default"
              onClick={handlePlayClick}
              disabled={isLoading}
              className="rounded-full w-12 h-12 p-0 bg-white/90 hover:bg-white text-black border-0 shadow-lg backdrop-blur-sm"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              ) : (isCurrentTrack && isPlaying) ? (
                <Pause className="w-6 h-6" fill="currentColor" />
              ) : (
                <Play className="w-6 h-6 ml-0.5" fill="currentColor" />
              )}
            </Button>
          </div>
        )}

        {/* No Audio Available State */}
        {!trackData.audioUrl && (
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="px-3 py-1.5 bg-black/80 text-white/90 rounded-full text-xs font-medium backdrop-blur-sm">
              No Audio Available
            </div>
          </div>
        )}

        {/* Social Actions - Bottom Right Corner */}
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
            title={hasUserLiked ? "Unlike this track" : "Like this track"}
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
            title="Share this track"
          >
            <Share className="w-3.5 h-3.5" />
          </Button>

          {/* Zap Button */}
          <ZapDialog target={trackEvent}>
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              className="w-8 h-8 p-0 rounded-full bg-black/30 border border-white/20 text-white hover:bg-yellow-500/20 hover:border-yellow-400/40 hover:text-yellow-300 backdrop-blur-xl transition-all duration-200 shadow-lg"
              title="Zap this track"
            >
              <Zap className="w-3.5 h-3.5" />
            </Button>
          </ZapDialog>
        </div>

        {/* Playing Status Indicator - Top Left */}
        {isCurrentTrack && isPlaying && (
          <div className="absolute top-3 left-3">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white/90 text-black rounded-full text-xs font-medium backdrop-blur-sm shadow-lg">
              <Volume2 className="w-3 h-3 animate-pulse" />
              <span>Playing</span>
            </div>
          </div>
        )}

        {/* Explicit Content Badge - Top Left (when not playing) */}
        {trackData.explicit && !(isCurrentTrack && isPlaying) && (
          <div className="absolute top-3 left-3">
            <Badge variant="destructive" className="text-xs px-2 py-1 bg-red-500/90 text-white border-0 backdrop-blur-sm">
              E
            </Badge>
          </div>
        )}
      </div>

      {/* Track Info */}
      <div className="mt-3 space-y-1">
        <Link 
          to={trackUrl} 
          className="block group/title"
        >
          <h3 className="font-bold text-foreground leading-tight line-clamp-2 group-hover/title:text-primary transition-colors text-sm">
            {trackData.title}
          </h3>
        </Link>
        
        <p className="text-xs text-muted-foreground font-medium">
          {trackData.artist}
        </p>
      </div>
    </div>
  );
}

export function TrendingTracksSection({ 
  limit = TRENDING_CONFIG.DEFAULT_LIMIT, // Use consistent default limit
  excludeTrackIds,
  className,
  useCache = false
}: TrendingTracksSectionProps) {
  // Use cached data when enabled
  const { data: cachedTrendingTracks, isLoading: isCacheLoading, isStale } = useStaticTrendingTracksCache({
    limit,
    excludeTrackIds
  });

  // Fallback to live data when cache is disabled or unavailable
  const { data: liveTrendingTracks, isLoading: isLiveLoading, error } = useTrendingTracks({
    limit,
    excludeTrackIds,
    enabled: !useCache || !cachedTrendingTracks
  });

  // Determine which data to use
  const trendingTracks = useCache && cachedTrendingTracks ? cachedTrendingTracks : liveTrendingTracks;
  const isLoading = useCache ? isCacheLoading : isLiveLoading;

  // Log data source for debugging
  console.log('🎵 Trending tracks data source:', {
    usingCache: useCache && !!cachedTrendingTracks,
    isStale,
    cachedCount: cachedTrendingTracks?.length || 0,
    liveCount: liveTrendingTracks?.length || 0,
    finalCount: trendingTracks?.length || 0
  });

  const { playQueue, play, pause, state } = useUniversalAudioPlayer();

  // Don't render section if no tracks and not loading - but show empty state instead
  const hasData = trendingTracks && trendingTracks.length > 0;

  // Convert trending tracks to universal format for playback
  const universalTracks = trendingTracks?.map(trendingTrack => 
    musicTrackToUniversal(trendingTrack.track, {
      type: 'playlist',
      releaseTitle: 'Trending Tracks'
    })
  ) || [];

  // Check if trending tracks queue is currently loaded
  const isTrendingQueueActive = state.queueTitle === 'Trending Tracks';

  const handleTrackPlay = (trackIndex: number) => {
    const track = universalTracks[trackIndex];
    if (!track?.audioUrl) return;

    // If clicking on the currently playing track, pause it
    if (isTrendingQueueActive && state.currentTrackIndex === trackIndex && state.isPlaying) {
      pause();
    }
    // If clicking on the current track that's paused, resume it
    else if (isTrendingQueueActive && state.currentTrackIndex === trackIndex && !state.isPlaying) {
      play();
    }
    // If clicking on a different track or no queue is loaded, play the new track
    else {
      playQueue(universalTracks, trackIndex, 'Trending Tracks');
    }
  };

  return (
    <section className={cn("space-y-6", className)}>
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold text-foreground">Trending Tracks</h2>
        </div>
        
        {/* View All Tracks Link (Requirement 8.5) */}
        <Button variant="ghost" asChild>
          <Link to="/releases" className="group text-muted-foreground hover:text-foreground">
            View All
            <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
          </Link>
        </Button>
      </div>

      {/* Content - Clear state separation */}
      {isLoading ? (
        /* Loading State - Show skeletons */
        /* Loading Skeleton - Responsive */
        <div>
          {/* Mobile skeleton */}
          <div className="block sm:hidden">
            <div className="flex gap-4 overflow-x-auto pb-2">
              {[...Array(Math.min(limit, 6))].map((_, i) => (
                <div key={i} className="flex-shrink-0 w-40 space-y-3">
                  <div className="aspect-square rounded-2xl bg-muted animate-pulse" />
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tablet skeleton */}
          <div className="hidden sm:block md:hidden">
            <div className="grid grid-cols-3 gap-4">
              {[...Array(Math.min(limit, 6))].map((_, i) => (
                <div key={i} className="space-y-3">
                  <div className="aspect-square rounded-2xl bg-muted animate-pulse" />
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Desktop skeleton */}
          <div className="hidden md:block">
            <div className="grid grid-cols-4 lg:grid-cols-6 gap-4">
              {[...Array(limit)].map((_, i) => (
                <div key={i} className="space-y-3 max-w-xs">
                  <div className="aspect-square rounded-2xl bg-muted animate-pulse" />
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : error ? (
        /* Error State */
        <div className="py-12 px-8 text-center rounded-xl bg-card/30 border border-border/50 backdrop-blur-xl">
          <div className="max-w-sm mx-auto space-y-4">
            <Music className="w-12 h-12 text-muted-foreground/50 mx-auto" />
            <div className="space-y-2">
              <h3 className="text-foreground font-semibold">Unable to Load Trending Tracks</h3>
              <p className="text-muted-foreground text-sm">
                There was an error loading trending tracks. Please try again later.
              </p>
            </div>
          </div>
        </div>
      ) : hasData ? (
        /* Tracks Grid - Responsive Layout (Requirements 6.1, 6.2, 6.3, 6.4) */
        <div className="relative">
          {/* Mobile: 2 tracks per row with horizontal scroll */}
          <div className="block sm:hidden">
            <div className="flex gap-4 overflow-x-auto pb-2" style={{ scrollbarWidth: 'thin' }}>
              {trendingTracks.map((trendingTrack, index) => (
                <div 
                  key={trendingTrack.track.eventId || trendingTrack.track.identifier} 
                  className="flex-shrink-0 w-40"
                >
                  <TrendingTrackCard
                    track={trendingTrack}
                    index={index}
                    allTracks={trendingTracks}
                    isCurrentTrack={isTrendingQueueActive && state.currentTrackIndex === index}
                    isPlaying={state.isPlaying}
                    isLoading={state.isLoading}
                    onPlay={() => handleTrackPlay(index)}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Tablet: 3-4 tracks per row */}
          <div className="hidden sm:block md:hidden">
            <div className="grid grid-cols-3 gap-4">
              {trendingTracks.slice(0, 6).map((trendingTrack, index) => (
                <div key={trendingTrack.track.eventId || trendingTrack.track.identifier}>
                  <TrendingTrackCard
                    track={trendingTrack}
                    index={index}
                    allTracks={trendingTracks}
                    isCurrentTrack={isTrendingQueueActive && state.currentTrackIndex === index}
                    isPlaying={state.isPlaying}
                    isLoading={state.isLoading}
                    onPlay={() => handleTrackPlay(index)}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Desktop: up to 6 tracks per row with max card size (Requirements 6.3, 6.4) */}
          <div className="hidden md:block">
            <div className="grid grid-cols-4 lg:grid-cols-6 gap-4 max-w-none">
              {trendingTracks.map((trendingTrack, index) => (
                <div 
                  key={trendingTrack.track.eventId || trendingTrack.track.identifier}
                  className="max-w-xs" // Maintain maximum card size for visual hierarchy
                >
                  <TrendingTrackCard
                    track={trendingTrack}
                    index={index}
                    allTracks={trendingTracks}
                    isCurrentTrack={isTrendingQueueActive && state.currentTrackIndex === index}
                    isPlaying={state.isPlaying}
                    isLoading={state.isLoading}
                    onPlay={() => handleTrackPlay(index)}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Empty State - No Trending Tracks */
        <div className="py-12 px-8 text-center rounded-xl bg-card/30 border border-border/50 backdrop-blur-xl">
          <div className="max-w-sm mx-auto space-y-4">
            <Music className="w-12 h-12 text-muted-foreground/50 mx-auto" />
            <div className="space-y-2">
              <h3 className="text-foreground font-semibold">No Trending Tracks Yet</h3>
              <p className="text-muted-foreground text-sm">
                Check back soon as artists share new music and tracks start trending.
              </p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}