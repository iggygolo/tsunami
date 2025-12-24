import { config } from 'dotenv';
import { nip19 } from 'nostr-tools';
import { NRelay1, NostrEvent } from '@nostrify/nostrify';
import type { MusicTrackData, MusicPlaylistData } from '../../src/types/music.js';
import { 
  validateMusicTrack, 
  validateMusicPlaylist, 
  eventToMusicTrack, 
  eventToMusicPlaylist 
} from '../../src/lib/eventConversions.js';

// Load environment variables
config();

// Music event kinds
const MUSIC_KINDS = {
  MUSIC_TRACK: 36787,
  RELEASE: 34139,
  ARTIST_METADATA: 30078,
} as const;

/**
 * Shared data structure for all fetched Nostr data
 */
export interface NostrDataBundle {
  tracks: MusicTrackData[];
  playlists: MusicPlaylistData[];
  metadata: Record<string, unknown> | null;
  relaysUsed: string[];
  fetchedAt: Date;
  artistPubkey: string;
}

/**
 * Get artist pubkey in hex format
 */
export function getArtistPubkeyHex(artistNpub?: string): string {
  const npub = artistNpub || process.env.VITE_ARTIST_NPUB;
  if (!npub) {
    throw new Error('VITE_ARTIST_NPUB environment variable is required');
  }

  try {
    const decoded = nip19.decode(npub);
    if (decoded.type === 'npub') {
      return decoded.data;
    }
    throw new Error('Invalid npub format');
  } catch (error) {
    console.error('Failed to decode artist npub:', error);
    return npub;
  }
}

/**
 * Fetch podcast metadata from multiple Nostr relays
 */
async function fetchPodcastMetadataMultiRelay(
  relays: Array<{url: string, relay: NRelay1}>, 
  artistPubkeyHex: string
): Promise<Record<string, unknown> | null> {
  console.log('📡 Fetching podcast metadata from Nostr...');

  const relayPromises = relays.map(async ({url, relay}) => {
    try {
      const events = await Promise.race([
        relay.query([{
          kinds: [MUSIC_KINDS.ARTIST_METADATA],
          authors: [artistPubkeyHex],
          '#d': ['artist-metadata'],
          limit: 5
        }]),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`Metadata query timeout for ${url}`)), 5000)
        )
      ]) as NostrEvent[];

      if (events.length > 0) {
        console.log(`✅ Found ${events.length} metadata events from ${url}`);
        return events;
      }
      return [];
    } catch (error) {
      console.log(`⚠️ Failed to fetch metadata from ${url}:`, (error as Error).message);
      return [];
    }
  });

  const allResults = await Promise.allSettled(relayPromises);
  const allEvents: NostrEvent[] = [];

  allResults.forEach((result) => {
    if (result.status === 'fulfilled') {
      allEvents.push(...result.value);
    }
  });

  if (allEvents.length > 0) {
    const latestEvent = allEvents.reduce((latest, current) =>
      current.created_at > latest.created_at ? current : latest
    );

    const updatedAt = new Date(latestEvent.created_at * 1000);
    console.log(`✅ Found podcast metadata from Nostr (updated: ${updatedAt.toISOString()})`);

    try {
      const metadata = JSON.parse(latestEvent.content);
      return metadata;
    } catch (error) {
      console.warn('⚠️ Failed to parse metadata JSON:', error);
      return null;
    }
  } else {
    console.log('⚠️ No podcast metadata found from any relay');
    return null;
  }
}

/**
 * Fetch music playlists from multiple Nostr relays
 */
async function fetchMusicPlaylistsMultiRelay(
  relays: Array<{url: string, relay: NRelay1}>, 
  artistPubkeyHex: string
): Promise<MusicPlaylistData[]> {
  console.log('📡 Fetching music playlists from Nostr...');

  const relayPromises = relays.map(async ({url, relay}) => {
    try {
      const events = await Promise.race([
        relay.query([{
          kinds: [MUSIC_KINDS.RELEASE],
          authors: [artistPubkeyHex],
          limit: 100
        }]),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`Playlists query timeout for ${url}`)), 5000)
        )
      ]) as NostrEvent[];

      const validEvents = events.filter(event => validateMusicPlaylist(event));

      if (validEvents.length > 0) {
        console.log(`✅ Found ${validEvents.length} playlists from ${url}`);
        return validEvents;
      }
      return [];
    } catch (error) {
      console.log(`⚠️ Failed to fetch playlists from ${url}:`, (error as Error).message);
      return [];
    }
  });

  const allResults = await Promise.allSettled(relayPromises);
  const allEvents: NostrEvent[] = [];

  allResults.forEach((result) => {
    if (result.status === 'fulfilled') {
      allEvents.push(...result.value);
    }
  });

  // Deduplicate by identifier
  const playlistsByIdentifier = new Map<string, NostrEvent>();
  
  allEvents.forEach(event => {
    const identifier = event.tags.find(([name]) => name === 'd')?.[1];
    if (!identifier) return;
    
    const existing = playlistsByIdentifier.get(identifier);
    if (!existing || event.created_at > existing.created_at) {
      playlistsByIdentifier.set(identifier, event);
    }
  });

  const uniqueEvents = Array.from(playlistsByIdentifier.values());
  console.log(`✅ Found ${uniqueEvents.length} unique playlists from ${allResults.length} relays`);

  const playlists = uniqueEvents.map(event => eventToMusicPlaylist(event));
  return playlists.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
}

