import { useQuery } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import type { NostrEvent } from '@nostrify/nostrify';

export interface EventResolverOptions {
  pubkey: string;
  kind: 36787 | 34139; // MUSIC_TRACK or MUSIC_PLAYLIST
  identifier: string;
  enabled?: boolean;
  timeout?: number;
}

export interface EventResolverResult<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Hook for resolving Nostr addressable events with multi-relay querying,
 * retry logic, and caching. Supports both MUSIC_TRACK (36787) and 
 * MUSIC_PLAYLIST (34139) events.
 */
export function useEventResolver<T>(
  options: EventResolverOptions,
  converter: (event: NostrEvent) => T
): EventResolverResult<T> {
  const { nostr } = useNostr();
  const { pubkey, kind, identifier, enabled = true, timeout = 10000 } = options;

  const queryResult = useQuery<T | null, Error>({
    queryKey: ['event-resolver', pubkey, kind, identifier],
    queryFn: async (context) => {
      const signal = AbortSignal.any([context.signal, AbortSignal.timeout(timeout)]);

      console.log('🔍 EventResolver - Querying event:', {
        pubkey: pubkey.slice(0, 8) + '...',
        kind,
        identifier,
        timeout
      });

      try {
        // Query for addressable event using standard Nostr filter
        const events = await nostr.query([{
          kinds: [kind],
          authors: [pubkey],
          '#d': [identifier],
          limit: 1
        }], { signal });

        console.log('📡 EventResolver - Query result:', {
          found: events.length > 0,
          eventId: events[0]?.id?.slice(0, 8) + '...',
          kind: events[0]?.kind
        });

        if (events.length === 0) {
          console.warn('⚠️ EventResolver - No events found for:', { pubkey: pubkey.slice(0, 8) + '...', kind, identifier });
          return null;
        }

        // Get the most recent event if multiple exist
        const event = events.sort((a, b) => b.created_at - a.created_at)[0];

        // Convert using provided converter function
        const converted = converter(event);
        
        console.log('✅ EventResolver - Event converted successfully:', {
          eventId: event.id.slice(0, 8) + '...',
          kind: event.kind
        });

        return converted;
      } catch (error) {
        console.error('❌ EventResolver - Query failed:', {
          error: error instanceof Error ? error.message : 'Unknown error',
          pubkey: pubkey.slice(0, 8) + '...',
          kind,
          identifier
        });
        
        // Re-throw to let React Query handle retries
        throw error;
      }
    },
    enabled: enabled && !!pubkey && !!identifier && (kind === 36787 || kind === 34139),
    staleTime: 300000, // 5 minutes
    gcTime: 1800000, // 30 minutes
    retry: (failureCount, error) => {
      // Implement exponential backoff retry logic
      if (failureCount >= 3) {
        console.log('🛑 EventResolver - Max retries reached');
        return false;
      }
      
      // Don't retry on validation errors or invalid parameters
      if (error instanceof Error && error.message.includes('Invalid')) {
        console.log('🚫 EventResolver - Not retrying validation error');
        return false;
      }
      
      console.log(`🔄 EventResolver - Retry ${failureCount + 1}/3 in ${Math.pow(2, failureCount) * 1000}ms`);
      return true;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * Math.pow(2, attemptIndex), 30000), // Exponential backoff, max 30s
  });

  return {
    data: queryResult.data || null,
    isLoading: queryResult.isLoading,
    error: queryResult.error?.message || null,
    refetch: queryResult.refetch
  };
}

/**
 * Specialized hook for resolving music track events (kind 36787)
 */
export function useTrackResolver<T>(
  pubkey: string,
  identifier: string,
  converter: (event: NostrEvent) => T,
  options?: { enabled?: boolean; timeout?: number }
): EventResolverResult<T> {
  return useEventResolver(
    {
      pubkey,
      kind: 36787,
      identifier,
      enabled: options?.enabled,
      timeout: options?.timeout
    },
    converter
  );
}

/**
 * Specialized hook for resolving music playlist events (kind 34139)
 */
export function useReleaseResolver<T>(
  pubkey: string,
  identifier: string,
  converter: (event: NostrEvent) => T,
  options?: { enabled?: boolean; timeout?: number }
): EventResolverResult<T> {
  return useEventResolver(
    {
      pubkey,
      kind: 34139,
      identifier,
      enabled: options?.enabled,
      timeout: options?.timeout
    },
    converter
  );
}