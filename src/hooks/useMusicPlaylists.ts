import { useQuery } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import { getArtistPubkeyHex, MUSIC_KINDS } from '@/lib/musicConfig';
import { extractZapAmount, validateZapEvent } from '@/lib/zapUtils';
import type { NostrEvent } from '@nostrify/nostrify';
import type { MusicPlaylistData, TrackReference } from '@/types/music';
import { musicPlaylistPublisher } from '@/lib/musicPlaylistPublisher';

/**
 * Validates if a Nostr event is a valid music playlist (Kind 34139)
 */
function validateMusicPlaylist(event: NostrEvent): boolean {
  if (event.kind !== MUSIC_KINDS.MUSIC_PLAYLIST) return false;

  // Check for required tags
  const tags = new Map(event.tags.map(([key, ...values]) => [key, values]));
  
  const requiredTags = ['d', 'title', 'alt'];
  for (const tagName of requiredTags) {
    if (!tags.has(tagName) || !tags.get(tagName)?.[0]?.trim()) {
      return false;
    }
  }

  // Check for at least one track reference
  const trackRefs = event.tags.filter(([key]) => key === 'a');
  if (trackRefs.length === 0) return false;

  // Check for required playlist tag
  const hasPlaylistTag = event.tags.some(([key, value]) => key === 't' && value === 'playlist');
  if (!hasPlaylistTag) return false;

  return true;
}

/**
 * Converts a validated Nostr event to a MusicPlaylistData object
 */
export function eventToMusicPlaylist(event: NostrEvent): MusicPlaylistData {
  const tags = new Map(event.tags.map(([key, ...values]) => [key, values]));

  // Parse track references from 'a' tags
  const trackReferences: TrackReference[] = [];
  const aTags = event.tags.filter(([key]) => key === 'a');
  
  for (const [, refString] of aTags) {
    if (refString) {
      const trackRef = musicPlaylistPublisher.parseTrackReference(refString);
      if (trackRef) {
        trackReferences.push(trackRef);
      }
    }
  }

  // Parse categories from 't' tags (excluding the required 'playlist' tag)
  const categories = event.tags
    .filter(([key, value]) => key === 't' && value !== 'playlist')
    .map(([, value]) => value)
    .filter(Boolean);

  const playlistData: MusicPlaylistData = {
    // Required fields
    identifier: tags.get('d')?.[0] || '',
    title: tags.get('title')?.[0] || '',
    
    // Track references (ordered)
    tracks: trackReferences,
    
    // Optional metadata
    description: tags.get('description')?.[0] || event.content || undefined,
    imageUrl: tags.get('image')?.[0],
    categories: categories.length > 0 ? categories : undefined,
    
    // Playlist settings
    isPublic: tags.get('public')?.[0] === 'true',
    isPrivate: tags.get('private')?.[0] === 'true',
    isCollaborative: tags.get('collaborative')?.[0] === 'true',
    
    // Nostr-specific fields
    eventId: event.id,
    authorPubkey: event.pubkey,
    createdAt: new Date(event.created_at * 1000)
  };

  // Default to public if neither public nor private is set
  if (!playlistData.isPublic && !playlistData.isPrivate) {
    playlistData.isPublic = true;
  }

  return playlistData;
}

/**
 * Hook to fetch all music playlists by the artist
 */
export function useMusicPlaylists(options: {
  limit?: number;
  sortBy?: 'date' | 'title' | 'tracks';
  sortOrder?: 'asc' | 'desc';
  includePrivate?: boolean;
} = {}) {
  const { nostr } = useNostr();
  const artistPubkeyHex = getArtistPubkeyHex();

  return useQuery({
    queryKey: ['music-playlists', options],
    queryFn: async (context) => {
      const signal = AbortSignal.any([context.signal, AbortSignal.timeout(10000)]);

      // Query for music playlist events from the artist
      const events = await nostr.query([{
        kinds: [MUSIC_KINDS.MUSIC_PLAYLIST],
        authors: [artistPubkeyHex],
        limit: options.limit || 100
      }], { signal });

      // Filter and validate events
      const validEvents = events.filter(validateMusicPlaylist);

      // Deduplicate addressable events by 'd' tag identifier (keep only latest version)
      const playlistsByIdentifier = new Map<string, NostrEvent>();
      
      for (const event of validEvents) {
        const identifier = event.tags.find(([key]) => key === 'd')?.[1];
        if (!identifier) continue;

        const existing = playlistsByIdentifier.get(identifier);
        if (!existing || event.created_at > existing.created_at) {
          playlistsByIdentifier.set(identifier, event);
        }
      }

      // Convert to MusicPlaylistData format
      let playlists = Array.from(playlistsByIdentifier.values()).map(eventToMusicPlaylist);

      // Filter out private playlists if not requested
      if (!options.includePrivate) {
        playlists = playlists.filter(playlist => !playlist.isPrivate);
      }

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
 * Hook to fetch a single music playlist by identifier
 */
export function useMusicPlaylist(identifier: string) {
  const { nostr } = useNostr();
  const artistPubkeyHex = getArtistPubkeyHex();

  return useQuery({
    queryKey: ['music-playlist', identifier],
    queryFn: async (context) => {
      const signal = AbortSignal.any([context.signal, AbortSignal.timeout(5000)]);

      // Query for specific music playlist by identifier
      const events = await nostr.query([{
        kinds: [MUSIC_KINDS.MUSIC_PLAYLIST],
        authors: [artistPubkeyHex],
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
      const publicPlaylists = playlists.filter(p => p.isPublic).length;
      const privatePlaylists = playlists.filter(p => p.isPrivate).length;
      const collaborativePlaylists = playlists.filter(p => p.isCollaborative).length;
      
      const totalTracks = playlists.reduce((sum, playlist) => sum + playlist.tracks.length, 0);
      const averageTracksPerPlaylist = totalPlaylists > 0 ? totalTracks / totalPlaylists : 0;
      
      const longestPlaylist = playlists.reduce((longest, current) => 
        current.tracks.length > longest.tracks.length ? current : longest,
        playlists[0] || { tracks: [] }
      );

      return {
        totalPlaylists,
        publicPlaylists,
        privatePlaylists,
        collaborativePlaylists,
        totalTracks,
        averageTracksPerPlaylist: Math.round(averageTracksPerPlaylist * 10) / 10,
        longestPlaylist: longestPlaylist.tracks.length > 0 ? longestPlaylist : null
      };
    },
    enabled: !!playlists,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}