/**
 * Fetch music tracks from multiple Nostr relays
 */
async function fetchMusicTracksMultiRelay(
  relays: Array<{url: string, relay: NRelay1}>, 
  artistPubkeyHex: string
): Promise<MusicTrackData[]> {
  console.log('📡 Fetching music tracks from Nostr...');

  const relayPromises = relays.map(async ({url, relay}) => {
    try {
      const events = await Promise.race([
        relay.query([{
          kinds: [MUSIC_KINDS.MUSIC_TRACK],
          authors: [artistPubkeyHex],
          limit: 200
        }]),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`Tracks query timeout for ${url}`)), 5000)
        )
      ]) as NostrEvent[];

      const validEvents = events.filter(event => validateMusicTrack(event));

      if (validEvents.length > 0) {
        console.log(`✅ Found ${validEvents.length} tracks from ${url}`);
        return validEvents;
      }
      return [];
    } catch (error) {
      console.log(`⚠️ Failed to fetch tracks from ${url}:`, (error as Error).message);
      return [];
    }
  });

  const allResults = await Promise.allSettled(relayPromises);
  const allEvents: NostrEvent[] = [];

  allResults.forEach((result) => {
    if (result.status === 'fulfilled') {
      allEvents.push(...result.value);
    }
  });

  // Deduplicate by identifier
  const tracksByIdentifier = new Map<string, NostrEvent>();
  
  allEvents.forEach(event => {
    const identifier = event.tags.find(([name]) => name === 'd')?.[1];
    if (!identifier) return;
    
    const existing = tracksByIdentifier.get(identifier);
    if (!existing || event.created_at > existing.created_at) {
      tracksByIdentifier.set(identifier, event);
    }
  });

  const uniqueEvents = Array.from(tracksByIdentifier.values());
  console.log(`✅ Found ${uniqueEvents.length} unique tracks from ${allResults.length} relays`);

  const tracks = uniqueEvents.map(event => eventToMusicTrack(event));
  return tracks.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
}

/**
 * Main function to fetch all Nostr data from multiple relays
 * This is the single source of truth for all data fetching
 */
export async function fetchNostrDataBundle(
  customRelayUrls?: string[],
  customArtistNpub?: string
): Promise<NostrDataBundle> {
  const startTime = Date.now();
  console.log('🚀 Starting comprehensive Nostr data fetch...');

  // Get artist configuration
  const artistPubkeyHex = getArtistPubkeyHex(customArtistNpub);
  console.log(`👤 Artist: ${customArtistNpub || process.env.VITE_ARTIST_NPUB}`);

  // Default relay URLs
  const relayUrls = customRelayUrls || [
    'wss://relay.primal.net',
    'wss://relay.nostr.band',
    'wss://relay.damus.io',
    'wss://nos.lol',
    'wss://relay.ditto.pub'
  ];

  console.log(`🔌 Connecting to ${relayUrls.length} relays...`);
  const relays = relayUrls.map(url => ({ url, relay: new NRelay1(url) }));

  let metadata: Record<string, unknown> | null = null;
  let tracks: MusicTrackData[] = [];
  let playlists: MusicPlaylistData[] = [];

  try {
    // Fetch all data in parallel for efficiency
    console.log('📡 Fetching all data types in parallel...');
    const [fetchedMetadata, fetchedTracks, fetchedPlaylists] = await Promise.all([
      fetchPodcastMetadataMultiRelay(relays, artistPubkeyHex),
      fetchMusicTracksMultiRelay(relays, artistPubkeyHex),
      fetchMusicPlaylistsMultiRelay(relays, artistPubkeyHex)
    ]);

    metadata = fetchedMetadata;
    tracks = fetchedTracks;
    playlists = fetchedPlaylists;

  } finally {
    // Close relay connections
    console.log('🔌 Closing relay connections...');
    for (const { url, relay } of relays) {
      try {
        relay.close();
      } catch (error) {
        console.warn(`⚠️ Failed to close relay ${url}:`, error);
      }
    }
  }

  const fetchTime = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`\n✅ Nostr data fetch completed in ${fetchTime}s`);
  console.log(`📊 Results: ${tracks.length} tracks, ${playlists.length} playlists, ${metadata ? 'metadata found' : 'no metadata'}`);

  return {
    tracks,
    playlists,
    metadata,
    relaysUsed: relayUrls,
    fetchedAt: new Date(),
    artistPubkey: artistPubkeyHex,
  };
}