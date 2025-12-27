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
 * Fetch cached recent releases data from static JSON files (for main page)
 */
async function fetchCachedRecentReleases(): Promise<ReleaseCache> {
  console.log('🗂️ Fetching cached recent releases from /data/recent-releases.json');
  const response = await fetch('/data/recent-releases.json');
  if (!response.ok) {
    throw new Error(`Failed to fetch cached recent releases: ${response.status}`);
  }
  const data = await response.json();
  
  // Transform releases to ensure Date objects are properly converted
  const transformedReleases = data.releases.map(transformCachedRelease);
  
  console.log('✅ Loaded cached recent releases:', { count: transformedReleases.length, generatedAt: data.metadata.generatedAt });
  return {
    ...data,
    releases: transformedReleases,
  };
}

/**
 * Fetch cached all releases data from static JSON files (for releases page)
 */
async function fetchCachedAllReleases(): Promise<ReleaseCache> {
  console.log('🗂️ Fetching cached all releases from /data/all-releases.json');
  const response = await fetch('/data/all-releases.json');
  if (!response.ok) {
    throw new Error(`Failed to fetch cached all releases: ${response.status}`);
  }
  const data = await response.json();
  
  // Transform releases to ensure Date objects are properly converted
  const transformedReleases = data.releases.map(transformCachedRelease);
  
  console.log('✅ Loaded cached all releases:', { count: transformedReleases.length, generatedAt: data.metadata.generatedAt });
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
 * Hook to load cached recent releases data for main page
 * Optimized for homepage display with image-focused content
 */
export function useStaticRecentReleasesCache(): StaticCacheHook {
  // Fetch cached data
  const { 
    data: cachedData, 
    isLoading: isCacheLoading, 
    error: cacheError 
  } = useQuery({
    queryKey: ['static-recent-releases-cache'],
    queryFn: fetchCachedRecentReleases,
    staleTime: 300000, // 5 minutes
    retry: 1, // Only retry once for cache files
  });

  // Determine if we should prefer live data over cache
  const shouldUseLiveData = !cachedData || !!cacheError || cachedData.releases.length === 0 || 
    (cachedData && shouldPreferLiveData(cachedData.metadata.generatedAt));
  
  // Fallback to live Nostr data
  const { 
    data: liveData, 
    isLoading: isLiveLoading 
  } = useReleases({
    limit: 10, // Match recent releases limit
    enabled: shouldUseLiveData ? true : false
  });

  // Determine if cache is stale (for UI indicators)
  const isStale = cachedData ? isCacheStale(cachedData.metadata.generatedAt) : false;
  
  // Smart background refresh: fetch live data when cache is stale but still usable
  const { data: backgroundData } = useQuery({
    queryKey: ['background-recent-releases-refresh', cachedData?.metadata.generatedAt],
    queryFn: async () => {
      return liveData || [];
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
    error = cacheError as Error | null;
    console.log('🔄 Using live recent releases data (cache unavailable or too old)');
  } else {
    // Use cached data with potential background refresh
    finalData = backgroundData && backgroundData.length > 0 ? backgroundData : cachedData.releases;
    isLoading = isCacheLoading;
    lastUpdated = new Date(cachedData.metadata.generatedAt);
    
    if (backgroundData && backgroundData.length > 0) {
      console.log('🔄 Using background-refreshed recent releases data');
    } else {
      console.log('📦 Using cached recent releases data');
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
 * Hook to load cached all releases data for releases page
 * Includes all releases for comprehensive browsing
 */
export function useStaticAllReleasesCache(): StaticCacheHook {
  // Fetch cached data
  const { 
    data: cachedData, 
    isLoading: isCacheLoading, 
    error: cacheError 
  } = useQuery({
    queryKey: ['static-all-releases-cache'],
    queryFn: fetchCachedAllReleases,
    staleTime: 300000, // 5 minutes
    retry: 1, // Only retry once for cache files
  });

  // Determine if we should prefer live data over cache
  const shouldUseLiveData = !cachedData || !!cacheError || cachedData.releases.length === 0 || 
    (cachedData && shouldPreferLiveData(cachedData.metadata.generatedAt));
  
  // Fallback to live Nostr data
  const { 
    data: liveData, 
    isLoading: isLiveLoading 
  } = useReleases({
    limit: 50, // Match all releases limit
    enabled: shouldUseLiveData ? true : false
  });

  // Determine if cache is stale (for UI indicators)
  const isStale = cachedData ? isCacheStale(cachedData.metadata.generatedAt) : false;
  
  // Smart background refresh: fetch live data when cache is stale but still usable
  const { data: backgroundData } = useQuery({
    queryKey: ['background-all-releases-refresh', cachedData?.metadata.generatedAt],
    queryFn: async () => {
      return liveData || [];
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
    error = cacheError as Error | null;
    console.log('🔄 Using live all releases data (cache unavailable or too old)');
  } else {
    // Use cached data with potential background refresh
    finalData = backgroundData && backgroundData.length > 0 ? backgroundData : cachedData.releases;
    isLoading = isCacheLoading;
    lastUpdated = new Date(cachedData.metadata.generatedAt);
    
    if (backgroundData && backgroundData.length > 0) {
      console.log('🔄 Using background-refreshed all releases data');
    } else {
      console.log('📦 Using cached all releases data');
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
  const shouldUseLiveData = !cachedData || !!cacheError || !cachedData.release ||
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
    error = cacheError as Error | null;
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
        const [recentCache, allCache, latestCache] = await Promise.all([
          fetchCachedRecentReleases(),
          fetchCachedAllReleases(),
          fetchCachedLatestRelease()
        ]);

        return {
          recentReleases: {
            generatedAt: recentCache.metadata.generatedAt,
            totalCount: recentCache.metadata.totalCount,
            dataSource: recentCache.metadata.dataSource,
            isStale: isCacheStale(recentCache.metadata.generatedAt),
            shouldPreferLive: shouldPreferLiveData(recentCache.metadata.generatedAt),
          },
          allReleases: {
            generatedAt: allCache.metadata.generatedAt,
            totalCount: allCache.metadata.totalCount,
            dataSource: allCache.metadata.dataSource,
            isStale: isCacheStale(allCache.metadata.generatedAt),
            shouldPreferLive: shouldPreferLiveData(allCache.metadata.generatedAt),
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