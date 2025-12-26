import type { MusicTrackData } from '@/types/music';

/**
 * Trending calculation utilities for the trending tracks feature
 * Implements the trending algorithm as specified in requirements 2.1-2.3
 */

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
  const zapAmountScore = Math.log(zapAmount + 1) * 0.6;
  const zapCountScore = Math.log(zapCount + 1) * 0.25;
  const recencyWeightedScore = recencyScore * 0.15;

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
  
  // Score decreases linearly over 7 days, then becomes 0
  return Math.max(0, (7 - daysSincePublish) / 7);
}

/**
 * Apply artist diversity filter to ensure no artist has more than maxPerArtist tracks
 * Requirement: 3.4 (limit to maximum 2 tracks per artist)
 */
export function applyDiversityFilter<T extends { track: MusicTrackData; trendingScore: number }>(
  tracks: T[], 
  maxPerArtist: number = 2
): T[] {
  const artistTrackCount = new Map<string, number>();
  const filteredTracks: T[] = [];

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
export function sortByTrendingScore<T extends { 
  track: MusicTrackData; 
  trendingScore: number; 
  zapCount: number; 
  totalSats: number; 
}>(tracks: T[]): T[] {
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
export function excludeTracks<T extends { track: MusicTrackData }>(
  tracks: T[], 
  excludeTrackIds: string[]
): T[] {
  if (!excludeTrackIds || excludeTrackIds.length === 0) {
    return tracks;
  }

  return tracks.filter(
    result => !excludeTrackIds.includes(result.track.eventId || '')
  );
}