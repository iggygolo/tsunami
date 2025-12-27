import type { MusicTrackData, MusicPlaylistData } from '@/types/music';
import type { SimpleArtistInfo } from '@/lib/artistUtils';

/**
 * Shared featured artists algorithm for both static generation and live components
 * Ensures consistency between cached and live data
 */

export interface ArtistMetrics {
  pubkey: string;
  releaseCount: number;
  trackCount: number;
  totalSats: number;
  totalZaps: number;
  recentActivity: number;
  followerCount: number;
  lastReleaseDate: Date | null;
}

export interface FeaturedArtistResult {
  artist: SimpleArtistInfo;
  metrics: ArtistMetrics;
  featuredScore: number;
  releaseScore: number;
  zapScore: number;
  activityScore: number;
  followerScore: number;
}

/**
 * Default configuration for featured artists algorithm
 */
export const FEATURED_ARTISTS_CONFIG = {
  DEFAULT_LIMIT: 12,
  RECENCY_WINDOW_DAYS: 30,
  MIN_RELEASES: 1, // Minimum releases to be considered
  WEIGHTS: {
    RELEASE_COUNT: 0.4,      // 40% - number of releases and tracks
    TOTAL_ZAPS: 0.3,         // 30% - total zaps received across all content
    RECENT_ACTIVITY: 0.2,    // 20% - recent releases and activity
    FOLLOWER_COUNT: 0.1      // 10% - follower count (if available)
  }
} as const;

/**
 * Calculate metrics for an artist based on their content
 */
export function calculateArtistMetrics(
  artist: SimpleArtistInfo,
  tracks: MusicTrackData[],
  playlists: MusicPlaylistData[]
): ArtistMetrics {
  const artistTracks = tracks.filter(track => track.artistPubkey === artist.pubkey);
  const artistPlaylists = playlists.filter(playlist => playlist.authorPubkey === artist.pubkey);

  // Calculate totals
  const totalSats = artistTracks.reduce((sum, track) => sum + (track.totalSats || 0), 0);
  const totalZaps = artistTracks.reduce((sum, track) => sum + (track.zapCount || 0), 0);

  // Find most recent release
  const allDates = [
    ...artistTracks.map(t => t.createdAt).filter(Boolean),
    ...artistPlaylists.map(p => p.createdAt).filter(Boolean)
  ];
  const lastReleaseDate = allDates.length > 0 ? new Date(Math.max(...allDates.map(d => d!.getTime()))) : null;

  // Calculate recent activity (releases in last 30 days)
  const thirtyDaysAgo = new Date(Date.now() - (FEATURED_ARTISTS_CONFIG.RECENCY_WINDOW_DAYS * 24 * 60 * 60 * 1000));
  const recentReleases = artistPlaylists.filter(playlist => 
    playlist.createdAt && playlist.createdAt > thirtyDaysAgo
  ).length;
  const recentTracks = artistTracks.filter(track => 
    track.createdAt && track.createdAt > thirtyDaysAgo
  ).length;

  return {
    pubkey: artist.pubkey,
    releaseCount: artistPlaylists.length,
    trackCount: artistTracks.length,
    totalSats,
    totalZaps,
    recentActivity: recentReleases + recentTracks,
    followerCount: 0, // TODO: Implement follower counting when available
    lastReleaseDate
  };
}

/**
 * Calculate featured score based on artist metrics
 */
export function calculateFeaturedScore(metrics: ArtistMetrics): {
  featuredScore: number;
  releaseScore: number;
  zapScore: number;
  activityScore: number;
  followerScore: number;
} {
  // Release score: logarithmic scaling for releases + tracks
  const totalContent = metrics.releaseCount + (metrics.trackCount * 0.5); // Weight standalone tracks less
  const releaseScore = Math.log(totalContent + 1) * FEATURED_ARTISTS_CONFIG.WEIGHTS.RELEASE_COUNT;

  // Zap score: logarithmic scaling for total engagement
  const zapMetric = (metrics.totalSats / 1000) + metrics.totalZaps; // Normalize sats to similar scale as zap count
  const zapScore = Math.log(zapMetric + 1) * FEATURED_ARTISTS_CONFIG.WEIGHTS.TOTAL_ZAPS;

  // Activity score: recent activity with recency boost
  const activityScore = Math.log(metrics.recentActivity + 1) * FEATURED_ARTISTS_CONFIG.WEIGHTS.RECENT_ACTIVITY;

  // Follower score: placeholder for future implementation
  const followerScore = Math.log(metrics.followerCount + 1) * FEATURED_ARTISTS_CONFIG.WEIGHTS.FOLLOWER_COUNT;

  const featuredScore = releaseScore + zapScore + activityScore + followerScore;

  return {
    featuredScore,
    releaseScore,
    zapScore,
    activityScore,
    followerScore
  };
}

