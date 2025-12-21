import { useQuery } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import type { NostrEvent } from '@nostrify/nostrify';
import type { PodcastRelease, ReleaseSearchOptions, ReleaseTrack } from '@/types/podcast';
import { getArtistPubkeyHex, PODCAST_KINDS } from '@/lib/podcastConfig';
import { extractZapAmount, validateZapEvent } from '@/lib/zapUtils';

/**
 * Validates if a Nostr event is a valid podcast release (NIP-54)
 */
function validateRelease(event: NostrEvent): boolean {
  if (event.kind !== PODCAST_KINDS.RELEASE) return false;

  // Check for required title tag (NIP-54)
  const title = event.tags.find(([name]) => name === 'title')?.[1];
  if (!title) return false;

  // Verify it's from the music artist
  if (event.pubkey !== getArtistPubkeyHex()) return false;

  return true;
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
 * Converts a validated Nostr event to a PodcastRelease object
 */
export function eventToPodcastRelease(event: NostrEvent): PodcastRelease {
  const tags = new Map(event.tags.map(([key, ...values]) => [key, values]));

  const title = tags.get('title')?.[0] || 'Untitled Release';
  const description = tags.get('description')?.[0];
  const imageUrl = tags.get('image')?.[0];

  // Parse tracklist from event content (JSON array of tracks)
  let tracks: ReleaseTrack[] = [];

  try {
    if (event.content) {
      const parsed = JSON.parse(event.content);
      if (Array.isArray(parsed)) {
        tracks = parsed.map((track): ReleaseTrack => ({
          title: track.title || '',
          audioUrl: track.audioUrl || '',
          audioType: track.audioType || 'audio/mpeg',
          duration: track.duration,
          explicit: track.explicit || false,
        }));
      }
    }
  } catch (error) {
    console.warn('Failed to parse tracklist from event content:', error);
  }

  console.log('Parsed tracks:', tracks);

  // Extract all 't' tags for topics
  const topicTags = event.tags
    .filter(([name]) => name === 't')
    .map(([, value]) => value);

  // Extract identifier from 'd' tag (for addressable events)
  const identifier = tags.get('d')?.[0] || event.id; // Fallback to event ID for backward compatibility

  // Extract publication date from pubdate tag with fallback to created_at
  const pubdateStr = tags.get('pubdate')?.[0];
  let publishDate: Date;
  try {
    publishDate = pubdateStr ? new Date(pubdateStr) : new Date(event.created_at * 1000);
  } catch {
    publishDate = new Date(event.created_at * 1000);
  }

  // Extract transcript URL from tag
  const transcriptUrl = tags.get('transcript')?.[0];

  return {
    id: event.id,
    title,
    description,
    content: undefined,
    imageUrl,
    publishDate,
    tags: topicTags,
    transcriptUrl,
    externalRefs: [],
    eventId: event.id,
    artistPubkey: event.pubkey,
    identifier,
    createdAt: new Date(event.created_at * 1000),
    tracks: tracks,
  };
}

/**
 * Hook to fetch all podcast releases from the artist
 */
export function useReleases(options: ReleaseSearchOptions = {}) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['releases', options],
    queryFn: async (context) => {
      const signal = AbortSignal.any([context.signal, AbortSignal.timeout(10000)]);

      const events = await nostr.query([{
        kinds: [PODCAST_KINDS.RELEASE],
        authors: [getArtistPubkeyHex()],
        limit: options.limit || 100
      }], { signal });

      // Filter and validate events
      const validEvents = events.filter(validateRelease);

      console.log('Fetched releases:', validEvents);

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
        if (!existing) {
          releasesByTitle.set(title, event);
        } else {
          // Keep the event with the latest created_at (most recent edit)
          // This ensures we get the latest content while preserving pubdate for sorting
          if (event.created_at > existing.created_at) {
            releasesByTitle.set(title, event);
          }
        }
      });

      // Convert to podcast releases
      const validReleases = Array.from(releasesByTitle.values()).map(eventToPodcastRelease);

      // Fetch zap data for all releases in a single query
      const releaseIds = validReleases.map(ep => ep.eventId);

      const zapData: Map<string, { count: number; totalSats: number }> = new Map();

      if (releaseIds.length > 0) {
        try {
          // Query for all zaps to these releaseEventss
          const zapEvents = await nostr.query([{
            kinds: [9735], // Zap receipts
            '#e': releaseIds, // Releases being zapped
            limit: 2000 // High limit to get all zaps
          }], { signal });

          // Process zap events and group by releaseEvents
          const validZaps = zapEvents.filter(validateZapEvent);

          validZaps.forEach(zapEvent => {
            const releaseId = zapEvent.tags.find(([name]) => name === 'e')?.[1];
            if (!releaseId) return;

            const amount = extractZapAmount(zapEvent);
            const existing = zapData.get(releaseId) || { count: 0, totalSats: 0 };

            zapData.set(releaseId, {
              count: existing.count + 1,
              totalSats: existing.totalSats + amount
            });
          });
        } catch (error) {
          console.warn('Failed to fetch zap data for releases:', error);
          // Continue without zap data rather than failing completely
        }
      }

      // Add zap counts to releases
      const releasesWithZaps = validReleases.map(release => {
        const zaps = zapData.get(release.eventId);
        return {
          ...release,
          ...(zaps && zaps.count > 0 ? { zapCount: zaps.count } : {}),
          ...(zaps && zaps.totalSats > 0 ? { totalSats: zaps.totalSats } : {})
        };
      });


      // Apply search filtering
      let filteredReleases = releasesWithZaps;

      if (options.query) {
        const query = options.query.toLowerCase();
        filteredReleases = filteredReleases.filter(release =>
          release.title.toLowerCase().includes(query) ||
          release.description?.toLowerCase().includes(query) ||
          release.content?.toLowerCase().includes(query)
        );
      }

      if (options.tags && options.tags.length > 0) {
        filteredReleases = filteredReleases.filter(release =>
          options.tags!.some(tag => release.tags.includes(tag))
        );
      }

      // Apply sorting
      const sortBy = options.sortBy || 'date';
      const sortOrder = options.sortOrder || 'desc';

      filteredReleases.sort((a, b) => {
        let comparison = 0;

        switch (sortBy) {
          case 'date':
            comparison = a.publishDate.getTime() - b.publishDate.getTime();
            break;
          case 'title':
            comparison = a.title.localeCompare(b.title);
            break;
          case 'zaps':
            comparison = (a.zapCount || 0) - (b.zapCount || 0);
            break;
          case 'comments':
            comparison = (a.commentCount || 0) - (b.commentCount || 0);
            break;
        }

        return sortOrder === 'desc' ? -comparison : comparison;
      });

      // Apply offset
      if (options.offset) {
        filteredReleases = filteredReleases.slice(options.offset);
      }

      return filteredReleases;
    },
    staleTime: 60000, // 1 minute
  });
}

