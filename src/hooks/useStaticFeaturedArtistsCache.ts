import { useQuery } from '@tanstack/react-query';
import type { FeaturedArtistsCache, FeaturedArtistResult, StaticFeaturedArtistsCacheHook } from '@/types/music';
import { useFeaturedArtists } from '@/hooks/useCommunityPosts';

/**
 * Transform cached featured artist data to ensure Date objects are properly converted
 */
function transformCachedFeaturedArtist(result: any): FeaturedArtistResult {
  return {
    ...result,
    metrics: {
      ...result.metrics,
      lastReleaseDate: result.metrics.lastReleaseDate ? new Date(result.metrics.lastReleaseDate) : null
    }
  };
}

/**
 * Fetch cached featured artists data from static JSON files
 */
async function fetchCachedFeaturedArtists(): Promise<FeaturedArtistsCache> {
  console.log('🗂️ Fetching cached featured artists from /data/featured-artists.json');
  const response = await fetch('/data/featured-artists.json');
  if (!response.ok) {
    throw new Error(`Failed to fetch cached featured artists: ${response.status}`);
  }
  const data = await response.json();
  
  // Transform artists to ensure Date objects are properly converted
  const transformedArtists = data.artists.map(transformCachedFeaturedArtist);
  
  console.log('✅ Loaded cached featured artists:', { 
    count: transformedArtists.length, 
    generatedAt: data.metadata.generatedAt 
  });
  return {
    ...data,
    artists: transformedArtists,
  };
}

/**
 * Check if cache is stale (older than 6 hours)
 */
function isCacheStale(generatedAt: string): boolean {
  const cacheTime = new Date(generatedAt);
  const now = new Date();
  const sixHours = 6 * 60 * 60 * 1000; // 6 hours in milliseconds
  return (now.getTime() - cacheTime.getTime()) > sixHours;
}

/**
 * Check if should prefer live data (older than 12 hours)
 */
function shouldPreferLiveData(generatedAt: string): boolean {
  const cacheTime = new Date(generatedAt);
  const now = new Date();
  const twelveHours = 12 * 60 * 60 * 1000; // 12 hours in milliseconds
  return (now.getTime() - cacheTime.getTime()) > twelveHours;
}

/**
 * Hook to load featured artists from static cache with live fallback
 * 
 * Loading strategy:
 * 1. Load from static cache (instant)
 * 2. If cache is stale (6+ hours), refresh in background
 * 3. If cache is very old (12+ hours) or missing, use live data
 * 4. Always show cached data while loading live data
 */
export function useStaticFeaturedArtistsCache(): StaticFeaturedArtistsCacheHook {
  // Fetch cached data
  const { 
    data: cachedData, 
    isLoading: isCacheLoading, 
    error: cacheError 
  } = useQuery({
    queryKey: ['static-featured-artists-cache'],
    queryFn: fetchCachedFeaturedArtists,
    staleTime: 300000, // 5 minutes
    gcTime: 1800000,   // 30 minutes
    retry: 1,
    retryDelay: 1000
  });

  // Determine cache status
  const isStale = cachedData ? isCacheStale(cachedData.metadata.generatedAt) : false;
  const shouldUseLiveData = !cachedData || !!cacheError || cachedData.artists.length === 0 ||
    (cachedData && shouldPreferLiveData(cachedData.metadata.generatedAt));

  // Fallback to live data when cache is unavailable or very old
  const { 
    data: liveData, 
    isLoading: isLiveLoading
  } = useFeaturedArtists(12, {
    enabled: shouldUseLiveData
  });

  // Background refresh for stale cache (don't block UI)
  const { data: backgroundData } = useQuery({
    queryKey: ['background-featured-artists-refresh', cachedData?.metadata.generatedAt],
    queryFn: async () => {
      console.log('🔄 Background refresh of featured artists cache');
      return liveData || [];
    },
    enabled: Boolean(isStale && !shouldUseLiveData && !!cachedData),
    staleTime: 300000, // 5 minutes
    gcTime: 1800000    // 30 minutes
  });

  // Determine final data and loading state
  let finalData: FeaturedArtistResult[] | null = null;
  let isLoading = false;
  let error: Error | null = null;

  if (shouldUseLiveData) {
    // Use live data when cache is too old or unavailable
    // Convert live data format to cache format
    if (liveData) {
      finalData = liveData.map(artist => ({
        artist: {
          pubkey: artist.pubkey,
          name: artist.name,
          npub: artist.npub,
          image: artist.image
        },
        metrics: artist.metrics || {
          pubkey: artist.pubkey,
          releaseCount: 0,
          trackCount: 0,
          totalSats: 0,
          totalZaps: 0,
          recentActivity: 0,
          followerCount: 0,
          lastReleaseDate: null
        },
        featuredScore: artist.scores?.featured || artist.activityScore || 0,
        releaseScore: artist.scores?.release || 0,
        zapScore: artist.scores?.zap || 0,
        activityScore: artist.scores?.activity || 0,
        followerScore: artist.scores?.follower || 0
      }));
    }
    isLoading = isLiveLoading;
    error = cacheError as Error | null;
  } else if (cachedData) {
    // Use cached data (preferred)
    finalData = cachedData.artists;
    isLoading = false;
    error = null;
  } else {
    // Loading cache
    finalData = null;
    isLoading = isCacheLoading;
    error = cacheError as Error | null;
  }

  // Calculate last updated time
  const lastUpdated = cachedData ? new Date(cachedData.metadata.generatedAt) : null;

  console.log('🎯 Featured artists cache status:', {
    hasCachedData: !!cachedData,
    isStale,
    shouldUseLiveData,
    finalDataCount: finalData?.length || 0,
    isLoading,
    lastUpdated: lastUpdated?.toISOString()
  });

  return {
    data: finalData,
    isLoading,
    isStale,
    lastUpdated,
    error
  };
}

/**
 * Hook to get featured artists cache metadata for debugging
 */
export function useFeaturedArtistsCacheMetadata() {
  const { data: cachedData } = useQuery({
    queryKey: ['static-featured-artists-cache'],
    queryFn: fetchCachedFeaturedArtists,
    staleTime: 300000,
    retry: 1
  });

  return {
    metadata: cachedData?.metadata || null,
    isStale: cachedData ? isCacheStale(cachedData.metadata.generatedAt) : false,
    shouldPreferLive: cachedData ? shouldPreferLiveData(cachedData.metadata.generatedAt) : false
  };
}