/**
 * Get recency boost for recent activity (0-1 multiplier)
 */
export function getRecencyBoost(lastReleaseDate: Date | null): number {
  if (!lastReleaseDate) return 0;

  const now = new Date();
  const daysSinceRelease = (now.getTime() - lastReleaseDate.getTime()) / (1000 * 60 * 60 * 24);
  
  // Boost artists with releases in last 30 days
  if (daysSinceRelease <= 7) return 1.2;      // 20% boost for last week
  if (daysSinceRelease <= 30) return 1.1;     // 10% boost for last month
  if (daysSinceRelease <= 90) return 1.0;     // No penalty for last 3 months
  
  // Gradual decay for older releases
  return Math.max(0.5, 1 - (daysSinceRelease - 90) / 365); // Decay over a year, min 50%
}

/**
 * Filter artists to ensure minimum quality threshold
 */
export function applyQualityFilter(artists: FeaturedArtistResult[]): FeaturedArtistResult[] {
  return artists.filter(result => {
    const { metrics } = result;
    
    // Must have at least minimum releases
    if (metrics.releaseCount < FEATURED_ARTISTS_CONFIG.MIN_RELEASES) {
      return false;
    }

    // Must have some engagement OR recent activity
    if (metrics.totalZaps === 0 && metrics.totalSats === 0 && metrics.recentActivity === 0) {
      return false;
    }

    return true;
  });
}

/**
 * Sort artists by featured score with recency boost
 */
export function sortByFeaturedScore(artists: FeaturedArtistResult[]): FeaturedArtistResult[] {
  return artists
    .map(result => ({
      ...result,
      // Apply recency boost to final score
      finalScore: result.featuredScore * getRecencyBoost(result.metrics.lastReleaseDate)
    }))
    .sort((a, b) => {
      // Primary sort: final score (with recency boost)
      if (b.finalScore !== a.finalScore) {
        return b.finalScore - a.finalScore;
      }
      
      // Secondary sort: most recent release date
      const aDate = a.metrics.lastReleaseDate?.getTime() || 0;
      const bDate = b.metrics.lastReleaseDate?.getTime() || 0;
      return bDate - aDate;
    });
}

/**
 * Main function to process featured artists using the shared algorithm
 */
export function processFeaturedArtists(
  artists: SimpleArtistInfo[],
  tracks: MusicTrackData[],
  playlists: MusicPlaylistData[],
  options: {
    limit?: number;
  } = {}
): FeaturedArtistResult[] {
  const { limit = FEATURED_ARTISTS_CONFIG.DEFAULT_LIMIT } = options;

  console.log('🎯 Processing featured artists:', {
    totalArtists: artists.length,
    totalTracks: tracks.length,
    totalPlaylists: playlists.length,
    limit
  });

  // Calculate metrics for each artist
  const artistResults: FeaturedArtistResult[] = artists.map(artist => {
    const metrics = calculateArtistMetrics(artist, tracks, playlists);
    const scores = calculateFeaturedScore(metrics);
    
    return {
      artist,
      metrics,
      ...scores
    };
  });

  // Apply quality filter
  const qualityFiltered = applyQualityFilter(artistResults);
  console.log(`🔍 Quality filter: ${qualityFiltered.length}/${artistResults.length} artists passed`);

  // Sort by featured score with recency boost
  const sorted = sortByFeaturedScore(qualityFiltered);

  // Take top artists
  const featured = sorted.slice(0, limit);

  console.log('✨ Featured artists selected:', {
    count: featured.length,
    topScores: featured.slice(0, 3).map(r => ({
      name: r.artist.name || r.artist.npub.slice(0, 12),
      score: r.featuredScore.toFixed(2),
      releases: r.metrics.releaseCount,
      tracks: r.metrics.trackCount,
      zaps: r.metrics.totalZaps,
      sats: r.metrics.totalSats
    }))
  });

  return featured;
}

/**
 * Calculate metrics for all artists in batch (optimized for SSG)
 */
export function calculateAllArtistMetrics(
  artists: SimpleArtistInfo[],
  tracks: MusicTrackData[],
  playlists: MusicPlaylistData[]
): Map<string, ArtistMetrics> {
  const metricsMap = new Map<string, ArtistMetrics>();
  
  artists.forEach(artist => {
    const metrics = calculateArtistMetrics(artist, tracks, playlists);
    metricsMap.set(artist.pubkey, metrics);
  });

  return metricsMap;
}