import { useQuery } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import { getArtistPubkeyHex, MUSIC_KINDS } from '@/lib/musicConfig';
import { extractZapAmount, validateZapEvent } from '@/lib/zapUtils';
import { eventToMusicTrack, validateMusicTrack, getEventIdentifier, deduplicateEventsByIdentifier } from '@/lib/eventConversions';
import type { NostrEvent } from '@nostrify/nostrify';
import type { MusicTrackData } from '@/types/music';

/**
 * Hook to fetch all music tracks from all artists or a specific artist
 */
export function useMusicTracks(options: {
  limit?: number;
  sortBy?: 'date' | 'title' | 'album';
  sortOrder?: 'asc' | 'desc';
  artistPubkey?: string; // Optional: filter by specific artist
} = {}) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['multi-artist-music-tracks', options],
    queryFn: async (context) => {
      const signal = AbortSignal.any([context.signal, AbortSignal.timeout(10000)]);

      // Query for music track events from all artists or specific artist
      const queryFilter: any = {
        kinds: [MUSIC_KINDS.MUSIC_TRACK],
        limit: options.limit || 200 // Increased limit for multi-artist content
      };

      // If artistPubkey is specified, filter by that artist, otherwise get from all artists
      if (options.artistPubkey) {
        queryFilter.authors = [options.artistPubkey];
      }
      // No authors filter means get from all artists

      const events = await nostr.query([queryFilter], { signal });

      // Filter and validate events
      const validEvents = events.filter(validateMusicTrack);

      // Deduplicate addressable events by 'd' tag identifier (keep only latest version)
      const deduplicatedEvents = deduplicateEventsByIdentifier(validEvents, getEventIdentifier);

      // Convert to MusicTrackData format
      const tracks = deduplicatedEvents.map(eventToMusicTrack);

      // Sort tracks
      const sortBy = options.sortBy || 'date';
      const sortOrder = options.sortOrder || 'desc';
      
      tracks.sort((a, b) => {
        let comparison = 0;
        
        switch (sortBy) {
          case 'title':
            comparison = a.title.localeCompare(b.title);
            break;
          case 'album':
            comparison = (a.album || '').localeCompare(b.album || '');
            break;
          case 'date':
          default:
            comparison = (a.createdAt?.getTime() || 0) - (b.createdAt?.getTime() || 0);
            break;
        }
        
        return sortOrder === 'asc' ? comparison : -comparison;
      });

      return tracks;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
  });
}

/**
 * Hook to fetch a single music track by identifier from a specific artist
 */
export function useMusicTrack(identifier: string, artistPubkey?: string) {
  const { nostr } = useNostr();
  const defaultArtistPubkey = getArtistPubkeyHex();
  const targetPubkey = artistPubkey || defaultArtistPubkey;

  return useQuery({
    queryKey: ['music-track', identifier, targetPubkey],
    queryFn: async (context) => {
      const signal = AbortSignal.any([context.signal, AbortSignal.timeout(5000)]);

      // Query for specific music track by identifier from specific artist
      const events = await nostr.query([{
        kinds: [MUSIC_KINDS.MUSIC_TRACK],
        authors: [targetPubkey],
        '#d': [identifier],
        limit: 10 // Get multiple versions to find the latest
      }], { signal });

      // Filter valid events and find the latest
      const validEvents = events.filter(validateMusicTrack);
      
      if (validEvents.length === 0) {
        throw new Error(`Music track not found: ${identifier}`);
      }

      // Get the latest version (highest created_at)
      const latestEvent = validEvents.reduce((latest, current) => 
        current.created_at > latest.created_at ? current : latest
      );

      return eventToMusicTrack(latestEvent);
    },
    enabled: !!identifier,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
  });
}

/**
 * Hook to fetch music tracks from all artists with zap and engagement data
 */
export function useMusicTracksWithStats() {
  const { data: tracks } = useMusicTracks();
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['multi-artist-music-tracks-stats', tracks?.length],
    queryFn: async (context) => {
      if (!tracks || tracks.length === 0) return [];

      const signal = AbortSignal.any([context.signal, AbortSignal.timeout(10000)]);
      const trackEventIds = tracks.map(track => track.eventId).filter(Boolean) as string[];

      // Fetch zaps for all tracks
      const zapEvents = await nostr.query([{
        kinds: [9735], // Zap events
        '#e': trackEventIds,
        limit: 1000
      }], { signal });

      // Process zap data
      const zapsByTrack = new Map<string, { count: number; total: number }>();
      
      for (const zapEvent of zapEvents) {
        if (!validateZapEvent(zapEvent)) continue;
        
        const amount = extractZapAmount(zapEvent);
        const targetEventId = zapEvent.tags.find(([key]) => key === 'e')?.[1];
        
        if (targetEventId && amount > 0) {
          const existing = zapsByTrack.get(targetEventId) || { count: 0, total: 0 };
          zapsByTrack.set(targetEventId, {
            count: existing.count + 1,
            total: existing.total + amount
          });
        }
      }

      // Combine track data with stats
      return tracks.map(track => ({
        ...track,
        zapCount: zapsByTrack.get(track.eventId!)?.count || 0,
        totalSats: zapsByTrack.get(track.eventId!)?.total || 0
      }));
    },
    enabled: !!tracks && tracks.length > 0,
    staleTime: 1000 * 60 * 2, // 2 minutes (more frequent updates for stats)
    gcTime: 1000 * 60 * 10, // 10 minutes
  });
}