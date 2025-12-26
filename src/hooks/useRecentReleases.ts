import { useQuery } from '@tanstack/react-query';
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
 * Fetches extra releases to account for filtering, ensuring the component gets enough items
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

  // Calculate how many extra releases to fetch to account for filtering
  // Assume ~20% of releases might not have images, so fetch 25% more
  const fetchLimit = Math.ceil(limit * 1.5);

  // Fallback to live data with increased limit
  const { data: liveReleases, isLoading: isLiveLoading } = useReleases({
    limit: fetchLimit,
    sortBy: 'date',
    sortOrder: 'desc'
  });

  return useQuery({
    queryKey: ['recent-releases', limit, excludeLatest, requireImages],
    queryFn: async () => {
      // Use cached data if available, otherwise use live data
      let releases = cachedReleases || liveReleases || [];

      console.log('🔍 useRecentReleases - Processing releases:', {
        totalReleases: releases.length,
        excludeLatest,
        requireImages,
        targetLimit: limit
      });

      // Apply filters in order
      let filteredReleases = [...releases];

      // 1. Exclude latest release if requested
      if (excludeLatest && latestRelease) {
        filteredReleases = filteredReleases.filter(release => release.id !== latestRelease.id);
        console.log('📋 After excluding latest:', filteredReleases.length);
      }

      // 2. Filter out releases without images if required
      if (requireImages) {
        filteredReleases = filteredReleases.filter(release => release.imageUrl);
        console.log('🖼️ After requiring images:', filteredReleases.length);
      }

      // 3. Apply limit
      const finalReleases = filteredReleases.slice(0, limit);

      console.log('✅ useRecentReleases - Final result:', {
        finalCount: finalReleases.length,
        withImages: finalReleases.filter(r => r.imageUrl).length,
        targetLimit: limit
      });

      return finalReleases;
    },
    enabled: !!(cachedReleases || liveReleases),
    staleTime: 300000, // 5 minutes
  });
}