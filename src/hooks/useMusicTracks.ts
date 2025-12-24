import { useQuery } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import { getArtistPubkeyHex, MUSIC_KINDS } from '@/lib/musicConfig';
import { extractZapAmount, validateZapEvent } from '@/lib/zapUtils';
import type { NostrEvent } from '@nostrify/nostrify';
import type { MusicTrackData } from '@/types/podcast';

/**
 * Validates if a Nostr event is a valid music track (Kind 36787)
 */
function validateMusicTrack(event: NostrEvent): boolean {
  if (event.kind !== MUSIC_KINDS.MUSIC_TRACK) return false;

  // Check for required tags
  const tags = new Map(event.tags.map(([key, ...values]) => [key, values]));
  
  const requiredTags = ['d', 'title', 'artist', 'url'];
  for (const tagName of requiredTags) {
    if (!tags.has(tagName) || !tags.get(tagName)?.[0]?.trim()) {
      return false;
    }
  }

  // Check for required music tag
  const hasMusicTag = event.tags.some(([key, value]) => key === 't' && value === 'music');
  if (!hasMusicTag) return false;

  return true;
}

/**
 * Converts a validated Nostr event to a MusicTrackData object
 */
export function eventToMusicTrack(event: NostrEvent): MusicTrackData {
  const tags = new Map(event.tags.map(([key, ...values]) => [key, values]));

  // Parse zap splits from zap tags
  const zapSplits = event.tags
    .filter(([key]) => key === 'zap')
    .map(([, address, percentage]) => ({
      address,
      percentage: parseFloat(percentage || '0'),
      type: address.includes('@') ? 'lnaddress' as const : 'node' as const
    }))
    .filter(split => split.address && split.percentage > 0);

  // Parse genres from additional 't' tags (excluding the required 'music' tag)
  const genres = event.tags
    .filter(([key, value]) => key === 't' && value !== 'music')
    .map(([, value]) => value)
    .filter(Boolean);

  // Parse content for lyrics and credits
  const content = event.content || '';
  let lyrics: string | undefined;
  let credits: string | undefined;

  if (content.trim()) {
    const sections = content.split('\n\n');
    for (const section of sections) {
      const trimmed = section.trim();
      if (trimmed.startsWith('Lyrics:')) {
        lyrics = trimmed.replace(/^Lyrics:\s*/, '').trim();
      } else if (trimmed.startsWith('Credits:')) {
        credits = trimmed.replace(/^Credits:\s*/, '').trim();
      }
    }
  }

  const trackData: MusicTrackData = {
    // Required fields
    identifier: tags.get('d')?.[0] || '',
    title: tags.get('title')?.[0] || '',
    artist: tags.get('artist')?.[0] || '',
    audioUrl: tags.get('url')?.[0] || '',

    // Optional metadata
    album: tags.get('album')?.[0],
    trackNumber: tags.get('track_number')?.[0] ? parseInt(tags.get('track_number')![0]) : undefined,
    releaseDate: tags.get('released')?.[0],
    duration: tags.get('duration')?.[0] ? parseInt(tags.get('duration')![0]) : undefined,
    format: tags.get('format')?.[0],
    bitrate: tags.get('bitrate')?.[0],
    sampleRate: tags.get('sample_rate')?.[0],

    // Media files
    imageUrl: tags.get('image')?.[0],
    videoUrl: tags.get('video')?.[0],

    // Content and metadata
    lyrics,
    credits,
    language: tags.get('language')?.[0],
    explicit: tags.get('explicit')?.[0] === 'true',
    genres: genres.length > 0 ? genres : undefined,

    // Lightning Network
    zapSplits: zapSplits.length > 0 ? zapSplits : undefined,

    // Nostr-specific fields
    eventId: event.id,
    artistPubkey: event.pubkey,
    createdAt: new Date(event.created_at * 1000)
  };

  return trackData;
}

/**
 * Hook to fetch all music tracks by the artist
 */
export function useMusicTracks(options: {
  limit?: number;
  sortBy?: 'date' | 'title' | 'album';
  sortOrder?: 'asc' | 'desc';
} = {}) {
  const { nostr } = useNostr();
  const artistPubkeyHex = getArtistPubkeyHex();

  return useQuery({
    queryKey: ['music-tracks', options],
    queryFn: async (context) => {
      const signal = AbortSignal.any([context.signal, AbortSignal.timeout(10000)]);

      // Query for music track events from the artist
      const events = await nostr.query([{
        kinds: [MUSIC_KINDS.MUSIC_TRACK],
        authors: [artistPubkeyHex],
        limit: options.limit || 100
      }], { signal });

      // Filter and validate events
      const validEvents = events.filter(validateMusicTrack);

      // Deduplicate addressable events by 'd' tag identifier (keep only latest version)
      const tracksByIdentifier = new Map<string, NostrEvent>();
      
      for (const event of validEvents) {
        const identifier = event.tags.find(([key]) => key === 'd')?.[1];
        if (!identifier) continue;

        const existing = tracksByIdentifier.get(identifier);
        if (!existing || event.created_at > existing.created_at) {
          tracksByIdentifier.set(identifier, event);
        }
      }

      // Convert to MusicTrackData format
      const tracks = Array.from(tracksByIdentifier.values()).map(eventToMusicTrack);

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
 * Hook to fetch a single music track by identifier
 */
export function useMusicTrack(identifier: string) {
  const { nostr } = useNostr();
  const artistPubkeyHex = getArtistPubkeyHex();

  return useQuery({
    queryKey: ['music-track', identifier],
    queryFn: async (context) => {
      const signal = AbortSignal.any([context.signal, AbortSignal.timeout(5000)]);

      // Query for specific music track by identifier
      const events = await nostr.query([{
        kinds: [MUSIC_KINDS.MUSIC_TRACK],
        authors: [artistPubkeyHex],
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
 * Hook to fetch music tracks with zap and engagement data
 */
export function useMusicTracksWithStats() {
  const { data: tracks } = useMusicTracks();
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['music-tracks-stats', tracks?.length],
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