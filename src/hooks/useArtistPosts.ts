import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import { getArtistPubkeyHex } from '@/lib/podcastConfig';

/**
 * Hook to fetch the artist's social posts (kind 1 text notes) with infinite scroll
 */
export function useArtistPosts(limit: number = 20) {
  const { nostr } = useNostr();

  return useInfiniteQuery({
    queryKey: ['artist-posts'],
    queryFn: async ({ pageParam }) => {
      const signal = AbortSignal.any([AbortSignal.timeout(10000)]);

      // Query for text notes (kind 1) from the artist
      const events = await nostr.query([{
        kinds: [1], // Text notes
        authors: [getArtistPubkeyHex()],
        limit: limit * 2, // Get more to filter out replies
        until: pageParam, // Use until for pagination
      }], { signal });

      // Filter out replies (events that have 'e' tags) to only show root notes
      const rootNotes = events.filter(event =>
        !event.tags.some(tag => tag[0] === 'e')
      );

      // Sort by creation time (most recent first)
      return rootNotes.sort((a, b) => b.created_at - a.created_at).slice(0, limit);
    },
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (lastPage, allPages) => {
      // If we got fewer results than requested, we've reached the end
      if (lastPage.length < limit) return undefined;

      // If no posts were returned, we've reached the end
      if (lastPage.length === 0) return undefined;

      // Get the oldest timestamp from this page
      const oldestTimestamp = lastPage[lastPage.length - 1].created_at;

      // To prevent infinite loops, check if we're getting the same timestamp
      // This can happen when there are very few posts
      const allTimestamps = allPages.flat().map(event => event.created_at);
      if (allTimestamps.includes(oldestTimestamp)) {
        // We've seen this timestamp before, likely no more unique posts
        return undefined;
      }

      return oldestTimestamp;
    },
    staleTime: 10000, // 10 seconds - more aggressive refresh for artist posts
  });
}

/**
 * Hook to fetch the artist's reposts (kind 6 and 16)
 */
export function useArtistReposts(limit: number = 50) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['artist-reposts', limit],
    queryFn: async (context) => {
      const signal = AbortSignal.any([context.signal, AbortSignal.timeout(10000)]);

      // Query for both legacy (kind 6) and generic (kind 16) reposts from the artist
      const events = await nostr.query([{
        kinds: [6, 16], // Legacy reposts and generic reposts
        authors: [getArtistPubkeyHex()],
        limit: limit
      }], { signal });

      return events.sort((a, b) => b.created_at - a.created_at);
    },
    staleTime: 60000, // 1 minute
  });
}

/**
 * Hook to fetch artist's social activity (posts + reposts combined)
 */
export function useArtistActivity(limit: number = 50) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['artist-activity', limit],
    queryFn: async (context) => {
      const signal = AbortSignal.any([context.signal, AbortSignal.timeout(10000)]);

      // Query for multiple kinds from the artist
      const events = await nostr.query([{
        kinds: [1, 6, 16, 7], // Text notes, legacy reposts, generic reposts, reactions
        authors: [getArtistPubkeyHex()],
        limit: limit * 2 // Get more to ensure we have enough after filtering
      }], { signal });

      // Sort by creation time and limit results
      return events
        .sort((a, b) => b.created_at - a.created_at)
        .slice(0, limit);
    },
    staleTime: 60000, // 1 minute
  });
}

/**
 * Hook to fetch replies to the artist's posts (excluding artist's own replies)
 */
export function useRepliesToArtist(limit: number = 50) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['replies-to-artist', limit],
    queryFn: async (context) => {
      const signal = AbortSignal.any([context.signal, AbortSignal.timeout(10000)]);

      // First get artist's posts to find their event IDs
      const artistPosts = await nostr.query([{
        kinds: [1], // Only text notes
        authors: [getArtistPubkeyHex()],
        limit: 100 // Get more posts to find replies to
      }], { signal });

      if (artistPosts.length === 0) {
        return [];
      }

      // Get the event IDs to search for replies
      const artistEventIds = artistPosts.map(event => event.id);

      // Query for replies that reference the artist's posts
      const replies = await nostr.query([{
        kinds: [1], // Text notes (replies)
        '#e': artistEventIds, // References to artist's events
        limit: limit * 2
      }], { signal });

      // Filter out the artist's own posts and sort by creation time
      return replies
        .filter(reply => reply.pubkey !== getArtistPubkeyHex())
        .sort((a, b) => b.created_at - a.created_at)
        .slice(0, limit);
    },
    staleTime: 60000, // 1 minute
  });
}

