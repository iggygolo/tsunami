import { useQuery } from '@tanstack/react-query';
import { useMusicTracksWithStats } from './useMusicTracks';
import { 
  calculateTrendingScore, 
  applyDiversityFilter, 
  sortByTrendingScore, 
  excludeTracks 
} from '@/lib/trendingUtils';
import type { MusicTrackData } from '@/types/music';

/**
 * Interface for trending track results with calculated scores
 */
export interface TrendingTrackResult {
  track: MusicTrackData;
  trendingScore: number;
  zapCount: number;
  totalSats: number;
  recencyScore: number;
}

/**
 * Options for trending tracks hook
 */
export interface TrendingTracksOptions {
  limit?: number;
  excludeTrackIds?: string[]; // Exclude hero release tracks
  timeWindow?: number; // Days to consider for trending (default: 7)
}

/**
 * Calculate recency score based on publication date
 * Returns 0-1 where 1 is most recent (within 7 days)
 */
function getRecencyScore(createdAt?: Date): number {
  if (!createdAt) return 0;

  const now = new Date();
  const daysSincePublish = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
  
  // Score decreases linearly over 7 days, then becomes 0
  return Math.max(0, (7 - daysSincePublish) / 7);
}

/**
 * Hook to fetch trending tracks with calculated scores and filtering
 */
export function useTrendingTracks(options: TrendingTracksOptions = {}) {
  const { data: tracksWithStats, isLoading: isLoadingTracks, error: tracksError } = useMusicTracksWithStats();

  const trendingQuery = useQuery({
    queryKey: ['trending-tracks', options, tracksWithStats?.length],
    queryFn: async () => {
      if (!tracksWithStats || tracksWithStats.length === 0) {
        return [];
      }

      // Calculate trending scores for all tracks
      const tracksWithScores: TrendingTrackResult[] = tracksWithStats.map(track => ({
        track,
        trendingScore: calculateTrendingScore(track),
        zapCount: track.zapCount || 0,
        totalSats: track.totalSats || 0,
        recencyScore: getRecencyScore(track.createdAt)
      }));

      // Filter out excluded tracks (e.g., from hero release)
      const filteredTracks = excludeTracks(tracksWithScores, options.excludeTrackIds || []);

      // Apply artist diversity filter (max 2 tracks per artist)
      const diverseTracks = applyDiversityFilter(filteredTracks, 2);

      // Sort by trending score (highest first) or by date if no engagement
      const sortedTracks = sortByTrendingScore(diverseTracks);

      // Apply limit
      const limit = options.limit || 8;
      return sortedTracks.slice(0, limit);
    },
    enabled: !!tracksWithStats && tracksWithStats.length > 0,
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