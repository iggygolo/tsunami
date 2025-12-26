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
import { 
  updateArtistCache, 
  batchUpdateArtistCache, 
  extractArtistPubkeys,
  type SimpleArtistInfo 
} from '../../src/lib/artistUtils.js';

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
  metadata: Record<string, unknown> | null; // Keep for backward compatibility (configured artist)
  allArtistMetadata: Map<string, Record<string, unknown>>; // All artist metadata
  artists: SimpleArtistInfo[]; // Add artist information
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
 * Fetch artist profiles from multiple Nostr relays
 */
async function fetchArtistProfilesMultiRelay(
  relays: Array<{url: string, relay: NRelay1}>, 
  artistPubkeys: string[]
): Promise<SimpleArtistInfo[]> {
  if (artistPubkeys.length === 0) {
    console.log('📡 No artist pubkeys to fetch profiles for');
    return [];
  }

  console.log(`📡 Fetching profiles for ${artistPubkeys.length} artists from Nostr...`);

  const relayPromises = relays.map(async ({url, relay}) => {
    try {
      const events = await Promise.race([
        relay.query([{
          kinds: [0], // Profile metadata events
          authors: artistPubkeys,
          limit: artistPubkeys.length * 2 // Allow for multiple versions per artist
        }]),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`Profiles query timeout for ${url}`)), 8000)
        )
      ]) as NostrEvent[];

      if (events.length > 0) {
        console.log(`✅ Found ${events.length} profile events from ${url}`);
        return events;
      }
      return [];
    } catch (error) {
      console.log(`⚠️ Failed to fetch profiles from ${url}:`, (error as Error).message);
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

  // Deduplicate by pubkey (keep latest)
  const profilesByPubkey = new Map<string, NostrEvent>();
  
  allEvents.forEach(event => {
    const existing = profilesByPubkey.get(event.pubkey);
    if (!existing || event.created_at > existing.created_at) {
      profilesByPubkey.set(event.pubkey, event);
    }
  });

  const uniqueEvents = Array.from(profilesByPubkey.values());
  console.log(`✅ Found ${uniqueEvents.length} unique artist profiles`);

  // Convert to artist info and update cache
  const artistProfiles: Array<{ pubkey: string; profile: any }> = [];
  
  uniqueEvents.forEach(event => {
    try {
      const profile = JSON.parse(event.content);
      artistProfiles.push({ pubkey: event.pubkey, profile });
    } catch (error) {
      console.warn(`⚠️ Failed to parse profile for ${event.pubkey}:`, error);
      // Create basic info for artists without valid profiles
      artistProfiles.push({ 
        pubkey: event.pubkey, 
        profile: { name: `Artist ${event.pubkey.slice(0, 8)}...` } 
      });
    }
  });

  // Update artist cache and return info
  const artistInfos = batchUpdateArtistCache(artistProfiles);
  
  // Add any missing artists (those without profiles)
  const foundPubkeys = new Set(artistInfos.map(info => info.pubkey));
  artistPubkeys.forEach(pubkey => {
    if (!foundPubkeys.has(pubkey)) {
      // Create basic info for artists without profiles
      const basicInfo = updateArtistCache(pubkey, { 
        name: `Artist ${pubkey.slice(0, 8)}...` 
      });
      artistInfos.push(basicInfo);
    }
  });

  console.log(`✅ Processed ${artistInfos.length} artist profiles`);
  return artistInfos;
}
/**
 * Fetch artist metadata for multiple artists from multiple Nostr relays
 */
async function fetchAllArtistMetadataMultiRelay(
  relays: Array<{url: string, relay: NRelay1}>, 
  artistPubkeys: string[]
): Promise<Map<string, Record<string, unknown>>> {
  console.log(`📡 Fetching metadata for ${artistPubkeys.length} artists from Nostr...`);

  const artistMetadataMap = new Map<string, Record<string, unknown>>();

  // Fetch metadata for all artists in parallel
  const metadataPromises = artistPubkeys.map(async (pubkey) => {
    const relayPromises = relays.map(async ({url, relay}) => {
      try {
        const events = await Promise.race([
          relay.query([{
            kinds: [MUSIC_KINDS.ARTIST_METADATA],
            authors: [pubkey],
            '#d': ['artist-metadata'],
            limit: 5
          }]),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error(`Metadata query timeout for ${url}`)), 5000)
          )
        ]) as NostrEvent[];

        return events;
      } catch (error) {
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

      try {
        const metadata = JSON.parse(latestEvent.content);
        artistMetadataMap.set(pubkey, metadata);
      } catch (error) {
        console.warn(`⚠️ Failed to parse metadata JSON for artist ${pubkey}:`, error);
      }
    }
  });

  await Promise.all(metadataPromises);
  
  console.log(`✅ Found metadata for ${artistMetadataMap.size} artists`);
  return artistMetadataMap;
}

/**
 * Fetch music playlists from multiple Nostr relays (all artists)
 */
