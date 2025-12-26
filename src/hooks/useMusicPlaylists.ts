import { useQuery } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import { getArtistPubkeyHex, MUSIC_KINDS } from '@/lib/musicConfig';
import { extractZapAmount, validateZapEvent } from '@/lib/zapUtils';
import { validateMusicPlaylist, eventToMusicPlaylist, getEventIdentifier, deduplicateEventsByIdentifier } from '@/lib/eventConversions';
import type { MusicPlaylistData } from '@/types/music';

/**
 * Hook to fetch all music playlists from all artists
 */
export function useMusicPlaylists(options: {
  limit?: number;
  sortBy?: 'date' | 'title' | 'tracks';
  sortOrder?: 'asc' | 'desc';
  includePrivate?: boolean;
  artistPubkey?: string; // Optional: filter by specific artist
} = {}) {
  const { nostr } = useNostr();
  const defaultArtistPubkey = getArtistPubkeyHex();

  return useQuery({
    queryKey: ['multi-artist-music-playlists', options],
    queryFn: async (context) => {
      const signal = AbortSignal.any([context.signal, AbortSignal.timeout(10000)]);

      // Query for music playlist events from all artists or specific artist
      const queryFilter: any = {
        kinds: [MUSIC_KINDS.MUSIC_PLAYLIST],
        limit: options.limit || 200 // Increased limit for multi-artist content
      };

      // If artistPubkey is specified, filter by that artist, otherwise get from all artists
      if (options.artistPubkey) {
        queryFilter.authors = [options.artistPubkey];
      }
      // No authors filter means get from all artists

      const events = await nostr.query([queryFilter], { signal });

      // Filter and validate events
      const validEvents = events.filter(validateMusicPlaylist);

      // Deduplicate addressable events by 'd' tag identifier (keep only latest version)
      const deduplicatedEvents = deduplicateEventsByIdentifier(validEvents, getEventIdentifier);

      // Convert to MusicPlaylistData format
      let playlists = deduplicatedEvents.map(eventToMusicPlaylist);

      // Filter out private playlists if not requested (note: isPrivate is not currently in MusicPlaylistData type)
      // This would need to be implemented based on your privacy logic
      // if (!options.includePrivate) {
      //   playlists = playlists.filter(playlist => !playlist.isPrivate);
      // }

      // Sort playlists
      const sortBy = options.sortBy || 'date';
      const sortOrder = options.sortOrder || 'desc';
      
      playlists.sort((a, b) => {
        let comparison = 0;
        
        switch (sortBy) {
          case 'title':
            comparison = a.title.localeCompare(b.title);
            break;
          case 'tracks':
            comparison = a.tracks.length - b.tracks.length;
            break;
          case 'date':
          default:
            comparison = (a.createdAt?.getTime() || 0) - (b.createdAt?.getTime() || 0);
            break;
        }
        
        return sortOrder === 'asc' ? comparison : -comparison;
      });

      return playlists;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
  });
}

/**
 * Hook to fetch a single music playlist by identifier from a specific artist
 */
export function useMusicPlaylist(identifier: string, artistPubkey?: string) {
  const { nostr } = useNostr();
  const defaultArtistPubkey = getArtistPubkeyHex();
  const targetPubkey = artistPubkey || defaultArtistPubkey;

  return useQuery({
    queryKey: ['music-playlist', identifier, targetPubkey],
    queryFn: async (context) => {
      const signal = AbortSignal.any([context.signal, AbortSignal.timeout(5000)]);

      // Query for specific music playlist by identifier from specific artist
      const events = await nostr.query([{
        kinds: [MUSIC_KINDS.MUSIC_PLAYLIST],
        authors: [targetPubkey],
        '#d': [identifier],
        limit: 10 // Get multiple versions to find the latest
      }], { signal });

      // Filter valid events and find the latest
      const validEvents = events.filter(validateMusicPlaylist);
      
      if (validEvents.length === 0) {
        throw new Error(`Music playlist not found: ${identifier}`);
      }

      // Get the latest version (highest created_at)
      const latestEvent = validEvents.reduce((latest, current) => 
        current.created_at > latest.created_at ? current : latest
      );

      return eventToMusicPlaylist(latestEvent);
    },
    enabled: !!identifier,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
  });
}

/**
 * Hook to fetch music playlists with zap and engagement data
 */
export function useMusicPlaylistsWithStats() {
  const { data: playlists } = useMusicPlaylists();
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['music-playlists-stats', playlists?.length],
    queryFn: async (context) => {
      if (!playlists || playlists.length === 0) return [];

      const signal = AbortSignal.any([context.signal, AbortSignal.timeout(10000)]);
      const playlistEventIds = playlists.map(playlist => playlist.eventId).filter(Boolean) as string[];

      // Fetch zaps for all playlists
      const zapEvents = await nostr.query([{
        kinds: [9735], // Zap events
        '#e': playlistEventIds,
        limit: 1000
      }], { signal });

      // Process zap data
      const zapsByPlaylist = new Map<string, { count: number; total: number }>();
      
      for (const zapEvent of zapEvents) {
        if (!validateZapEvent(zapEvent)) continue;
        
        const amount = extractZapAmount(zapEvent);
        const targetEventId = zapEvent.tags.find(([key]) => key === 'e')?.[1];
        
        if (targetEventId && amount > 0) {
          const existing = zapsByPlaylist.get(targetEventId) || { count: 0, total: 0 };
          zapsByPlaylist.set(targetEventId, {
            count: existing.count + 1,
            total: existing.total + amount
          });
        }
      }

      // Combine playlist data with stats
      return playlists.map(playlist => ({
        ...playlist,
        zapCount: zapsByPlaylist.get(playlist.eventId!)?.count || 0,
        totalSats: zapsByPlaylist.get(playlist.eventId!)?.total || 0
      }));
    },
    enabled: !!playlists && playlists.length > 0,
    staleTime: 1000 * 60 * 2, // 2 minutes (more frequent updates for stats)
    gcTime: 1000 * 60 * 10, // 10 minutes
  });
}

