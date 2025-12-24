import { useQuery } from '@tanstack/react-query';
import type { PodcastRelease } from '@/types/podcast';
import { useReleases } from '@/hooks/usePodcastReleases';

// Cache file interfaces matching the SSG output
interface ReleaseCache {
  releases: PodcastRelease[];
  metadata: {
    generatedAt: string;
    totalCount: number;
    dataSource: 'nostr' | 'fallback';
    relaysUsed: string[];
    cacheVersion: string;
  };
}

interface LatestReleaseCache {
  release: PodcastRelease | null;
  metadata: {
    generatedAt: string;
    dataSource: 'nostr' | 'fallback';
    relaysUsed: string[];
    cacheVersion: string;
  };
}

interface StaticCacheHook {
  data: PodcastRelease[] | null;
  isLoading: boolean;
  isStale: boolean;
  lastUpdated: Date | null;
  error: Error | null;
}

interface LatestReleaseCacheHook {
  data: PodcastRelease | null;
  isLoading: boolean;
  isStale: boolean;
  lastUpdated: Date | null;
  error: Error | null;
}

/**
 * Transform cached release data to ensure Date objects are properly converted
 */
function transformCachedRelease(release: any): PodcastRelease {
  return {
    ...release,
    createdAt: new Date(release.createdAt),
    publishDate: new Date(release.publishDate),
  };
}

/**
 * Fetch cached release data from static JSON files
 */
async function fetchCachedReleases(): Promise<ReleaseCache> {
  console.log('🗂️ Fetching cached releases from /data/releases.json');
  const response = await fetch('/data/releases.json');
  if (!response.ok) {
    throw new Error(`Failed to fetch cached releases: ${response.status}`);
  }
  const data = await response.json();
  
  // Transform releases to ensure Date objects are properly converted
  const transformedReleases = data.releases.map(transformCachedRelease);
  
  console.log('✅ Loaded cached releases:', { count: transformedReleases.length, generatedAt: data.metadata.generatedAt });
  return {
    ...data,
    releases: transformedReleases,
  };
}

/**
 * Fetch cached latest release data from static JSON files
 */
async function fetchCachedLatestRelease(): Promise<LatestReleaseCache> {
  console.log('🗂️ Fetching cached latest release from /data/latest-release.json');
  const response = await fetch('/data/latest-release.json');
  if (!response.ok) {
    throw new Error(`Failed to fetch cached latest release: ${response.status}`);
  }
  const data = await response.json();
  
  // Transform release to ensure Date objects are properly converted
  const transformedRelease = data.release ? transformCachedRelease(data.release) : null;
  
  console.log('✅ Loaded cached latest release:', { hasRelease: !!transformedRelease, title: transformedRelease?.title });
  return {
    ...data,
    release: transformedRelease,
  };
}

/**
 * Check if cached data is stale (older than 1 hour)
 */
function isCacheStale(generatedAt: string): boolean {
  const cacheTime = new Date(generatedAt);
  const now = new Date();
  const oneHour = 60 * 60 * 1000; // 1 hour in milliseconds
  
  return (now.getTime() - cacheTime.getTime()) > oneHour;
}

/**
 * Hook to load cached release data with fallback to live Nostr data
 * Implements cache-first strategy with background refresh for stale data
 */
