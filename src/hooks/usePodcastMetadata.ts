import { useQuery } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import { PODCAST_CONFIG, PODCAST_KINDS, getCreatorPubkeyHex } from '@/lib/podcastConfig';

interface PodcastMetadata {
  author: string;
  description: string;
  email: string;
  image: string;
  website: string;
  copyright: string;
  funding: string[];
  value: {
    amount: number;
    currency: string;
    recipients?: Array<{
      name: string;
      type: 'node' | 'lnaddress';
      address: string;
      split: number;
      customKey?: string;
      customValue?: string;
      fee?: boolean;
    }>;
  };
  updated_at: number;
}

export function usePodcastMetadata() {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['podcast-metadata'],
    queryFn: async (context): Promise<PodcastMetadata> => {
      try {
        // Query for podcast metadata events with shorter timeout for speed
        // NPool will query all configured relays and return results from fastest responders
        const signal = AbortSignal.any([context.signal, AbortSignal.timeout(3000)]);

        const events = await nostr.query([
          {
            kinds: [PODCAST_KINDS.PODCAST_METADATA], // Addressable podcast metadata event
            authors: [getCreatorPubkeyHex()],
            '#d': ['podcast-metadata'],
            limit: 1 // Only need the most recent event
          }
        ], { signal });

        if (events.length > 0) {
          // Get the most recent event
          const latestEvent = events.reduce((latest, current) =>
            current.created_at > latest.created_at ? current : latest
          );

          const metadata = JSON.parse(latestEvent.content);
          return {
            ...metadata,
            updated_at: latestEvent.created_at
          };
        }
      } catch (error) {
        console.warn('Failed to fetch podcast metadata from Nostr, using fallback:', error);
      }

      // Fallback to config (includes environment variables)
      return {
        description: PODCAST_CONFIG.podcast.description,
        author: PODCAST_CONFIG.podcast.author,
        email: PODCAST_CONFIG.podcast.email,
        image: PODCAST_CONFIG.podcast.image,
        website: PODCAST_CONFIG.podcast.website,
        copyright: PODCAST_CONFIG.podcast.copyright,
        funding: PODCAST_CONFIG.podcast.funding || [],
        value: {
          amount: PODCAST_CONFIG.podcast.value.amount,
          currency: PODCAST_CONFIG.podcast.value.currency,
          recipients: PODCAST_CONFIG.podcast.value.recipients || []
        },
        updated_at: 0
      };
    },
    staleTime: 10 * 60 * 1000, // 10 minutes - cache longer for speed
    gcTime: 60 * 60 * 1000, // 1 hour
    retry: 1, // Only retry once for faster failure
    retryDelay: 500, // Quick retry
  });
}