/**
 * Hook to fetch artist's replies and the original notes they replied to with infinite scroll
 */
export function useArtistRepliesWithContext(limit: number = 20) {
  const { nostr } = useNostr();

  return useInfiniteQuery({
    queryKey: ['artist-replies-with-context'],
    queryFn: async ({ pageParam }) => {
      const signal = AbortSignal.any([AbortSignal.timeout(10000)]);

      // Get artist's replies (posts that have 'e' tags - indicating they're replies)
      const artistReplies = await nostr.query([{
        kinds: [1], // Text notes
        authors: [getArtistPubkeyHex()],
        limit: limit * 2,
        until: pageParam, // Use until for pagination
      }], { signal });

      // Filter to only get actual replies (posts with 'e' tags)
      const actualReplies = artistReplies.filter(reply =>
        reply.tags.some(tag => tag[0] === 'e')
      );

      if (actualReplies.length === 0) {
        return [];
      }

      // Get the event IDs that the artist replied to
      const repliedToEventIds = actualReplies
        .map(reply => reply.tags.find(tag => tag[0] === 'e')?.[1])
        .filter((id): id is string => Boolean(id));

      // Fetch the original events the artist replied to replied to
      const originalEvents = await nostr.query([{
        ids: repliedToEventIds
      }], { signal });

      // Create a map of original events for easy lookup
      const originalEventsMap = new Map(
        originalEvents.map(event => [event.id, event])
      );

      // Combine replies with their original events, sort by reply creation time
      const repliesWithContext = actualReplies
        .map(reply => {
          const originalEventId = reply.tags.find(tag => tag[0] === 'e')?.[1];
          const originalEvent = originalEventId ? originalEventsMap.get(originalEventId) : undefined;

          return {
            reply,
            originalEvent,
            // Use reply timestamp for sorting since that's when artist participated
            timestamp: reply.created_at
          };
        })
        .filter(item => item.originalEvent) // Only include if we found the original
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, limit);

      // Flatten to include both original and reply events for rendering
      const result: typeof originalEvents = [];
      for (const { reply, originalEvent } of repliesWithContext) {
        if (originalEvent) {
          // Add original event first, then the reply
          result.push(originalEvent, reply);
        }
      }

      return result;
    },
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (lastPage, allPages) => {
      // If we got fewer results than expected, we've reached the end
      if (lastPage.length === 0) return undefined;

      // Find the oldest reply timestamp for pagination
      const replyEvents = lastPage.filter((event, index) => index % 2 === 1); // Replies are at odd indices
      if (replyEvents.length === 0) return undefined;

      const oldestTimestamp = Math.min(...replyEvents.map(e => e.created_at));

      // To prevent infinite loops, check if we're getting the same timestamp
      const allReplyTimestamps = allPages
        .flat()
        .filter((event, index) => index % 2 === 1) // Get all reply events
        .map(event => event.created_at);

      if (allReplyTimestamps.includes(oldestTimestamp)) {
        // We've seen this timestamp before, likely no more unique replies
        return undefined;
      }

      return oldestTimestamp;
    },
    staleTime: 60000, // 1 minute
  });
}

/**
 * Hook to fetch artist's notes only (no reposts)
 */
export function useArtistNotes(limit: number = 50) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['artist-notes', limit],
    queryFn: async (context) => {
      const signal = AbortSignal.any([context.signal, AbortSignal.timeout(10000)]);

      // Query for text notes only from the artist
      const events = await nostr.query([{
        kinds: [1], // Only text notes
        authors: [getArtistPubkeyHex()],
        limit: limit
      }], { signal });

      return events.sort((a, b) => b.created_at - a.created_at);
    },
    staleTime: 60000, // 1 minute
  });
}

/**
 * Hook for Replies tab - shows only artist's replies with original context (Twitter style)
 * Each reply shows: Original note + Artist's reply
 */
export function useArtistRepliesTab(limit: number = 50) {
  return useArtistRepliesWithContext(limit);
}