/**
 * Hook to fetch playlists that contain a specific track
 */
export function usePlaylistsContainingTrack(trackPubkey: string, trackIdentifier: string) {
  const { data: allPlaylists } = useMusicPlaylists({ includePrivate: true });

  return useQuery({
    queryKey: ['playlists-containing-track', trackPubkey, trackIdentifier],
    queryFn: async () => {
      if (!allPlaylists) return [];
      
      return allPlaylists.filter(playlist => 
        playlist.tracks.some(track => 
          track.pubkey === trackPubkey && track.identifier === trackIdentifier
        )
      );
    },
    enabled: !!allPlaylists && !!trackPubkey && !!trackIdentifier,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook to get playlist statistics
 */
export function usePlaylistStats() {
  const { data: playlists } = useMusicPlaylists({ includePrivate: true });

  return useQuery({
    queryKey: ['playlist-stats', playlists?.length],
    queryFn: async () => {
      if (!playlists) return null;

      const totalPlaylists = playlists.length;
      
      const totalTracks = playlists.reduce((sum, playlist) => sum + playlist.tracks.length, 0);
      const averageTracksPerPlaylist = totalPlaylists > 0 ? totalTracks / totalPlaylists : 0;
      
      const longestPlaylist = playlists.reduce((longest, current) => 
        current.tracks.length > longest.tracks.length ? current : longest,
        playlists[0] || { tracks: [] }
      );

      return {
        totalPlaylists,
        totalTracks,
        averageTracksPerPlaylist: Math.round(averageTracksPerPlaylist * 10) / 10,
        longestPlaylist: longestPlaylist.tracks.length > 0 ? longestPlaylist : null
      };
    },
    enabled: !!playlists,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}