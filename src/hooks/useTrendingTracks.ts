import { useQuery } from '@tanstack/react-query';
import { useMusicTracksWithStats } from './useMusicTracks';
import { 
  processTrendingTracks,
  TRENDING_CONFIG,
  type TrendingTrackResult
} from '@/lib/trendingAlgorithm';
import type { MusicTrackData } from '@/types/music';

/**
 * Options for trending tracks hook
 */
export interface TrendingTracksOptions {
  limit?: number;
  excludeTrackIds?: string[]; // Exclude hero release tracks
  timeWindow?: number; // Days to consider for trending (default: 7)
  enabled?: boolean; // Enable/disable the query
}

// Re-export the shared type for consistency
export type { TrendingTrackResult } from '@/lib/trendingAlgorithm';

/**
 * Hook to fetch trending tracks with calculated scores and filtering
 * Uses the shared trending algorithm for consistency with static generation
 */
export function useTrendingTracks(options: TrendingTracksOptions = {}) {
  const { data: tracksWithStats, isLoading: isLoadingTracks, error: tracksError } = useMusicTracksWithStats();

  const trendingQuery = useQuery({
    queryKey: ['trending-tracks', options, tracksWithStats?.length],
    queryFn: async () => {
      if (!tracksWithStats || tracksWithStats.length === 0) {
        return [];
      }

      // Use the shared trending algorithm for consistency
      return processTrendingTracks(tracksWithStats, {
        limit: options.limit || TRENDING_CONFIG.DEFAULT_LIMIT,
        excludeTrackIds: options.excludeTrackIds || [],
        maxPerArtist: TRENDING_CONFIG.MAX_PER_ARTIST
      });
    },
    enabled: (!!tracksWithStats && tracksWithStats.length > 0) && (options.enabled !== false),
    staleTime: 1000 * 60 * 10, // 10 minutes (as per requirement 5.2)
    gcTime: 1000 * 60 * 30, // 30 minutes
  });

  // Combine loading states - show loading if either query is loading
  const isLoading = isLoadingTracks || trendingQuery.isLoading;
  const error = tracksError || trendingQuery.error;

  return {
    data: trendingQuery.data,
    isLoading,
    error
  };
}