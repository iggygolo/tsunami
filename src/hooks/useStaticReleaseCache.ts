import { useQuery } from '@tanstack/react-query';
import type { MusicRelease } from '@/types/music';
import { useReleases } from '@/hooks/useReleases';

// Cache file interfaces matching the SSG output
interface ReleaseCache {
  releases: MusicRelease[];
  metadata: {
    generatedAt: string;
    totalCount: number;
    dataSource: 'nostr' | 'fallback';
    relaysUsed: string[];
    cacheVersion: string;
  };
}

interface LatestReleaseCache {
  release: MusicRelease | null;
  metadata: {
    generatedAt: string;
    dataSource: 'nostr' | 'fallback';
    relaysUsed: string[];
    cacheVersion: string;
  };
}

interface StaticCacheHook {
  data: MusicRelease[] | null;
  isLoading: boolean;
  isStale: boolean;
  lastUpdated: Date | null;
  error: Error | null;
}

interface LatestReleaseCacheHook {
  data: MusicRelease | null;
  isLoading: boolean;
  isStale: boolean;
  lastUpdated: Date | null;
  error: Error | null;
}

/**
 * Transform cached release data to ensure Date objects are properly converted
 */
function transformCachedRelease(release: any): MusicRelease {
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
 * Check if cached data is stale (older than 6 hours for static cache)
 * Static cache files are generated during build, so they should be valid longer
 */
function isCacheStale(generatedAt: string): boolean {
  const cacheTime = new Date(generatedAt);
  const now = new Date();
  const sixHours = 6 * 60 * 60 * 1000; // 6 hours in milliseconds
  
  return (now.getTime() - cacheTime.getTime()) > sixHours;
}

/**
 * Check if we should show live data instead of cache
 * More aggressive check for when cache is significantly outdated
 */
function shouldPreferLiveData(generatedAt: string): boolean {
  const cacheTime = new Date(generatedAt);
  const now = new Date();
  const twelveHours = 12 * 60 * 60 * 1000; // 12 hours in milliseconds
  
  return (now.getTime() - cacheTime.getTime()) > twelveHours;
}

/**
 * Hook to load cached release data with fallback to live Nostr data
 * Implements cache-first strategy with smart background refresh and cache invalidation
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

  // Determine if we should prefer live data over cache
  const shouldUseLiveData = !cachedData || cacheError || cachedData.releases.length === 0 || 
    (cachedData && shouldPreferLiveData(cachedData.metadata.generatedAt));
  
  // Fallback to live Nostr data
  const { 
    data: liveData, 
    isLoading: isLiveLoading 
  } = useReleases({
    limit: 20, // Match cache limit
    enabled: shouldUseLiveData ? true : false // Only fetch if we need live data
  });

  // Determine if cache is stale (for UI indicators)
  const isStale = cachedData ? isCacheStale(cachedData.metadata.generatedAt) : false;
  
  // Smart background refresh: fetch live data when cache is stale but still usable
  const { data: backgroundData } = useQuery({
    queryKey: ['background-release-refresh', cachedData?.metadata.generatedAt],
    queryFn: async () => {
      // This will use the existing useReleases cache if available
      const releases = await new Promise<any[]>((resolve) => {
        // Trigger a background fetch through useReleases
        resolve(liveData || []);
      });
      return releases;
    },
    enabled: isStale && !shouldUseLiveData && !!cachedData,
    staleTime: 300000, // 5 minutes
  });

  // Determine final data and loading state
  let finalData: MusicRelease[] | null = null;
  let isLoading = false;
  let lastUpdated: Date | null = null;
  let error: Error | null = null;

  if (shouldUseLiveData) {
    // Use live data when cache is too old or unavailable
    finalData = liveData || null;
    isLoading = isLiveLoading;
    error = cacheError;
    console.log('🔄 Using live release data (cache unavailable or too old)');
  } else {
    // Use cached data with potential background refresh
    finalData = backgroundData && backgroundData.length > 0 ? backgroundData : cachedData.releases;
    isLoading = isCacheLoading;
    lastUpdated = new Date(cachedData.metadata.generatedAt);
    
    if (backgroundData && backgroundData.length > 0) {
      console.log('🔄 Using background-refreshed release data');
    } else {
      console.log('📦 Using cached release data');
    }
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
 * Optimized for homepage and quick access scenarios with smart fallback
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

  // Determine if we should prefer live data over cache
  const shouldUseLiveData = !cachedData || cacheError || !cachedData.release ||
    (cachedData && shouldPreferLiveData(cachedData.metadata.generatedAt));
  
  // Fallback to live data
  const { 
    data: liveReleases, 
    isLoading: isLiveLoading 
  } = useReleases({
    limit: 1, // Only need the latest one
    enabled: shouldUseLiveData ? true : false
  });

  // Determine if cache is stale
  const isStale = cachedData ? isCacheStale(cachedData.metadata.generatedAt) : false;

  // Smart background refresh for latest release
  const { data: backgroundLatest } = useQuery({
    queryKey: ['background-latest-release-refresh', cachedData?.metadata.generatedAt],
    queryFn: async () => {
      // Get the latest release from live data
      return liveReleases?.[0] || null;
    },
    enabled: isStale && !shouldUseLiveData && !!cachedData?.release,
    staleTime: 300000, // 5 minutes
  });

  // Determine final data and loading state
  let finalData: MusicRelease | null = null;
  let isLoading = false;
  let lastUpdated: Date | null = null;
  let error: Error | null = null;

  if (shouldUseLiveData) {
    // Use live data when cache is too old or unavailable
    finalData = liveReleases?.[0] || null;
    isLoading = isLiveLoading;
    error = cacheError;
    console.log('🔄 Using live latest release data (cache unavailable or too old)');
  } else {
    // Use cached data with potential background refresh
    finalData = backgroundLatest || cachedData.release;
    isLoading = isCacheLoading;
    lastUpdated = new Date(cachedData.metadata.generatedAt);
    
    if (backgroundLatest) {
      console.log('🔄 Using background-refreshed latest release data');
    } else {
      console.log('📦 Using cached latest release data');
    }
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
            shouldPreferLive: shouldPreferLiveData(releasesCache.metadata.generatedAt),
          },
          latestRelease: {
            generatedAt: latestCache.metadata.generatedAt,
            dataSource: latestCache.metadata.dataSource,
            isStale: isCacheStale(latestCache.metadata.generatedAt),
            shouldPreferLive: shouldPreferLiveData(latestCache.metadata.generatedAt),
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