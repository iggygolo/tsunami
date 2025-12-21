import { useQuery } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import { getArtistPubkeyHex, PODCAST_KINDS } from '@/lib/podcastConfig';
import { genRSSFeed } from '@/lib/rssGenerator';
import type { PodcastRelease } from '@/types/podcast';
import type { NostrEvent } from '@nostrify/nostrify';

/**
 * Validates if a Nostr event is a valid podcast release (NIP-54)
 */
function validatePodcastRelease(event: NostrEvent): boolean {
  if (event.kind !== PODCAST_KINDS.RELEASE) return false;

  // Check for required title tag (NIP-54)
  const title = event.tags.find(([name]) => name === 'title')?.[1];
  if (!title) return false;

  // Check for required audio tag (NIP-54)
  const audio = event.tags.find(([name]) => name === 'audio')?.[1];
  if (!audio) return false;

  // Verify it's from the music artist
  if (event.pubkey !== getArtistPubkeyHex()) return false;

  return true;
}

/**
 * Converts a validated Nostr event to a PodcastRelease object
 */
function eventToPodcastRelease(event: NostrEvent): PodcastRelease {
  const tags = new Map(event.tags.map(([key, ...values]) => [key, values]));

  const title = tags.get('title')?.[0] || 'Untitled Release';
  const description = tags.get('description')?.[0];
  const imageUrl = tags.get('image')?.[0];

  // Extract audio URL and type from audio tag (NIP-54 format)
  const audioTag = tags.get('audio');
  const audioUrl = audioTag?.[0] || '';
  const audioType = audioTag?.[1] || 'audio/mpeg';

  // Extract all 't' tags for topics
  const topicTags = event.tags
    .filter(([name]) => name === 't')
    .map(([, value]) => value);

  // Extract identifier from 'd' tag (for addressable events)
  const identifier = tags.get('d')?.[0] || event.id; // Fallback to event ID for backward compatibility

  return {
    id: event.id,
    title,
    description,
    content: event.content || undefined,
    tracks: audioUrl ? [{
      title: title,
      audioUrl,
      audioType,
      duration: undefined,
      explicit: false,
    }] : [],
    imageUrl,
    publishDate: new Date(event.created_at * 1000),
    tags: topicTags,
    externalRefs: [],
    eventId: event.id,
    artistPubkey: event.pubkey,
    identifier,
    createdAt: new Date(event.created_at * 1000),
  };
}

/**
 * Checks if an event is an edit of another event
 */
function isEditEvent(event: NostrEvent): boolean {
  return event.tags.some(([name]) => name === 'edit');
}

/**
 * Gets the original event ID from an edit event
 */
function getOriginalEventId(event: NostrEvent): string | undefined {
  return event.tags.find(([name]) => name === 'edit')?.[1];
}

/**
 * Hook to fetch podcast releases and generate RSS feed
 */
export function useRSSFeedGenerator() {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['rss-feed-generator'],
    queryFn: async () => {
      try {
        // Fetch podcast releases (kind 54 for NIP-54 podcast releases)
        const events = await nostr.query([
          {
            kinds: [PODCAST_KINDS.RELEASE],
            authors: [getArtistPubkeyHex()],
            limit: 100,
          }
        ]);

        // Filter and validate events
        const validEvents = events.filter(validatePodcastRelease);

        // Deduplicate releases by title - keep only the latest version of each title
        const releasesByTitle = new Map<string, NostrEvent>();
        const originalEvents = new Set<string>(); // Track original events that have been edited

        // First pass: identify edited events and their originals
        validEvents.forEach(event => {
          if (isEditEvent(event)) {
            const originalId = getOriginalEventId(event);
            if (originalId) {
              originalEvents.add(originalId);
            }
          }
        });

        // Second pass: select the best version for each title
        validEvents.forEach(event => {
          const title = event.tags.find(([name]) => name === 'title')?.[1] || '';
          if (!title) return;

          // Skip if this is an original event that has been edited
          if (originalEvents.has(event.id)) return;

          const existing = releasesByTitle.get(title);
          if (!existing || event.created_at > existing.created_at) {
            releasesByTitle.set(title, event);
          }
        });

        // Convert to podcast releases
        const releases = Array.from(releasesByTitle.values()).map(eventToPodcastRelease);

        // Sort by publish date (newest first for RSS)
        releases.sort((a, b) => b.publishDate.getTime() - a.publishDate.getTime());

        // Generate RSS feed with the current configuration and releases
        await genRSSFeed(releases);

        return {
          releases,
          rssGenerated: true,
          lastGenerated: new Date(),
        };
      } catch (error) {
        console.error('Failed to generate RSS feed:', error);
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
}