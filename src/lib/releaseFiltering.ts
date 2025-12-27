import type { MusicRelease } from '@/types/music';

/**
 * Shared release filtering logic used by both SSG cache generation and runtime components
 * Ensures consistency between build-time and runtime filtering
 */

export interface ReleaseFilterOptions {
  excludeLatest?: boolean;
  requireImages?: boolean;
  limit?: number;
  selectedArtist?: string;
  latestRelease?: MusicRelease | null;
}

/**
 * Filter releases for recent releases display (main page)
 * Used by both cache generation and runtime components
 */
export function filterRecentReleases(
  releases: MusicRelease[],
  options: ReleaseFilterOptions = {}
): MusicRelease[] {
  const {
    excludeLatest = true,
    requireImages = true,
    limit = 10,
    selectedArtist,
    latestRelease
  } = options;

  let filtered = [...releases];

  // 1. Filter for images if required (main page needs visual appeal)
  if (requireImages) {
    filtered = filtered.filter(release => release.imageUrl);
  }

  // 2. Exclude latest release if requested (avoid duplication with hero section)
  if (excludeLatest && latestRelease) {
    filtered = filtered.filter(release => release.id !== latestRelease.id);
  }

  // 3. Filter by artist if specified
  if (selectedArtist) {
    filtered = filtered.filter(release => release.artistPubkey === selectedArtist);
  }

  // 4. Apply limit
  return filtered.slice(0, limit);
}

/**
 * Filter releases for comprehensive browsing (releases page)
 * Used by both cache generation and runtime components
 */
export function filterAllReleases(
  releases: MusicRelease[],
  options: ReleaseFilterOptions = {}
): MusicRelease[] {
  const {
    excludeLatest = false,
    requireImages = false,
    limit = 50,
    selectedArtist,
    latestRelease
  } = options;

  let filtered = [...releases];

  // 1. Filter for images if required (usually not for comprehensive view)
  if (requireImages) {
    filtered = filtered.filter(release => release.imageUrl);
  }

  // 2. Exclude latest release if requested (usually not for comprehensive view)
  if (excludeLatest && latestRelease) {
    filtered = filtered.filter(release => release.id !== latestRelease.id);
  }

  // 3. Filter by artist if specified
  if (selectedArtist) {
    filtered = filtered.filter(release => release.artistPubkey === selectedArtist);
  }

  // 4. Apply limit
  return filtered.slice(0, limit);
}

/**
 * Get the latest release from a list of releases
 * Used to determine which release to exclude from recent releases
 */
export function getLatestRelease(releases: MusicRelease[]): MusicRelease | null {
  if (!releases || releases.length === 0) return null;
  
  // Releases should already be sorted by date (newest first)
  // But we'll double-check by finding the most recent one
  return releases.reduce((latest, current) => {
    if (!latest) return current;
    
    const latestTime = latest.createdAt?.getTime() || latest.publishDate?.getTime() || 0;
    const currentTime = current.createdAt?.getTime() || current.publishDate?.getTime() || 0;
    
    return currentTime > latestTime ? current : latest;
  });
}

/**
 * Get the latest release with an image (preferred for hero display)
 * Used by latest release cache generation
 */
export function getLatestReleaseWithImage(releases: MusicRelease[]): MusicRelease | null {
  const releasesWithImages = releases.filter(release => release.imageUrl);
  return getLatestRelease(releasesWithImages);
}

/**
 * Configuration constants for consistent filtering
 */
export const RELEASE_FILTER_CONFIG = {
  RECENT_RELEASES: {
    DEFAULT_LIMIT: 10,
    REQUIRE_IMAGES: true,
    EXCLUDE_LATEST: true
  },
  ALL_RELEASES: {
    DEFAULT_LIMIT: 50,
    REQUIRE_IMAGES: false,
    EXCLUDE_LATEST: false
  }
} as const;

/**
 * Apply consistent sorting to releases (newest first)
 */
export function sortReleasesByDate(releases: MusicRelease[]): MusicRelease[] {
  return [...releases].sort((a, b) => {
    const aTime = a.createdAt?.getTime() || a.publishDate?.getTime() || 0;
    const bTime = b.createdAt?.getTime() || b.publishDate?.getTime() || 0;
    return bTime - aTime; // Newest first
  });
}

/**
 * Debug logging helper for release filtering
 */
export function logReleaseFiltering(
  context: string,
  originalCount: number,
  filteredCount: number,
  options: ReleaseFilterOptions
): void {
  console.log(`🎵 ${context} filtering:`, {
    originalCount,
    filteredCount,
    excludeLatest: options.excludeLatest,
    requireImages: options.requireImages,
    limit: options.limit,
    selectedArtist: options.selectedArtist ? 'yes' : 'no',
    hasLatestRelease: !!options.latestRelease
  });
}