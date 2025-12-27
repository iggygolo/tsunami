import type { MusicTrackData } from '@/types/music';

/**
 * Shared trending algorithm for both static generation and live components
 * Ensures consistency between cached and live data
 */

export interface TrendingTrackResult {
  track: MusicTrackData;
  trendingScore: number;
  zapCount: number;
  totalSats: number;
  recencyScore: number;
}

/**
 * Default configuration for trending algorithm
 */
export const TRENDING_CONFIG = {
  DEFAULT_LIMIT: 12,
  MAX_PER_ARTIST: 2,
  RECENCY_WINDOW_DAYS: 7,
  WEIGHTS: {
    ZAP_AMOUNT: 0.6,
    ZAP_COUNT: 0.25,
    RECENCY: 0.15
  }
} as const;

/**
 * Calculate trending score based on engagement and recency
 * Requirements: 2.1 (60% zap amounts), 2.2 (25% zap count), 2.3 (15% recency)
 */
export function calculateTrendingScore(track: MusicTrackData): number {
  const zapAmount = track.totalSats || 0;
  const zapCount = track.zapCount || 0;
  const createdAt = track.createdAt;

  // Calculate recency score (0-1, where 1 is most recent)
  const recencyScore = getRecencyScore(createdAt);

  // Apply weights: 60% zap amounts, 25% zap count, 15% recency
  // Use logarithmic scaling for zap metrics to prevent extreme values from dominating
  const zapAmountScore = Math.log(zapAmount + 1) * TRENDING_CONFIG.WEIGHTS.ZAP_AMOUNT;
  const zapCountScore = Math.log(zapCount + 1) * TRENDING_CONFIG.WEIGHTS.ZAP_COUNT;
  const recencyWeightedScore = recencyScore * TRENDING_CONFIG.WEIGHTS.RECENCY;

  return zapAmountScore + zapCountScore + recencyWeightedScore;
}

/**
 * Calculate recency score based on publication date
 * Returns 0-1 where 1 is most recent (within 7 days)
 */
export function getRecencyScore(createdAt?: Date): number {
  if (!createdAt) return 0;

  const now = new Date();
  const daysSincePublish = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
  
  // Score decreases linearly over configured window, then becomes 0
  return Math.max(0, (TRENDING_CONFIG.RECENCY_WINDOW_DAYS - daysSincePublish) / TRENDING_CONFIG.RECENCY_WINDOW_DAYS);
}

/**
 * Apply artist diversity filter to ensure no artist has more than maxPerArtist tracks
 * Requirement: 3.4 (limit to maximum 2 tracks per artist)
 */
export function applyDiversityFilter(
  tracks: TrendingTrackResult[], 
  maxPerArtist: number = TRENDING_CONFIG.MAX_PER_ARTIST
): TrendingTrackResult[] {
  const artistTrackCount = new Map<string, number>();
  const filteredTracks: TrendingTrackResult[] = [];

  // Sort by trending score first to prioritize best tracks
  const sortedTracks = [...tracks].sort((a, b) => b.trendingScore - a.trendingScore);

  for (const trackResult of sortedTracks) {
    const artistPubkey = trackResult.track.artistPubkey || '';
    const currentCount = artistTrackCount.get(artistPubkey) || 0;

    if (currentCount < maxPerArtist) {
      filteredTracks.push(trackResult);
      artistTrackCount.set(artistPubkey, currentCount + 1);
    }
  }

  return filteredTracks;
}

/**
 * Sort tracks by trending score or fallback to date sorting
 * Requirement: 2.5 (fallback to publication date when no zaps)
 */
export function sortByTrendingScore(tracks: TrendingTrackResult[]): TrendingTrackResult[] {
  return [...tracks].sort((a, b) => {
    // If both have no engagement, sort by date (newest first)
    if (a.zapCount === 0 && a.totalSats === 0 && b.zapCount === 0 && b.totalSats === 0) {
      const aTime = a.track.createdAt?.getTime() || 0;
      const bTime = b.track.createdAt?.getTime() || 0;
      return bTime - aTime; // Newest first
    }

    // Otherwise sort by trending score (highest first)
    return b.trendingScore - a.trendingScore;
  });
}

/**
 * Filter out tracks that are already featured elsewhere (e.g., hero release)
 * Requirement: 3.5 (exclude tracks from latest release hero section)
 */
export function excludeTracks(
  tracks: TrendingTrackResult[], 
  excludeTrackIds: string[]
): TrendingTrackResult[] {
  if (!excludeTrackIds || excludeTrackIds.length === 0) {
    return tracks;
  }

  return tracks.filter(
    result => !excludeTrackIds.includes(result.track.eventId || '')
  );
}

/**
 * Complete trending tracks algorithm - processes tracks and returns sorted results
 * This is the canonical implementation used by both static generation and live components
 */
export function processTrendingTracks(
  tracks: MusicTrackData[],
  options: {
    limit?: number;
    excludeTrackIds?: string[];
    maxPerArtist?: number;
  } = {}
): TrendingTrackResult[] {
  const {
    limit = TRENDING_CONFIG.DEFAULT_LIMIT,
    excludeTrackIds = [],
    maxPerArtist = TRENDING_CONFIG.MAX_PER_ARTIST
  } = options;

  // Calculate trending scores for all tracks
  const tracksWithScores: TrendingTrackResult[] = tracks.map(track => ({
    track,
    trendingScore: calculateTrendingScore(track),
    zapCount: track.zapCount || 0,
    totalSats: track.totalSats || 0,
    recencyScore: getRecencyScore(track.createdAt)
  }));

  // Filter out excluded tracks (e.g., from hero release)
  const filteredTracks = excludeTracks(tracksWithScores, excludeTrackIds);

  // Apply artist diversity filter
  const diverseTracks = applyDiversityFilter(filteredTracks, maxPerArtist);

  // Sort by trending score (highest first) or by date if no engagement
  const sortedTracks = sortByTrendingScore(diverseTracks);

  // Apply limit
  return sortedTracks.slice(0, limit);
}