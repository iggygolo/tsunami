import { useQuery } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import { useReleases } from '@/hooks/useReleases';
import type { ZapLeaderboardEntry } from '@/types/music';
import { extractZapAmount, extractZapperPubkey, validateZapEvent, extractZappedEventId } from '@/lib/zapUtils';

/**
 * Hook to discover music artists from existing releases
 */
function useDiscoveredMusicArtists() {
  const { data: releases } = useReleases();
  
  // Extract unique artist pubkeys from releases
  const artistPubkeys = Array.from(new Set(
    (releases || []).map(release => release.artistPubkey).filter(Boolean)
  ));

  return {
    artistPubkeys,
    artistCount: artistPubkeys.length
  };
}

/**
 * Hook to fetch zap leaderboard across all community artists
 */
export function useCommunityZapLeaderboard(limit: number = 10) {
  const { nostr } = useNostr();
  const { artistPubkeys } = useDiscoveredMusicArtists();

  return useQuery({
    queryKey: ['community-zap-leaderboard', limit, artistPubkeys.length],
    queryFn: async (context) => {
      if (artistPubkeys.length === 0) {
        return [];
      }

      const signal = AbortSignal.any([context.signal, AbortSignal.timeout(15000)]);
      
      // Fetch zaps targeting all discovered artists
      const filter = {
        kinds: [9735], // Zap events
        '#p': artistPubkeys, // Zaps targeting any of the discovered artists
        limit: 2000 // Get more zaps to aggregate across all artists
      };

      const zapEvents = await nostr.query([filter], { signal });

      // Aggregate zaps by sender across all artists
      const zapAggregation = new Map<string, {
        totalAmount: number;
        zapCount: number;
        lastZapDate: Date;
      }>();

      zapEvents.forEach(zapEvent => {
        // Validate the zap event structure
        if (!validateZapEvent(zapEvent)) {
          console.warn('Invalid zap event structure:', zapEvent.id);
          return;
        }

        // Extract amount using proper bolt11/description parsing
        const amount = extractZapAmount(zapEvent);
        
        // Extract the actual zapper's pubkey (from P tag, not event pubkey)
        const zapperPubkey = extractZapperPubkey(zapEvent);
        if (!zapperPubkey) {
          console.warn('No zapper pubkey found in zap event:', zapEvent.id);
          return;
        }
        
        const zapDate = new Date(zapEvent.created_at * 1000);

        const existing = zapAggregation.get(zapperPubkey);
        if (existing) {
          existing.totalAmount += amount;
          existing.zapCount += 1;
          if (zapDate > existing.lastZapDate) {
            existing.lastZapDate = zapDate;
          }
        } else {
          zapAggregation.set(zapperPubkey, {
            totalAmount: amount,
            zapCount: 1,
            lastZapDate: zapDate
          });
        }
      });

      // Convert to leaderboard entries and sort by total amount
      const leaderboard: ZapLeaderboardEntry[] = Array.from(zapAggregation.entries())
        .map(([pubkey, stats]) => ({
          userPubkey: pubkey,
          ...stats
        }))
        .sort((a, b) => b.totalAmount - a.totalAmount)
        .slice(0, limit);

      return leaderboard;
    },
    staleTime: 300000, // 5 minutes
    enabled: artistPubkeys.length > 0,
  });
}

/**
 * Hook to get recent zap activity across all community artists
 */
export function useCommunityRecentZapActivity(limit: number = 20) {
  const { nostr } = useNostr();
  const { artistPubkeys } = useDiscoveredMusicArtists();

  return useQuery({
    queryKey: ['community-recent-zap-activity', limit, artistPubkeys.length],
    queryFn: async (context) => {
      if (artistPubkeys.length === 0) {
        return [];
      }

      const signal = AbortSignal.any([context.signal, AbortSignal.timeout(15000)]);
      
      // Get recent zap events targeting all discovered artists
      const zapEvents = await nostr.query([{
        kinds: [9735],
        '#p': artistPubkeys, // Zaps targeting any of the discovered artists
        limit: limit * 2 // Get more to account for filtering
      }], { signal });

      // Filter and sort by creation time (most recent first)
      return zapEvents
        .filter(validateZapEvent) // Only include valid zap events
        .sort((a, b) => b.created_at - a.created_at)
        .map(zapEvent => {
          // Extract amount using proper bolt11/description parsing
          const amount = extractZapAmount(zapEvent);
          
          // Extract the actual zapper's pubkey (from P tag, not event pubkey)
          const zapperPubkey = extractZapperPubkey(zapEvent);
          
          // Extract the release being zapped (if any)
          const releaseId = extractZappedEventId(zapEvent);

          // Get the target artist pubkey from the zap event
          const targetArtistPubkey = zapEvent.tags.find(tag => tag[0] === 'p')?.[1];

          return {
            id: zapEvent.id,
            userPubkey: zapperPubkey || zapEvent.pubkey, // Fallback to event pubkey if no P tag
            amount,
            releaseId,
            targetArtistPubkey, // The artist being zapped
            timestamp: new Date(zapEvent.created_at * 1000),
            zapEvent
          };
        })
        .filter(activity => activity.userPubkey) // Remove entries without valid zapper pubkey
        .slice(0, limit); // Limit final results
    },
    staleTime: 60000, // 1 minute
    enabled: artistPubkeys.length > 0,
  });
}