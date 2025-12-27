import { Music } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { UnifiedMusicCard } from '@/components/music/UnifiedMusicCard';
import { useTrendingTracks } from '@/hooks/useTrendingTracks';
import { useStaticTrendingTracksCache } from '@/hooks/useStaticTrendingTracksCache';
import { useUniversalAudioPlayer, musicTrackToUniversal } from '@/contexts/UniversalAudioPlayerContext';
import { TRENDING_CONFIG } from '@/lib/trendingAlgorithm';
import { cn } from '@/lib/utils';

interface TrendingTracksSectionProps {
  limit?: number;
  excludeTrackIds?: string[];
  className?: string;
  useCache?: boolean; // Enable cache usage for better performance
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
                  <UnifiedMusicCard
                    content={trendingTrack.track}
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
                  <UnifiedMusicCard
                    content={trendingTrack.track}
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
                  <UnifiedMusicCard
                    content={trendingTrack.track}
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