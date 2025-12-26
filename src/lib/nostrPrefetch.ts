/**
 * Nostr Event Prefetching Utilities
 * 
 * This module provides utilities for prefetching Nostr events to improve
 * navigation performance and user experience.
 */

import { QueryClient } from '@tanstack/react-query';
import { eventToMusicTrack, eventToMusicPlaylist } from '@/lib/eventConversions';
import type { NostrEvent } from '@nostrify/nostrify';
import type { MusicTrackData, MusicPlaylistData } from '@/types/music';

/**
 * Prefetch a music track event
 */
export function prefetchTrack(
  queryClient: QueryClient,
  nostr: any,
  pubkey: string,
  identifier: string,
  timeout = 10000
) {
  return queryClient.prefetchQuery({
    queryKey: ['event-resolver', pubkey, 36787, identifier],
    queryFn: async () => {
      const signal = AbortSignal.timeout(timeout);
      
      const events = await nostr.query([{
        kinds: [36787],
        authors: [pubkey],
        '#d': [identifier],
        limit: 1
      }], { signal });

      if (events.length === 0) {
        return null;
      }

      const event = events.sort((a: NostrEvent, b: NostrEvent) => b.created_at - a.created_at)[0];
      return eventToMusicTrack(event);
    },
    staleTime: 300000, // 5 minutes
    gcTime: 1800000, // 30 minutes
  });
}

/**
 * Prefetch a music playlist/release event
 */
export function prefetchRelease(
  queryClient: QueryClient,
  nostr: any,
  pubkey: string,
  identifier: string,
  timeout = 10000
) {
  return queryClient.prefetchQuery({
    queryKey: ['event-resolver', pubkey, 34139, identifier],
    queryFn: async () => {
      const signal = AbortSignal.timeout(timeout);
      
      const events = await nostr.query([{
        kinds: [34139],
        authors: [pubkey],
        '#d': [identifier],
        limit: 1
      }], { signal });

      if (events.length === 0) {
        return null;
      }

      const event = events.sort((a: NostrEvent, b: NostrEvent) => b.created_at - a.created_at)[0];
      return eventToMusicPlaylist(event);
    },
    staleTime: 300000, // 5 minutes
    gcTime: 1800000, // 30 minutes
  });
}

/**
 * Batch prefetch multiple events for improved performance
 */
export function batchPrefetchEvents(
  queryClient: QueryClient,
  nostr: any,
  requests: Array<{
    type: 'track' | 'release';
    pubkey: string;
    identifier: string;
  }>,
  timeout = 10000
) {
  const prefetchPromises = requests.map(({ type, pubkey, identifier }) => {
    if (type === 'track') {
      return prefetchTrack(queryClient, nostr, pubkey, identifier, timeout);
    } else {
      return prefetchRelease(queryClient, nostr, pubkey, identifier, timeout);
    }
  });

  return Promise.allSettled(prefetchPromises);
}

/**
 * Progressive loading utility for large releases
 */
export function createProgressiveLoader<T>(
  items: T[],
  batchSize = 5,
  delay = 100
): {
  batches: T[][];
  loadBatch: (index: number) => Promise<void>;
} {
  const batches: T[][] = [];
  
  for (let i = 0; i < items.length; i += batchSize) {
    batches.push(items.slice(i, i + batchSize));
  }

  const loadBatch = async (index: number): Promise<void> => {
    if (index > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  };

  return { batches, loadBatch };
}

/**
 * Memory-efficient cache cleanup utility
 */
export function cleanupStaleQueries(queryClient: QueryClient, maxAge = 1800000) {
  const now = Date.now();
  const queryCache = queryClient.getQueryCache();
  
  queryCache.getAll().forEach(query => {
    const lastUpdated = query.state.dataUpdatedAt;
    if (lastUpdated && (now - lastUpdated) > maxAge) {
      queryCache.remove(query);
    }
  });
}