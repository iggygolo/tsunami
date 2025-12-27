import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useStaticRecentReleasesCache, useLatestReleaseCache } from '@/hooks/useStaticReleaseCache';
import { useReleases } from '@/hooks/useReleases';
import type { MusicRelease } from '@/types/music';

interface RecentReleasesOptions {
  limit?: number;
  excludeLatest?: boolean;
  requireImages?: boolean;
}

/**
 * Hook to fetch recent releases with intelligent filtering and caching
 * Implements smart cache-first strategy with live data fallback
 */
export function useRecentReleases(options: RecentReleasesOptions = {}) {
  const {
    limit = 6,
    excludeLatest = false,
    requireImages = false
  } = options;

  // Get cached data and latest release
  const { data: cachedReleases, isLoading: isCacheLoading, isStale } = useStaticRecentReleasesCache();
  const { data: latestRelease } = useLatestReleaseCache();

  // Determine if we should use live data instead of cache
  const shouldUseLiveData = !cachedReleases || cachedReleases.length === 0 || isStale;

  // Overfetch significantly to account for filtering
  const fetchLimit = requireImages ? limit * 5 : limit * 3;

  // Fetch live data only when needed
  const { data: liveReleases, isLoading: isLiveLoading } = useReleases({
    limit: fetchLimit,
    sortBy: 'date',
    sortOrder: 'desc',
    enabled: shouldUseLiveData
  });

  // Determine which data source to use
  const rawReleases = shouldUseLiveData ? (liveReleases || []) : (cachedReleases || []);
  const isLoading = shouldUseLiveData ? isLiveLoading : isCacheLoading;

  // Apply filtering outside the query using useMemo for better performance
  const filteredReleases = useMemo(() => {
    if (!rawReleases || rawReleases.length === 0) {
      return [];
    }

    let filtered = [...rawReleases];

    // 1. Exclude latest release if requested
    if (excludeLatest && latestRelease) {
      filtered = filtered.filter(release => release.id !== latestRelease.id);
    }

    // 2. Filter out releases without images if required (only for live data)
    // Note: Cache already filters for images, so this is mainly for live data fallback
    if (requireImages && shouldUseLiveData) {
      filtered = filtered.filter(release => release.imageUrl);
    }

    // 3. Apply limit
    return filtered.slice(0, limit);
  }, [rawReleases, excludeLatest, latestRelease, requireImages, limit, shouldUseLiveData]);

  // Log data source for debugging
  console.log('🎵 Recent releases data source:', {
    usingCache: !shouldUseLiveData,
    isStale,
    cachedCount: cachedReleases?.length || 0,
    liveCount: liveReleases?.length || 0,
    filteredCount: filteredReleases.length,
    excludeLatest,
    requireImages
  });

  return {
    data: filteredReleases,
    isLoading,
    error: null,
    isStale: shouldUseLiveData ? false : isStale
  };
}