async function fetchMusicPlaylistsMultiRelay(
  relays: Array<{url: string, relay: NRelay1}>
): Promise<MusicPlaylistData[]> {
  console.log('📡 Fetching music playlists from all artists on Nostr...');

  const relayPromises = relays.map(async ({url, relay}) => {
    try {
      const events = await Promise.race([
        relay.query([{
          kinds: [MUSIC_KINDS.RELEASE],
          // No authors filter - get from all artists
          limit: 200 // Increased limit for multi-artist content
        }]),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`Playlists query timeout for ${url}`)), 10000) // Increased timeout
        )
      ]) as NostrEvent[];

      const validEvents = events.filter(event => validateMusicPlaylist(event));

      if (validEvents.length > 0) {
        console.log(`✅ Found ${validEvents.length} playlists from ${url} (${[...new Set(validEvents.map(e => e.pubkey))].length} unique artists)`);
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

  // Deduplicate by artist:identifier combination
  const playlistsByKey = new Map<string, NostrEvent>();
  
  allEvents.forEach(event => {
    const identifier = event.tags.find(([name]) => name === 'd')?.[1];
    if (!identifier) return;
    
    const key = `${event.pubkey}:${identifier}`;
    const existing = playlistsByKey.get(key);
    if (!existing || event.created_at > existing.created_at) {
      playlistsByKey.set(key, event);
    }
  });

  const uniqueEvents = Array.from(playlistsByKey.values());
  const uniqueArtists = [...new Set(uniqueEvents.map(e => e.pubkey))].length;
  console.log(`✅ Found ${uniqueEvents.length} unique playlists from ${uniqueArtists} artists across ${allResults.length} relays`);

  const playlists = uniqueEvents.map(event => eventToMusicPlaylist(event));
  return playlists.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
}

/**
 * Fetch music tracks from multiple Nostr relays (all artists)
 */
async function fetchMusicTracksMultiRelay(
  relays: Array<{url: string, relay: NRelay1}>
): Promise<MusicTrackData[]> {
  console.log('📡 Fetching music tracks from all artists on Nostr...');

  const relayPromises = relays.map(async ({url, relay}) => {
    try {
      const events = await Promise.race([
        relay.query([{
          kinds: [MUSIC_KINDS.MUSIC_TRACK],
          // No authors filter - get from all artists
          limit: 400 // Increased limit for multi-artist content
        }]),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`Tracks query timeout for ${url}`)), 10000) // Increased timeout
        )
      ]) as NostrEvent[];

      const validEvents = events.filter(event => validateMusicTrack(event));

      if (validEvents.length > 0) {
        console.log(`✅ Found ${validEvents.length} tracks from ${url} (${[...new Set(validEvents.map(e => e.pubkey))].length} unique artists)`);
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

  // Deduplicate by artist:identifier combination
  const tracksByKey = new Map<string, NostrEvent>();
  
  allEvents.forEach(event => {
    const identifier = event.tags.find(([name]) => name === 'd')?.[1];
    if (!identifier) return;
    
    const key = `${event.pubkey}:${identifier}`;
    const existing = tracksByKey.get(key);
    if (!existing || event.created_at > existing.created_at) {
      tracksByKey.set(key, event);
    }
  });

  const uniqueEvents = Array.from(tracksByKey.values());
  const uniqueArtists = [...new Set(uniqueEvents.map(e => e.pubkey))].length;
  console.log(`✅ Found ${uniqueEvents.length} unique tracks from ${uniqueArtists} artists across ${allResults.length} relays`);

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
  console.log(`👤 Configured Artist: ${customArtistNpub || process.env.VITE_ARTIST_NPUB}`);

  // Default relay URLs
  const relayUrls = customRelayUrls || [
    'wss://relay.primal.net',
    'wss://relay.damus.io',
    'wss://nos.lol',
    'wss://relay.ditto.pub'
  ];

  console.log(`🔌 Connecting to ${relayUrls.length} relays...`);
  const relays = relayUrls.map(url => ({ url, relay: new NRelay1(url) }));

  let metadata: Record<string, unknown> | null = null;
  let allArtistMetadata: Map<string, Record<string, unknown>> = new Map();
  let tracks: MusicTrackData[] = [];
  let playlists: MusicPlaylistData[] = [];
  let artists: SimpleArtistInfo[] = [];

  try {
    // Fetch tracks and playlists first
    console.log('📡 Fetching tracks and playlists from all artists...');
    const [fetchedTracks, fetchedPlaylists] = await Promise.all([
      fetchMusicTracksMultiRelay(relays), // No artist filter
      fetchMusicPlaylistsMultiRelay(relays) // No artist filter
    ]);

    tracks = fetchedTracks;
    playlists = fetchedPlaylists;

    // Extract unique artist pubkeys from all content
    const artistPubkeys = new Set<string>();
    tracks.forEach(track => {
      if (track.artistPubkey) {
        artistPubkeys.add(track.artistPubkey);
      }
    });
    playlists.forEach(playlist => {
      if (playlist.authorPubkey) {
        artistPubkeys.add(playlist.authorPubkey);
      }
    });
    
    const uniqueArtistPubkeys = Array.from(artistPubkeys);
    console.log(`🎨 Found ${uniqueArtistPubkeys.length} unique artists in content`);

    // Fetch artist profiles and all artist metadata in parallel
    const [fetchedArtists, fetchedArtistMetadata] = await Promise.all([
      fetchArtistProfilesMultiRelay(relays, uniqueArtistPubkeys),
      fetchAllArtistMetadataMultiRelay(relays, uniqueArtistPubkeys)
    ]);

    artists = fetchedArtists;
    allArtistMetadata = fetchedArtistMetadata;
    
    // Get configured artist metadata for backward compatibility
    metadata = allArtistMetadata.get(artistPubkeyHex) || null;

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
  console.log(`\n✅ Multi-artist Nostr data fetch completed in ${fetchTime}s`);
  console.log(`📊 Results:`);
  console.log(`   • ${tracks.length} tracks from ${artists.length} artists`);
  console.log(`   • ${playlists.length} playlists from multiple artists`);
  console.log(`   • ${artists.length} artist profiles fetched`);
  console.log(`   • ${metadata ? 'Configured artist metadata found' : 'No configured artist metadata'}`);

  return {
    tracks,
    playlists,
    metadata,
    allArtistMetadata,
    artists,
    relaysUsed: relayUrls,
    fetchedAt: new Date(),
    artistPubkey: artistPubkeyHex,
  };
}