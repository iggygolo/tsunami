import { useQuery } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import { extractZapAmount, validateZapEvent, extractZapperPubkey } from '@/lib/zapUtils';
import type { NostrEvent } from '@nostrify/nostrify';

export interface ZapEntry {
  userPubkey: string;
  amount: number;
  timestamp: Date;
  eventId: string;
}

export interface ZapCountsData {
  zaps: ZapEntry[];
  count: number;
  totalSats: number;
  isLoading: boolean;
  error: Error | null;
}

export function useZapCounts(eventId: string): ZapCountsData {
  const { nostr } = useNostr();

  const { data: zaps = [], isLoading, error } = useQuery<ZapEntry[]>({
    queryKey: ['release-zap-counts', eventId],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(5000)]);

      // Query for all zap receipts (kind 9735) on this event
      const zapEvents = await nostr.query([{
        kinds: [9735],
        '#e': [eventId],
        limit: 500 // Reasonable limit to prevent too many results
      }], { signal });

      console.log('useZapCounts debug:', {
        eventId,
        zapEvents: zapEvents.length,
        events: zapEvents.map(e => ({ pubkey: e.pubkey, created_at: e.created_at, id: e.id }))
      });

      // Filter valid zap events and convert to zap entries
      const zapEntries: ZapEntry[] = zapEvents
        .filter(validateZapEvent)
        .map((event: NostrEvent) => {
          const amount = extractZapAmount(event);
          const zapperPubkey = extractZapperPubkey(event) || event.pubkey; // Fallback to event pubkey
          
          return {
            userPubkey: zapperPubkey,
            amount,
            timestamp: new Date(event.created_at * 1000),
            eventId: event.id
          };
        })
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()); // Sort by newest first

      console.log('useZapCounts after processing:', {
        eventId,
        originalCount: zapEvents.length,
        validCount: zapEntries.length,
        totalSats: zapEntries.reduce((sum, zap) => sum + zap.amount, 0),
        zapEntries: zapEntries.map(z => ({ 
          pubkey: z.userPubkey, 
          amount: z.amount,
          timestamp: z.timestamp.toISOString(),
          eventId: z.eventId 
        }))
      });

      return zapEntries;
    },
    staleTime: 60000, // 1 minute
    enabled: !!eventId,
  });

  // Calculate totals
  const count = zaps.length;
  const totalSats = zaps.reduce((sum, zap) => sum + zap.amount, 0);

  return {
    zaps,
    count,
    totalSats,
    isLoading,
    error: error as Error | null,
  };
}