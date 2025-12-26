/**
 * Nostr Prefetch Hook
 * 
 * Provides utilities for prefetching Nostr events to improve navigation
 * performance and user experience.
 */

import { useQueryClient } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import { prefetchTrack, prefetchRelease, batchPrefetchEvents } from '@/lib/nostrPrefetch';

export function useNostrPrefetch() {
  const queryClient = useQueryClient();
  const { nostr } = useNostr();

  const prefetchTrackEvent = (pubkey: string, identifier: string, timeout?: number) => {
    return prefetchTrack(queryClient, nostr, pubkey, identifier, timeout);
  };

  const prefetchReleaseEvent = (pubkey: string, identifier: string, timeout?: number) => {
    return prefetchRelease(queryClient, nostr, pubkey, identifier, timeout);
  };

  const batchPrefetch = (requests: Array<{
    type: 'track' | 'release';
    pubkey: string;
    identifier: string;
  }>, timeout?: number) => {
    return batchPrefetchEvents(queryClient, nostr, requests, timeout);
  };

  return {
    prefetchTrack: prefetchTrackEvent,
    prefetchRelease: prefetchReleaseEvent,
    batchPrefetch
  };
}