import { useQuery } from '@tanstack/react-query';
import type { MusicRelease } from '@/types/music';

// Cache file interface matching the SSG output
interface SingleReleaseCache {
  release: MusicRelease;
  metadata: {
    generatedAt: string;
    dataSource: 'nostr' | 'fallback';
    relaysUsed: string[];
    cacheVersion: string;
    releaseId: string;
  };
}

interface StaticSingleReleaseCacheHook {
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
 * Fetch cached single release data from static JSON files
 */
async function fetchCachedSingleRelease(releaseId: string): Promise<SingleReleaseCache> {
  console.log(`🗂️ Fetching cached release from /data/releases/${releaseId}.json`);
  
  try {
    const response = await fetch(`/data/releases/${releaseId}.json`);
    console.log(`📡 Cache fetch response:`, { 
      status: response.status, 
      ok: response.ok,
      url: response.url 
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch cached release: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log(`📦 Cache data received:`, { 
      hasRelease: !!data.release,
      title: data.release?.title,
      metadata: data.metadata 
    });
    
    // Transform release to ensure Date objects are properly converted
    const transformedRelease = transformCachedRelease(data.release);
    
    console.log('✅ Loaded cached release:', { 
      title: transformedRelease.title, 
      generatedAt: data.metadata.generatedAt 
    });
    
    return {
      ...data,
      release: transformedRelease,
    };
  } catch (error) {
    console.error('❌ Cache fetch failed:', error);
    throw error;
  }
}

/**
 * Hook to load cached single release data with cache-first strategy
 */
export function useStaticSingleReleaseCache(releaseId: string | undefined): StaticSingleReleaseCacheHook {
  const query = useQuery({
    queryKey: ['static-single-release-cache', releaseId],
    queryFn: () => fetchCachedSingleRelease(releaseId!),
    enabled: !!releaseId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    retry: false, // Don't retry on cache miss - fall back to live data
  });

  // Determine if data is stale
  const isStale = query.data ? 
    Date.now() - new Date(query.data.metadata.generatedAt).getTime() > 5 * 60 * 1000 : 
    false;

  const lastUpdated = query.data ? 
    new Date(query.data.metadata.generatedAt) : 
    null;

  return {
    data: query.data?.release || null,
    isLoading: query.isLoading,
    isStale,
    lastUpdated,
    error: query.error as Error | null,
  };
}

/**
 * Prefetch single release cache data
 */
export function prefetchStaticSingleReleaseCache(releaseId: string, queryClient: any): void {
  queryClient.prefetchQuery({
    queryKey: ['static-single-release-cache', releaseId],
    queryFn: () => fetchCachedSingleRelease(releaseId),
    staleTime: 5 * 60 * 1000,
  });
}