import { useQuery } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import { MUSIC_KINDS } from '@/lib/musicConfig';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useReleases } from '@/hooks/useReleases';
import type { MusicRelease } from '@/types/music';

interface MusicAnalytics {
  totalReleases: number;
  totalZaps: number;
  totalComments: number;
  totalLikes: number;
  topReleases: Array<{
    release: MusicRelease;
    zaps: number;
    comments: number;
    likes: number;
    totalEngagement: number;
  }>;
  recentActivity: Array<{
    type: 'zap' | 'comment' | 'like';
    releaseId: string;
    releaseTitle: string;
    timestamp: Date;
    amount?: number; // for zaps
    authorPubkey: string; // full pubkey for user resolution
    authorShort: string; // fallback short display
  }>;
  engagementOverTime: Array<{
    date: string;
    zaps: number;
    comments: number;
    likes: number;
  }>;
}

/**
 * Comprehensive analytics hook for music performance tracking
 */
export function useMusicAnalytics() {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const { data: releases, isLoading: isLoadingReleases } = useReleases();

  return useQuery<MusicAnalytics>({
    queryKey: ['music-analytics', user?.pubkey, releases?.length],
    queryFn: async (context) => {
      const signal = AbortSignal.any([context.signal, AbortSignal.timeout(10000)]);
      
      if (!user?.pubkey) {
        console.log('📊 Analytics - No user logged in, returning empty analytics');
        return {
          totalReleases: 0,
          totalZaps: 0,
          totalComments: 0,
          totalLikes: 0,
          topReleases: [],
          recentActivity: [],
          engagementOverTime: [],
        };
      }

      console.log('🔍 Analytics - Starting analytics fetch:', {
        artistPubkey: user.pubkey.slice(0, 8) + '...',
        releasesCount: releases?.length || 0,
        releases: releases?.map(r => ({ title: r.title, eventId: r.eventId })) || []
      });

      if (!releases || releases.length === 0) {
        console.log('📊 Analytics - No releases found, returning empty analytics');
        // Return empty analytics if no releases
        return {
          totalReleases: 0,
          totalZaps: 0,
          totalComments: 0,
          totalLikes: 0,
          topReleases: [],
          recentActivity: [],
          engagementOverTime: [],
        };
      }

      // Get all release event IDs for filtering
      const releaseEventIds = releases.map(ep => ep.eventId).filter(Boolean);
      
      console.log('🎯 Analytics - Release event IDs to query:', {
        count: releaseEventIds.length,
        ids: releaseEventIds.map(id => id.slice(0, 8) + '...')
      });

      if (releaseEventIds.length === 0) {
        console.log('⚠️ Analytics - No valid event IDs found in releases');
        return {
          totalReleases: releases.length,
          totalZaps: 0,
          totalComments: 0,
          totalLikes: 0,
          topReleases: [],
          recentActivity: [],
          engagementOverTime: [],
        };
      }

      // Fetch all engagement events in parallel
      console.log('🔍 Analytics - Fetching engagement events...');
      
      const [zapEvents, commentEvents, likeEvents] = await Promise.all([
        // Zaps (kind 9735) targeting our releases
        nostr.query([{
          kinds: [9735],
          '#e': releaseEventIds,
          limit: 1000
        }], { signal }).catch((error) => {
          console.warn('Failed to fetch zap events:', error);
          return [];
        }),

        // Comments (kind 1111) targeting our releases  
        nostr.query([{
          kinds: [MUSIC_KINDS.COMMENT],
          '#e': releaseEventIds,
          limit: 1000
        }], { signal }).catch((error) => {
          console.warn('Failed to fetch comment events:', error);
          return [];
        }),

        // Likes (kind 7 reactions with + or ❤️ content) targeting our releases
        nostr.query([{
          kinds: [7],
          '#e': releaseEventIds,
          limit: 1000
        }], { signal }).catch((error) => {
          console.warn('Failed to fetch like events:', error);
          return [];
        }),
      ]);

      console.log('📊 Analytics - Engagement events fetched:', {
        zaps: zapEvents.length,
        comments: commentEvents.length,
        likes: likeEvents.length
      });

      // Filter like events to only include positive reactions
      const filteredLikeEvents = likeEvents.filter(event => {
        const content = event.content.trim();
        return content === '+' || content === '❤️' || content === '🤍' || content === '💜' || content === '🧡' || content === '💛' || content === '💚' || content === '💙' || content === '🖤' || content === '🤎' || content === '💗' || content === '💓' || content === '💕' || content === '💖' || content === '💘' || content === '💝' || content === '💟' || content === '♥️' || content === '💯' || content === '👍' || content === '🔥' || content === '⭐' || content === '✨' || content === '🎵' || content === '🎶' || content === '🎼' || content === '🎤' || content === '🎧';
      });

      // Calculate totals
      const totalZaps = zapEvents.length;
      const totalComments = commentEvents.length;
      const totalLikes = filteredLikeEvents.length;

      console.log('📈 Analytics - Calculated totals:', {
        totalZaps,
        totalComments,
        totalLikes: totalLikes,
        filteredFromLikes: likeEvents.length
      });

      // Calculate per-release engagement
      const releaseEngagement = releases.map(release => {
        const releaseZaps = zapEvents.filter(e => 
          e.tags.some(([name, value]) => name === 'e' && value === release.eventId)
        );
        const releaseComments = commentEvents.filter(e =>
          e.tags.some(([name, value]) => name === 'e' && value === release.eventId)  
        );
        const releaseLikes = filteredLikeEvents.filter(e =>
          e.tags.some(([name, value]) => name === 'e' && value === release.eventId)
        );

        return {
          release,
          zaps: releaseZaps.length,
          comments: releaseComments.length,
          likes: releaseLikes.length,
          totalEngagement: releaseZaps.length + releaseComments.length + releaseLikes.length
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
        ...filteredLikeEvents.map(event => ({
          type: 'like' as const, 
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
            authorPubkey: activity.event.pubkey,
            authorShort: activity.event.pubkey.slice(0, 8) + '...',
          };
        });

      // Engagement over time (last 30 days)
      const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
      const dailyEngagement = new Map<string, {zaps: number, comments: number, likes: number}>();

      // Initialize last 30 days
      for (let i = 0; i < 30; i++) {
        const date = new Date(Date.now() - (i * 24 * 60 * 60 * 1000));
        const dateKey = date.toISOString().split('T')[0];
        dailyEngagement.set(dateKey, { zaps: 0, comments: 0, likes: 0 });
      }

      // Count engagement by day
      [...zapEvents, ...commentEvents, ...filteredLikeEvents].forEach(event => {
        if (event.created_at * 1000 >= thirtyDaysAgo) {
          const date = new Date(event.created_at * 1000);
          const dateKey = date.toISOString().split('T')[0];
          const dayData = dailyEngagement.get(dateKey);
          
          if (dayData) {
            if (event.kind === 9735) dayData.zaps++;
            else if (event.kind === 1111) dayData.comments++;
            else if (event.kind === 7) dayData.likes++;
          }
        }
      });

      const engagementOverTime = Array.from(dailyEngagement.entries())
        .map(([date, data]) => ({ date, ...data }))
        .sort((a, b) => a.date.localeCompare(b.date));

      console.log('🎉 Analytics - Final analytics data:', {
        totalReleases: releases.length,
        totalZaps,
        totalComments,
        totalLikes,
        topReleasesCount: topReleases.length,
        recentActivityCount: recentActivity.length,
        engagementDays: engagementOverTime.length
      });

      return {
        totalReleases: releases.length,
        totalZaps,
        totalComments,
        totalLikes,
        topReleases,
        recentActivity,
        engagementOverTime,
      };
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
    enabled: !!releases && !isLoadingReleases, // Only run when releases are loaded and not loading
  });
}
