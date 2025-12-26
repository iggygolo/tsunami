import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useStaticReleaseCache, useLatestReleaseCache } from '@/hooks/useStaticReleaseCache';
import { useReleases } from '@/hooks/useReleases';
import type { MusicRelease } from '@/types/music';

interface RecentReleasesOptions {
  limit?: number;
  excludeLatest?: boolean;
  requireImages?: boolean;
}

/**
 * Hook to fetch recent releases with intelligent filtering
 * Overfetches significantly and applies filtering outside the query for better caching
 */
export function useRecentReleases(options: RecentReleasesOptions = {}) {
  const {
    limit = 6,
    excludeLatest = false,
    requireImages = false
  } = options;

  // Get cached data and latest release
  const { data: cachedReleases, isLoading: isCacheLoading } = useStaticReleaseCache();
  const { data: latestRelease } = useLatestReleaseCache();

  // Overfetch significantly to account for filtering
  const fetchLimit = requireImages ? limit * 5 : limit * 3;

  // Always fetch live data from all artists with high limit
  const { data: liveReleases, isLoading: isLiveLoading } = useReleases({
    limit: fetchLimit,
    sortBy: 'date',
    sortOrder: 'desc'
  });

  // Get raw releases data (no filtering in query for better caching)
  const rawReleases = (cachedReleases && cachedReleases.length > 0) ? cachedReleases : (liveReleases || []);
  const isLoading = isCacheLoading || isLiveLoading;

  // Apply filtering outside the query using useMemo
  const filteredReleases = useMemo(() => {
    if (!rawReleases || rawReleases.length === 0) {
      return [];
    }

    let filtered = [...rawReleases];

    // 1. Exclude latest release if requested
    if (excludeLatest && latestRelease) {
      filtered = filtered.filter(release => release.id !== latestRelease.id);
    }

    // 2. Filter out releases without images if required
    if (requireImages) {
      filtered = filtered.filter(release => release.imageUrl);
    }

    // 3. Apply limit
    return filtered.slice(0, limit);
  }, [rawReleases, excludeLatest, latestRelease, requireImages, limit]);

  return {
    data: filteredReleases,
    isLoading,
    error: null
  };
}