export function useStaticReleaseCache(): StaticCacheHook {
  // Fetch cached data
  const { 
    data: cachedData, 
    isLoading: isCacheLoading, 
    error: cacheError 
  } = useQuery({
    queryKey: ['static-release-cache'],
    queryFn: fetchCachedReleases,
    staleTime: 300000, // 5 minutes
    retry: 1, // Only retry once for cache files
  });

  // Fallback to live Nostr data if cache fails or is empty
  const shouldUseLiveData = !cachedData || cacheError || cachedData.releases.length === 0;
  
  const { 
    data: liveData, 
    isLoading: isLiveLoading 
  } = useReleases({
    limit: 20 // Match cache limit
  });

  // Determine if we should refresh in background (cache is stale)
  const isStale = cachedData ? isCacheStale(cachedData.metadata.generatedAt) : false;
  
  // Background refresh for stale data (don't block UI)
  useQuery({
    queryKey: ['background-release-refresh'],
    queryFn: () => liveData || [], // Use already fetched live data
    enabled: isStale && !!liveData,
    staleTime: Infinity, // Don't refetch this background query
  });

  // Determine final data and loading state
  let finalData: PodcastRelease[] | null = null;
  let isLoading = false;
  let lastUpdated: Date | null = null;
  let error: Error | null = null;

  if (shouldUseLiveData) {
    // Use live data as fallback
    finalData = liveData || null;
    isLoading = isLiveLoading;
    error = cacheError;
  } else {
    // Use cached data
    finalData = cachedData.releases;
    isLoading = isCacheLoading;
    lastUpdated = new Date(cachedData.metadata.generatedAt);
  }

  return {
    data: finalData,
    isLoading,
    isStale,
    lastUpdated,
    error,
  };
}

/**
 * Hook specifically for latest release with cache-first strategy
 * Optimized for homepage and quick access scenarios
 */
export function useLatestReleaseCache(): LatestReleaseCacheHook {
  // Fetch cached latest release
  const { 
    data: cachedData, 
    isLoading: isCacheLoading, 
    error: cacheError 
  } = useQuery({
    queryKey: ['static-latest-release-cache'],
    queryFn: fetchCachedLatestRelease,
    staleTime: 300000, // 5 minutes
    retry: 1,
  });

  // Fallback to live data if cache fails
  const shouldUseLiveData = !cachedData || cacheError || !cachedData.release;
  
  const { 
    data: liveReleases, 
    isLoading: isLiveLoading 
  } = useReleases({
    limit: 1 // Only need the latest one
  });

  // Determine if cache is stale
  const isStale = cachedData ? isCacheStale(cachedData.metadata.generatedAt) : false;

  // Background refresh for stale data
  useQuery({
    queryKey: ['background-latest-release-refresh'],
    queryFn: () => liveReleases?.[0] || null,
    enabled: isStale && !!liveReleases?.[0],
    staleTime: Infinity,
  });

  // Determine final data and loading state
  let finalData: PodcastRelease | null = null;
  let isLoading = false;
  let lastUpdated: Date | null = null;
  let error: Error | null = null;

  if (shouldUseLiveData) {
    // Use live data as fallback
    finalData = liveReleases?.[0] || null;
    isLoading = isLiveLoading;
    error = cacheError;
  } else {
    // Use cached data
    finalData = cachedData.release;
    isLoading = isCacheLoading;
    lastUpdated = new Date(cachedData.metadata.generatedAt);
  }

  return {
    data: finalData,
    isLoading,
    isStale,
    lastUpdated,
    error,
  };
}

/**
 * Hook to get cache metadata and statistics
 */
export function useCacheMetadata() {
  return useQuery({
    queryKey: ['cache-metadata'],
    queryFn: async () => {
      try {
        const [releasesCache, latestCache] = await Promise.all([
          fetchCachedReleases(),
          fetchCachedLatestRelease()
        ]);

        return {
          releases: {
            generatedAt: releasesCache.metadata.generatedAt,
            totalCount: releasesCache.metadata.totalCount,
            dataSource: releasesCache.metadata.dataSource,
            isStale: isCacheStale(releasesCache.metadata.generatedAt),
          },
          latestRelease: {
            generatedAt: latestCache.metadata.generatedAt,
            dataSource: latestCache.metadata.dataSource,
            isStale: isCacheStale(latestCache.metadata.generatedAt),
            hasRelease: !!latestCache.release,
          },
        };
      } catch (error) {
        return null;
      }
    },
    staleTime: 60000, // 1 minute
    retry: 1,
  });
}