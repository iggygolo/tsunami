import { useQuery } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import { MUSIC_KINDS, getArtistPubkeyHex } from '@/lib/musicConfig';
import { useReleases } from '@/hooks/useReleases';
import type { PodcastRelease } from '@/types/podcast';

interface MusicAnalytics {
  totalReleases: number;
  totalZaps: number;
  totalComments: number;
  totalReposts: number;
  topReleases: Array<{
    release: PodcastRelease;
    zaps: number;
    comments: number;
    reposts: number;
    totalEngagement: number;
  }>;
  recentActivity: Array<{
    type: 'zap' | 'comment' | 'repost';
    releaseId: string;
    releaseTitle: string;
    timestamp: Date;
    amount?: number; // for zaps
    author?: string; // for comments/reposts
  }>;
  engagementOverTime: Array<{
    date: string;
    zaps: number;
    comments: number;
    reposts: number;
  }>;
}

/**
 * Comprehensive analytics hook for music performance tracking
 */
export function useMusicAnalytics() {
  const { nostr } = useNostr();
  const artistPubkeyHex = getArtistPubkeyHex();
  const { data: releases } = useReleases();

  return useQuery<MusicAnalytics>({
    queryKey: ['podcast-analytics', artistPubkeyHex],
    queryFn: async (context) => {
      const signal = AbortSignal.any([context.signal, AbortSignal.timeout(5000)]);

      if (!releases || releases.length === 0) {
        // Return empty analytics if no releases
        return {
          totalReleases: 0,
          totalZaps: 0,
          totalComments: 0,
          totalReposts: 0,
          topReleases: [],
          recentActivity: [],
          engagementOverTime: [],
        };
      }

      // Get all release event IDs for filtering
      const releaseEventIds = releases.map(ep => ep.eventId);

      // Fetch all engagement events in parallel
      const [zapEvents, commentEvents, repostEvents] = await Promise.all([
        // Zaps (kind 9735) targeting our releases
        nostr.query([{
          kinds: [9735],
          '#e': releaseEventIds,
          limit: 1000
        }], { signal }).catch(() => []),

        // Comments (kind 1111) targeting our releases  
        nostr.query([{
          kinds: [MUSIC_KINDS.COMMENT],
          '#e': releaseEventIds,
          limit: 1000
        }], { signal }).catch(() => []),

        // Reposts (kind 6 and 16) targeting our releases
        nostr.query([{
          kinds: [6, 16],
          '#e': releaseEventIds,
          limit: 1000
        }], { signal }).catch(() => []),
      ]);

      // Calculate totals
      const totalZaps = zapEvents.length;
      const totalComments = commentEvents.length;
      const totalReposts = repostEvents.length;

      // Calculate per-release engagement
      const releaseEngagement = releases.map(release => {
        const releaseZaps = zapEvents.filter(e => 
          e.tags.some(([name, value]) => name === 'e' && value === release.eventId)
        );
        const releaseComments = commentEvents.filter(e =>
          e.tags.some(([name, value]) => name === 'e' && value === release.eventId)  
        );
        const releaseReposts = repostEvents.filter(e =>
          e.tags.some(([name, value]) => name === 'e' && value === release.eventId)
        );

        return {
          release,
          zaps: releaseZaps.length,
          comments: releaseComments.length,
          reposts: releaseReposts.length,
          totalEngagement: releaseZaps.length + releaseComments.length + releaseReposts.length
        };
      });

      // Sort releases by engagement
      const topReleases = releaseEngagement
        .sort((a, b) => b.totalEngagement - a.totalEngagement)
        .slice(0, 5);

      // Create recent activity feed
      const allActivity = [
        ...zapEvents.map(event => ({
          type: 'zap' as const,
          event,
          timestamp: new Date(event.created_at * 1000),
        })),
        ...commentEvents.map(event => ({
          type: 'comment' as const,
          event,
          timestamp: new Date(event.created_at * 1000),
        })),
        ...repostEvents.map(event => ({
          type: 'repost' as const, 
          event,
          timestamp: new Date(event.created_at * 1000),
        })),
      ];

      // Sort by recency and map to activity format
      const recentActivity = allActivity
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, 10)
        .map(activity => {
          const releaseId = activity.event.tags.find(([name]) => name === 'e')?.[1] || '';
          const release = releases.find(ep => ep.eventId === releaseId);

          return {
            type: activity.type,
            releaseId,
            releaseTitle: release?.title || 'Unknown Release',
            timestamp: activity.timestamp,
            author: activity.event.pubkey.slice(0, 8) + '...',
          };
        });

      // Engagement over time (last 30 days)
      const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
      const dailyEngagement = new Map<string, {zaps: number, comments: number, reposts: number}>();

      // Initialize last 30 days
      for (let i = 0; i < 30; i++) {
        const date = new Date(Date.now() - (i * 24 * 60 * 60 * 1000));
        const dateKey = date.toISOString().split('T')[0];
        dailyEngagement.set(dateKey, { zaps: 0, comments: 0, reposts: 0 });
      }

      // Count engagement by day
      [...zapEvents, ...commentEvents, ...repostEvents].forEach(event => {
        if (event.created_at * 1000 >= thirtyDaysAgo) {
          const date = new Date(event.created_at * 1000);
          const dateKey = date.toISOString().split('T')[0];
          const dayData = dailyEngagement.get(dateKey);
          
          if (dayData) {
            if (event.kind === 9735) dayData.zaps++;
            else if (event.kind === 1111) dayData.comments++;
            else if ([6, 16].includes(event.kind)) dayData.reposts++;
          }
        }
      });

      const engagementOverTime = Array.from(dailyEngagement.entries())
        .map(([date, data]) => ({ date, ...data }))
        .sort((a, b) => a.date.localeCompare(b.date));

      return {
        totalReleases: releases.length,
        totalZaps,
        totalComments,
        totalReposts,
        topReleases,
        recentActivity,
        engagementOverTime,
      };
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
    enabled: !!releases, // Only run when releases are loaded
  });
}
