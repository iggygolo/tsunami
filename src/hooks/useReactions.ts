import { useQuery } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import type { NostrEvent } from '@nostrify/nostrify';

export interface ReactionEntry {
  userPubkey: string;
  timestamp: Date;
  eventId: string;
}

export interface ReactionsData {
  reactions: ReactionEntry[];
  count: number;
  hasUserLiked: boolean;
  isLoading: boolean;
  error: Error | null;
}

export function useReactions(eventId: string): ReactionsData {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();

  const { data: reactions = [], isLoading, error } = useQuery<ReactionEntry[]>({
    queryKey: ['release-reactions', eventId],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(5000)]);

      // Query for all likes (kind 7) on this event
      const likeEvents = await nostr.query([{
        kinds: [7],
        '#e': [eventId],
        limit: 100 // Limit to prevent too many results
      }], { signal });

      // Query for deletion events (kind 5) that might delete likes
      const deletionEvents = await nostr.query([{
        kinds: [5],
        '#k': ['7'], // Deletions of like events
        limit: 100
      }], { signal });

      console.log('useReactions debug:', {
        eventId,
        likeEvents: likeEvents.length,
        deletionEvents: deletionEvents.length,
        events: likeEvents.map(e => ({ pubkey: e.pubkey, created_at: e.created_at, id: e.id }))
      });

      // Create a set of deleted event IDs
      const deletedEventIds = new Set<string>();
      deletionEvents.forEach((delEvent: NostrEvent) => {
        const deletedIds = delEvent.tags
          .filter(([key]) => key === 'e')
          .map(([, eventId]) => eventId);
        deletedIds.forEach(id => deletedEventIds.add(id));
      });

      // Filter out deleted like events
      const validLikeEvents = likeEvents.filter((event: NostrEvent) => 
        !deletedEventIds.has(event.id)
      );

      // Convert to reaction entries and sort by timestamp (newest first)
      const reactionEntries: ReactionEntry[] = validLikeEvents
        .map((event: NostrEvent) => ({
          userPubkey: event.pubkey,
          timestamp: new Date(event.created_at * 1000),
          eventId: event.id
        }))
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      // Remove duplicates (same user liking multiple times, keep the latest)
      const uniqueReactions = new Map<string, ReactionEntry>();
      reactionEntries.forEach(reaction => {
        const existing = uniqueReactions.get(reaction.userPubkey);
        if (!existing || reaction.timestamp > existing.timestamp) {
          uniqueReactions.set(reaction.userPubkey, reaction);
        }
      });

      const finalReactions = Array.from(uniqueReactions.values())
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      console.log('useReactions after deduplication and deletion filtering:', {
        eventId,
        originalCount: reactionEntries.length,
        deletedCount: deletedEventIds.size,
        uniqueCount: finalReactions.length,
        finalReactions: finalReactions.map(r => ({ 
          pubkey: r.userPubkey, 
          timestamp: r.timestamp.toISOString(),
          eventId: r.eventId 
        }))
      });

      return finalReactions;
    },
    staleTime: 60000, // 1 minute
    enabled: !!eventId,
  });

  // Check if current user has liked
  const hasUserLiked = user?.pubkey ? reactions.some(r => r.userPubkey === user.pubkey) : false;

  return {
    reactions,
    count: reactions.length,
    hasUserLiked,
    isLoading,
    error: error as Error | null,
  };
}