/**
 * Hook to fetch a single podcast release by ID
 */
export function usePodcastRelease(releaseEventsId: string) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['podcast-releaseEvents', releaseEventsId],
    queryFn: async (context) => {
      const signal = AbortSignal.any([context.signal, AbortSignal.timeout(5000)]);

      const events = await nostr.query([{
        ids: [releaseEventsId]
      }], { signal });

      const event = events[0];
      if (!event || !validateRelease(event)) {
        return null;
      }

      return eventToPodcastRelease(event);
    },
    enabled: !!releaseEventsId,
    staleTime: 300000, // 5 minutes
  });
}

/**
 * Hook to get the latest releaseEvents
 * Uses the same query as the Recent Releases section to ensure cache consistency
 */
export function useLatestRelease() {
  const { data: releaseEventss, ...rest } = useReleases({
    limit: 50, // Use a reasonable default that covers most use cases
    sortBy: 'date',
    sortOrder: 'desc'
  });

  return {
    data: releaseEventss?.[0] || null,
    ...rest
  };
}

/**
 * Hook to get podcast statistics
 */
export function usePodcastStats() {
  const { data: releaseEventss } = useReleases();

  return useQuery({
    queryKey: ['podcast-stats', releaseEventss?.length],
    queryFn: async () => {
      if (!releaseEventss) return null;

      const totalReleases = releaseEventss.length;
      const totalZaps = releaseEventss.reduce((sum, ep) => sum + (ep.zapCount || 0), 0);
      const totalComments = releaseEventss.reduce((sum, ep) => sum + (ep.commentCount || 0), 0);
      const totalReposts = releaseEventss.reduce((sum, ep) => sum + (ep.repostCount || 0), 0);

      const mostZappedreleaseEvents = releaseEventss.reduce((max, ep) =>
        (ep.zapCount || 0) > (max?.zapCount || 0) ? ep : max, releaseEventss[0]
      );

      const mostCommentedreleaseEvents = releaseEventss.reduce((max, ep) =>
        (ep.commentCount || 0) > (max?.commentCount || 0) ? ep : max, releaseEventss[0]
      );

      return {
        totalReleases,
        totalZaps,
        totalComments,
        totalReposts,
        mostZappedRelease: mostZappedreleaseEvents?.zapCount ? mostZappedreleaseEvents : undefined,
        mostCommentedreleaseEvents: mostCommentedreleaseEvents?.commentCount ? mostCommentedreleaseEvents : undefined,
        recentEngagement: [] // TODO: Implement recent engagement tracking
      };
    },
    enabled: !!releaseEventss,
    staleTime: 300000, // 5 minutes
  });
}