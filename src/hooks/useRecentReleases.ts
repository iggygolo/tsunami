import { useMemo } from 'react';
import { useStaticRecentReleasesCache, useLatestReleaseCache } from '@/hooks/useStaticReleaseCache';
import { useReleases } from '@/hooks/useReleases';
import { filterRecentReleases, logReleaseFiltering } from '@/lib/releaseFiltering';

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

  // Apply filtering using shared logic for consistency
  const filteredReleases = useMemo(() => {
    if (!rawReleases || rawReleases.length === 0) {
      return [];
    }

    // Use shared filtering logic
    const filtered = filterRecentReleases(rawReleases, {
      excludeLatest: excludeLatest && shouldUseLiveData, // Only exclude for live data, cache already excludes
      requireImages: requireImages && shouldUseLiveData, // Only filter for live data, cache already filters
      limit,
      latestRelease: shouldUseLiveData ? latestRelease : null // Only pass latest for live data
    });

    logReleaseFiltering(
      'Recent releases hook',
      rawReleases.length,
      filtered.length,
      {
        excludeLatest: excludeLatest && shouldUseLiveData,
        requireImages: requireImages && shouldUseLiveData,
        limit,
        latestRelease: shouldUseLiveData ? latestRelease : null
      }
    );

    return filtered;
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