import { useQueryClient } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import { PODCAST_KINDS } from '@/lib/podcastConfig';
import type { PodcastRelease } from '@/types/podcast';

/**
 * Hook to prefetch release data for better navigation performance
 */
export function useReleasePrefetch() {
  const { nostr } = useNostr();
  const queryClient = useQueryClient();

  const prefetchRelease = async (release: PodcastRelease) => {
    const releaseKey = `${release.artistPubkey}:${PODCAST_KINDS.MUSIC_PLAYLIST}:${release.identifier}`;
    
    // Check if we already have this data cached
    const cachedEvent = queryClient.getQueryData(['release-event', releaseKey]);
    const cachedConversion = queryClient.getQueryData(['release-conversion', release.eventId]);
    
    // If we already have both cached, no need to prefetch
    if (cachedEvent && cachedConversion) {
      return;
    }

    try {
      // Prefetch the release event if not cached
      if (!cachedEvent) {
        await queryClient.prefetchQuery({
          queryKey: ['release-event', releaseKey],
          queryFn: async () => {
            const events = await nostr.query([{
              kinds: [PODCAST_KINDS.MUSIC_PLAYLIST],
              authors: [release.artistPubkey],
              '#d': [release.identifier],
              limit: 1
            }], { signal: AbortSignal.timeout(5000) });
            
            return events[0] || null;
          },
          staleTime: 300000, // 5 minutes
        });
      }

      // The track resolution and conversion will be handled by the actual useReleaseData hook
      // when the user navigates to the page, but having the event cached will speed things up significantly
      
    } catch (error) {
      // Silently fail prefetch - it's just an optimization
      console.debug('Failed to prefetch release data:', error);
    }
  };

  return { prefetchRelease };
}