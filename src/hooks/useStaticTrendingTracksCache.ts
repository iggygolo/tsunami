import { useQuery } from '@tanstack/react-query';
import { useTrendingTracks } from '@/hooks/useTrendingTracks';
import { TRENDING_CONFIG, type TrendingTrackResult } from '@/lib/trendingAlgorithm';

// Cache file interface matching the SSG output
interface TrendingTracksCache {
  tracks: TrendingTrackResult[];
  metadata: {
    generatedAt: string;
    totalCount: number;
    dataSource: 'nostr' | 'fallback';
    relaysUsed: string[];
    cacheVersion: string;
    algorithm: {
      zapAmountWeight: number;
      zapCountWeight: number;
      recencyWeight: number;
      maxPerArtist: number;
      defaultLimit: number;
    };
  };
}

interface StaticTrendingCacheHook {
  data: TrendingTrackResult[] | null;
  isLoading: boolean;
  isStale: boolean;
  lastUpdated: Date | null;
  error: Error | null;
}

/**
 * Transform cached trending track data to ensure Date objects are properly converted
 */
function transformCachedTrendingTrack(trendingTrack: any): TrendingTrackResult {
  return {
    ...trendingTrack,
    track: {
      ...trendingTrack.track,
      createdAt: trendingTrack.track.createdAt ? new Date(trendingTrack.track.createdAt) : undefined,
      publishDate: trendingTrack.track.publishDate ? new Date(trendingTrack.track.publishDate) : undefined,
    }
  };
}

/**
 * Fetch cached trending tracks data from static JSON files
 */
async function fetchCachedTrendingTracks(): Promise<TrendingTracksCache> {
  console.log('🗂️ Fetching cached trending tracks from /data/trending-tracks.json');
  const response = await fetch('/data/trending-tracks.json');
  if (!response.ok) {
    throw new Error(`Failed to fetch cached trending tracks: ${response.status}`);
  }
  const data = await response.json();
  
  // Transform tracks to ensure Date objects are properly converted
  const transformedTracks = data.tracks.map(transformCachedTrendingTrack);
  
  console.log('✅ Loaded cached trending tracks:', { count: transformedTracks.length, generatedAt: data.metadata.generatedAt });
  return {
    ...data,
    tracks: transformedTracks,
  };
}

/**
 * Check if cached data is stale (older than 10 minutes for trending data)
 * Trending data should be refreshed more frequently than releases
 */
function isCacheStale(generatedAt: string): boolean {
  const cacheTime = new Date(generatedAt);
  const now = new Date();
  const tenMinutes = 10 * 60 * 1000; // 10 minutes in milliseconds
  
  return (now.getTime() - cacheTime.getTime()) > tenMinutes;
}

/**
 * Check if we should show live data instead of cache
 * More aggressive check for when cache is significantly outdated
 */
function shouldPreferLiveData(generatedAt: string): boolean {
  const cacheTime = new Date(generatedAt);
  const now = new Date();
  const oneHour = 60 * 60 * 1000; // 1 hour in milliseconds
  
  return (now.getTime() - cacheTime.getTime()) > oneHour;
}

/**
 * Hook to load cached trending tracks data with fallback to live Nostr data
 * Implements cache-first strategy with smart background refresh and cache invalidation
 */
export function useStaticTrendingTracksCache(options: { limit?: number; excludeTrackIds?: string[] } = {}): StaticTrendingCacheHook {
  // Fetch cached data
  const { 
    data: cachedData, 
    isLoading: isCacheLoading, 
    error: cacheError 
  } = useQuery({
    queryKey: ['static-trending-tracks-cache'],
    queryFn: fetchCachedTrendingTracks,
    staleTime: 300000, // 5 minutes
    retry: 1, // Only retry once for cache files
  });

  // Determine if we should prefer live data over cache
  const shouldUseLiveData = !cachedData || cacheError || cachedData.tracks.length === 0 || 
    (cachedData && shouldPreferLiveData(cachedData.metadata.generatedAt));
  
  // Fallback to live Nostr data
  const { 
    data: liveData, 
    isLoading: isLiveLoading 
  } = useTrendingTracks({
    limit: options.limit || TRENDING_CONFIG.DEFAULT_LIMIT, // Use consistent limit
    excludeTrackIds: options.excludeTrackIds,
    enabled: shouldUseLiveData ? true : false
  });

  // Determine if cache is stale (for UI indicators)
  const isStale = cachedData ? isCacheStale(cachedData.metadata.generatedAt) : false;
  
  // Smart background refresh: fetch live data when cache is stale but still usable
  const { data: backgroundData } = useQuery({
    queryKey: ['background-trending-tracks-refresh', cachedData?.metadata.generatedAt],
    queryFn: async () => {
      // This will use the existing useTrendingTracks cache if available
      return liveData || [];
    },
    enabled: isStale && !shouldUseLiveData && !!cachedData,
    staleTime: 300000, // 5 minutes
  });

  // Determine final data and loading state
  let finalData: TrendingTrackResult[] | null = null;
  let isLoading = false;
  let lastUpdated: Date | null = null;
  let error: Error | null = null;

  if (shouldUseLiveData) {
    // Use live data when cache is too old or unavailable
    finalData = liveData || null;
    isLoading = isLiveLoading;
    error = cacheError;
    console.log('🔄 Using live trending tracks data (cache unavailable or too old)');
  } else {
    // Use cached data with potential background refresh
    finalData = backgroundData && backgroundData.length > 0 ? backgroundData : cachedData.tracks;
    isLoading = isCacheLoading;
    lastUpdated = new Date(cachedData.metadata.generatedAt);
    
    if (backgroundData && backgroundData.length > 0) {
      console.log('🔄 Using background-refreshed trending tracks data');
    } else {
      console.log('📦 Using cached trending tracks data');
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
 * Hook to get trending tracks cache metadata and statistics
 */
export function useTrendingTracksCacheMetadata() {
  return useQuery({
    queryKey: ['trending-tracks-cache-metadata'],
    queryFn: async () => {
      try {
        const trendingCache = await fetchCachedTrendingTracks();

        return {
          generatedAt: trendingCache.metadata.generatedAt,
          totalCount: trendingCache.metadata.totalCount,
          dataSource: trendingCache.metadata.dataSource,
          isStale: isCacheStale(trendingCache.metadata.generatedAt),
          shouldPreferLive: shouldPreferLiveData(trendingCache.metadata.generatedAt),
          algorithm: trendingCache.metadata.algorithm,
        };
      } catch (error) {
        return null;
      }
    },
    staleTime: 60000, // 1 minute
    retry: 1,
  });
}