import { promises as fs } from 'fs';
import path from 'path';
import { config } from 'dotenv';
import { nip19 } from 'nostr-tools';
import { NRelay1, NostrEvent } from '@nostrify/nostrify';
import type { MusicTrackData, MusicPlaylistData } from '../src/types/podcast.js';
import { generateRSSFeed as generateRSSFeedCore, type RSSConfig } from '../src/lib/rssCore.js';

// Import naddr encoding functions
import { encodeMusicTrackAsNaddr, encodeMusicPlaylistAsNaddr } from '../src/lib/nip19Utils.js';

// Updated constants for new event types (but keeping internal naming)
const MUSIC_KINDS = {
  MUSIC_TRACK: 36787,     // Individual music tracks
  RELEASE: 34139,         // Music releases (internally called releases, externally playlists)
  ARTIST_METADATA: 30078, // Artist metadata (addressable event)
} as const;

// Load environment variables
config();

/**
 * Create a Node.js compatible config that reads from actual env vars
 * This replicates the PODCAST_CONFIG structure but uses process.env instead of import.meta.env
 */
function createNodejsConfig() {
  const artistNpub = process.env.VITE_ARTIST_NPUB;

  // Parse recipients safely
  let recipients: Array<{
    name: string;
    type: string;
    address: string;
    split: number;
    fee?: boolean;
    customKey?: string;
    customValue?: string;
  }> = [];
  try {
    if (process.env.VITE_MUSIC_VALUE_RECIPIENTS) {
      recipients = JSON.parse(process.env.VITE_MUSIC_VALUE_RECIPIENTS);
    } else {
      // Default recipients if no env var
      recipients = [
        {
          name: "Podcast Host",
          type: "node",
          address: "030a58b8653d32b99200a2334cfe913e51dc7d155aa0116c176657a4f1722677a3",
          split: 80,
          fee: false
        },
        {
          name: "Producer",
          type: "lightning-address",
          address: "producer@getalby.com",
          split: 15,
          customKey: "podcast",
          customValue: "producer-fee"
        },
        {
          name: "Platform Fee",
          type: "node",
          address: "021f2f8e1e46a48d0a9f1b7e4e8b5c8d5e4f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6",
          split: 5,
          fee: true
        }
      ];
    }
  } catch {
    console.warn('Failed to parse VITE_MUSIC_VALUE_RECIPIENTS, using defaults');
    recipients = [];
  }

  return {
    artistNpub: artistNpub || "",
    podcast: {
      description: process.env.VITE_MUSIC_DESCRIPTION || "A Nostr-powered artist exploring decentralized music",
      artistName: process.env.VITE_ARTIST_NAME || "Tsunami Artist",
      image: process.env.VITE_ARTIST_IMAGE || "",
      website: process.env.VITE_ARTIST_WEBSITE || "https://tsunami.example",
      copyright: process.env.VITE_ARTIST_COPYRIGHT || "© 2025 Tsunami",
      funding: process.env.VITE_ARTIST_FUNDING ?
        process.env.VITE_ARTIST_FUNDING.split(',').map(s => s.trim()).filter(s => s.length > 0) :
        [],
      value: {
        amount: parseInt(process.env.VITE_MUSIC_VALUE_AMOUNT || "1000", 10),
        currency: process.env.VITE_MUSIC_VALUE_CURRENCY || "sats",
        recipients
      },
      // Podcasting 2.0 fields
      guid: process.env.VITE_MUSIC_GUID || artistNpub,
      medium: (process.env.VITE_MUSIC_MEDIUM as "podcast" | "music" | "video" | "film" | "audiobook" | "newsletter" | "blog") || "podcast",
      publisher: process.env.VITE_ARTIST_PUBLISHER || process.env.VITE_ARTIST_NAME || "Tsunami Artist",
      location: process.env.VITE_ARTIST_LOCATION_NAME ? {
        name: process.env.VITE_ARTIST_LOCATION_NAME,
        geo: process.env.VITE_ARTIST_LOCATION_GEO || undefined,
        osm: process.env.VITE_ARTIST_LOCATION_OSM || undefined
      } : undefined,
      person: process.env.VITE_MUSIC_PERSON ?
        JSON.parse(process.env.VITE_MUSIC_PERSON) :
        [{ name: process.env.VITE_ARTIST_NAME || "Tsunami Artist", role: "artist", group: "cast" }],
      license: {
        identifier: process.env.VITE_MUSIC_LICENSE_IDENTIFIER || "All Right Reserved",
        url: process.env.VITE_MUSIC_LICENSE_URL || ""
      }
    },
    rss: {
      ttl: parseInt(process.env.VITE_MUSIC_RSS_TTL || "60", 10)
    }
  };
}

/**
 * Node-specific function to get artist pubkey in hex format
 */
function getArtistPubkeyHex(artistNpub: string): string {
  try {
    const decoded = nip19.decode(artistNpub);
    if (decoded.type === 'npub') {
      return decoded.data;
    }
    throw new Error('Invalid npub format');
  } catch (error) {
    console.error('Failed to decode artist npub:', error);
    // Fallback to the original value in case it's already hex
    return artistNpub;
  }
}


/**
 * Node-compatible RSS feed generation using consolidated core
 */
function generateRSSFeed(tracks: MusicTrackData[], releases: MusicPlaylistData[], podcastConfig: RSSConfig): string {
  return generateRSSFeedCore(tracks, releases, podcastConfig, encodeMusicTrackAsNaddr, encodeMusicPlaylistAsNaddr);
}

/**
 * Validates if a Nostr event is a valid music track
 */
function validateMusicTrack(event: NostrEvent, artistPubkeyHex: string): boolean {
  if (event.kind !== MUSIC_KINDS.MUSIC_TRACK) return false;

  // Check for required title tag
  const title = event.tags.find(([name]) => name === 'title')?.[1];
  if (!title) return false;

  // Check for required artist tag
  const artist = event.tags.find(([name]) => name === 'artist')?.[1];
  if (!artist) return false;

  // Check for required url tag (audio file)
  const url = event.tags.find(([name]) => name === 'url')?.[1];
  if (!url) return false;

  // Verify it's from the music artist
  if (event.pubkey !== artistPubkeyHex) return false;

  return true;
}

/**
 * Converts a validated Nostr event to a MusicTrackData object
 */
function eventToMusicTrack(event: NostrEvent): MusicTrackData {
  const tags = new Map(event.tags.map(([key, ...values]) => [key, values]));

  const title = tags.get('title')?.[0] || 'Untitled Track';
  const artist = tags.get('artist')?.[0] || 'Unknown Artist';
  const audioUrl = tags.get('url')?.[0] || '';
  const album = tags.get('album')?.[0];
  const trackNumber = tags.get('track_number')?.[0] ? parseInt(tags.get('track_number')![0], 10) : undefined;
  const releaseDate = tags.get('released')?.[0];
  const duration = tags.get('duration')?.[0] ? parseInt(tags.get('duration')![0], 10) : undefined;
  const format = tags.get('format')?.[0];
  const bitrate = tags.get('bitrate')?.[0];
  const sampleRate = tags.get('sample_rate')?.[0];
  const imageUrl = tags.get('image')?.[0];
  const videoUrl = tags.get('video')?.[0];
  const language = tags.get('language')?.[0];
  const explicit = tags.get('explicit')?.[0] === 'true';

  // Extract all 't' tags for genres (excluding 'music' tag)
  const genres = event.tags
    .filter(([name, value]) => name === 't' && value !== 'music')
    .map(([, value]) => value);

  // Extract identifier from 'd' tag (for addressable events)
  const identifier = tags.get('d')?.[0] || event.id;

  // Parse zap splits from 'zap' tags
  const zapSplits = event.tags
    .filter(([name]) => name === 'zap')
    .map(([, address, percentage, name]) => ({
      address,
      percentage: parseInt(percentage, 10),
      name,
      type: address.includes('@') ? 'lnaddress' as const : 'node' as const
    }));

  return {
    identifier,
    title,
    artist,
    audioUrl,
    album,
    trackNumber,
    releaseDate,
    duration,
    format,
    bitrate,
    sampleRate,
    imageUrl,
    videoUrl,
    lyrics: event.content || undefined,
    language,
    explicit,
    genres: genres.length > 0 ? genres : undefined,
    zapSplits: zapSplits.length > 0 ? zapSplits : undefined,
    eventId: event.id,
    artistPubkey: event.pubkey,
    createdAt: new Date(event.created_at * 1000),
  };
}

/**
 * Validates if a Nostr event is a valid music release
 */
function validateMusicRelease(event: NostrEvent, artistPubkeyHex: string): boolean {
  if (event.kind !== MUSIC_KINDS.RELEASE) return false;

  // Check for required title tag
  const title = event.tags.find(([name]) => name === 'title')?.[1];
  if (!title) return false;

  // Verify it's from the music artist
  if (event.pubkey !== artistPubkeyHex) return false;

  return true;
}

/**
 * Converts a validated Nostr event to a MusicPlaylistData object (internally called release)
 */
function eventToMusicRelease(event: NostrEvent): MusicPlaylistData {
  const tags = new Map(event.tags.map(([key, ...values]) => [key, values]));

  const title = tags.get('title')?.[0] || 'Untitled Release';
  const description = event.content || undefined;
  const imageUrl = tags.get('image')?.[0];

  // Extract track references from 'a' tags (addressable event references)
  const tracks = event.tags
    .filter(([name]) => name === 'a')
    .map(([, reference]) => {
      const [kind, pubkey, identifier] = reference.split(':');
      return {
        kind: parseInt(kind, 10) as 36787,
        pubkey,
        identifier,
      };
    })
    .filter(track => track.kind === 36787); // Only include music track references

  // Extract categories from 't' tags
  const categories = event.tags
    .filter(([name]) => name === 't')
    .map(([, value]) => value);

  // Extract identifier from 'd' tag (for addressable events)
  const identifier = tags.get('d')?.[0] || event.id;

  return {
    identifier,
    title,
    tracks,
    description,
    imageUrl,
    categories: categories.length > 0 ? categories : undefined,
    eventId: event.id,
    authorPubkey: event.pubkey,
    createdAt: new Date(event.created_at * 1000),
  };
}

/**
 * Fetch podcast metadata from multiple Nostr relays
 */
async function fetchPodcastMetadataMultiRelay(relays: Array<{url: string, relay: NRelay1}>, artistPubkeyHex: string) {
  console.log('📡 Fetching podcast metadata from Nostr...');

  const relayPromises = relays.map(async ({url, relay}) => {
    try {
      const events = await Promise.race([
        relay.query([{
          kinds: [PODCAST_KINDS.ARTIST_METADATA],
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

  // Wait for all relays to respond or timeout
  const allResults = await Promise.allSettled(relayPromises);
  const allEvents: NostrEvent[] = [];

  allResults.forEach((result) => {
    if (result.status === 'fulfilled') {
      allEvents.push(...result.value);
    }
  });

  if (allEvents.length > 0) {
    // Get the most recent event from all relays
    const latestEvent = allEvents.reduce((latest, current) =>
      current.created_at > latest.created_at ? current : latest
    );

    const updatedAt = new Date(latestEvent.created_at * 1000);
    console.log(`✅ Found podcast metadata from Nostr (updated: ${updatedAt.toISOString()})`);
    console.log(`🎯 Using podcast metadata from Nostr`);

    const metadata = JSON.parse(latestEvent.content);
    return metadata;
  } else {
    console.log('⚠️ No podcast metadata found from any relay');
    console.log('📄 Using podcast metadata from .env file');
    return null;
  }
}

/**
 * Fetch music releases from multiple Nostr relays
 */
async function fetchMusicReleasesMultiRelay(relays: Array<{url: string, relay: NRelay1}>, artistPubkeyHex: string) {
  console.log('📡 Fetching music releases from Nostr...');

  const relayPromises = relays.map(async ({url, relay}) => {
    try {
      const events = await Promise.race([
        relay.query([{
          kinds: [MUSIC_KINDS.RELEASE],
          authors: [artistPubkeyHex],
          limit: 100
        }]),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`Releases query timeout for ${url}`)), 5000)
        )
      ]) as NostrEvent[];

      const validEvents = events.filter(event => validateMusicRelease(event, artistPubkeyHex));

      if (validEvents.length > 0) {
        console.log(`✅ Found ${validEvents.length} releases from ${url}`);
        return validEvents;
      }
      return [];
    } catch (error) {
      console.log(`⚠️ Failed to fetch releases from ${url}:`, (error as Error).message);
      return [];
    }
  });

  // Wait for all relays to respond or timeout
  const allResults = await Promise.allSettled(relayPromises);
  const allEvents: NostrEvent[] = [];

  allResults.forEach((result) => {
    if (result.status === 'fulfilled') {
      allEvents.push(...result.value);
    }
  });

  // Deduplicate addressable events by 'd' tag identifier (keep only latest version)
  const releasesByIdentifier = new Map<string, NostrEvent>();
  
  allEvents.forEach(event => {
    // Get the 'd' tag identifier for addressable events
    const identifier = event.tags.find(([name]) => name === 'd')?.[1];
    if (!identifier) return; // Skip events without 'd' tag
    
    const existing = releasesByIdentifier.get(identifier);
    // Keep the latest version (highest created_at timestamp)
    if (!existing || event.created_at > existing.created_at) {
      releasesByIdentifier.set(identifier, event);
    }
  });

  const uniqueEvents = Array.from(releasesByIdentifier.values());
  console.log(`✅ Found ${uniqueEvents.length} unique releases from ${allResults.length} relays`);

  // Convert to MusicPlaylistData format and sort by createdAt (newest first)
  const releases = uniqueEvents.map(event => eventToMusicRelease(event));

  return releases.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
}

/**
 * Fetch music tracks from multiple Nostr relays
 */
async function fetchMusicTracksMultiRelay(relays: Array<{url: string, relay: NRelay1}>, artistPubkeyHex: string) {
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

      const validEvents = events.filter(event => validateMusicTrack(event, artistPubkeyHex));

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

  // Wait for all relays to respond or timeout
  const allResults = await Promise.allSettled(relayPromises);
  const allEvents: NostrEvent[] = [];

  allResults.forEach((result) => {
    if (result.status === 'fulfilled') {
      allEvents.push(...result.value);
    }
  });

  // Deduplicate addressable events by 'd' tag identifier (keep only latest version)
  const tracksByIdentifier = new Map<string, NostrEvent>();
  
  allEvents.forEach(event => {
    // Get the 'd' tag identifier for addressable events
    const identifier = event.tags.find(([name]) => name === 'd')?.[1];
    if (!identifier) return; // Skip events without 'd' tag
    
    const existing = tracksByIdentifier.get(identifier);
    // Keep the latest version (highest created_at timestamp)
    if (!existing || event.created_at > existing.created_at) {
      tracksByIdentifier.set(identifier, event);
    }
  });

  const uniqueEvents = Array.from(tracksByIdentifier.values());
  console.log(`✅ Found ${uniqueEvents.length} unique tracks from ${allResults.length} relays`);

  // Convert to MusicTrackData format and sort by createdAt (newest first)
  const tracks = uniqueEvents.map(event => eventToMusicTrack(event));

  return tracks.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
}

async function buildRSS() {
  try {
    console.log('🏗️  Building RSS feed for production...');

    // Get base config from environment variables
    const baseConfig = createNodejsConfig();
    const artistPubkeyHex = getArtistPubkeyHex(baseConfig.artistNpub || '');

    console.log(`👤 Artist: ${baseConfig.artistNpub}`);

    // Connect to multiple Nostr relays for better coverage
    const relayUrls = [
      'wss://relay.primal.net',
      'wss://relay.nostr.band',
      'wss://relay.damus.io',
      'wss://nos.lol',
      'wss://relay.ditto.pub'
    ];

    console.log(`🔌 Connecting to ${relayUrls.length} relays for better data coverage`);
    const relays = relayUrls.map(url => ({ url, relay: new NRelay1(url) }));

    let finalConfig = baseConfig;
    let tracks: MusicTrackData[] = [];
    let releases: MusicPlaylistData[] = [];
    let nostrMetadata: Record<string, unknown> | null = null;

    try {
      // Fetch podcast metadata from multiple relays
      nostrMetadata = await fetchPodcastMetadataMultiRelay(relays, artistPubkeyHex);

      // Merge Nostr metadata with base config (Nostr data takes precedence)
      if (nostrMetadata) {
        finalConfig = {
          ...baseConfig,
          podcast: {
            ...baseConfig.podcast,
            ...nostrMetadata
          }
        };
        console.log('🎯 Using podcast metadata from Nostr');
      } else {
        console.log('📄 Using podcast metadata from .env file');
      }

      // Fetch tracks from multiple relays
      tracks = await fetchMusicTracksMultiRelay(relays, artistPubkeyHex);

      // Fetch releases from multiple relays
      releases = await fetchMusicReleasesMultiRelay(relays, artistPubkeyHex);

    } finally {
      // Close all relay connections
      for (const { url, relay } of relays) {
        try {
          relay.close();
        } catch (error) {
          console.warn(`⚠️ Failed to close relay ${url}:`, error);
        }
      }
      console.log('🔌 Relay queries completed');
    }

    console.log(`📊 Generating RSS with ${tracks.length} tracks and ${releases.length} releases`);

    // Generate RSS feed with fetched data
    const rssContent = generateRSSFeed(tracks, releases, finalConfig);

    // Ensure dist directory exists
    const distDir = path.resolve('dist');
    await fs.mkdir(distDir, { recursive: true });

    // Write RSS file
    const rssPath = path.join(distDir, 'rss.xml');
    await fs.writeFile(rssPath, rssContent, 'utf-8');

    console.log(`✅ RSS feed generated successfully at: ${rssPath}`);
    console.log(`📊 Feed size: ${(rssContent.length / 1024).toFixed(2)} KB`);

    // Write a health check file
    const healthPath = path.join(distDir, 'rss-health.json');
    const healthData = {
      status: 'ok',
      endpoint: '/rss.xml',
      generatedAt: new Date().toISOString(),
      trackCount: tracks.length,
      releaseCount: releases.length,
      feedSize: rssContent.length,
      environment: 'production',
      accessible: true,
      dataSource: {
        metadata: nostrMetadata ? 'nostr' : 'env',
        tracks: tracks.length > 0 ? 'nostr' : 'none',
        releases: releases.length > 0 ? 'nostr' : 'none',
        relays: relayUrls
      },
      artist: baseConfig.artistNpub
    };
    await fs.writeFile(healthPath, JSON.stringify(healthData, null, 2));

    console.log(`✅ Health check file generated at: ${healthPath}`);

    // Write a .nojekyll file for GitHub Pages compatibility
    const nojekyllPath = path.join(distDir, '.nojekyll');
    await fs.writeFile(nojekyllPath, '');
    console.log(`✅ .nojekyll file generated for GitHub Pages compatibility`);

    console.log('\n🎉 RSS feed build completed successfully!');
    console.log('📡 Feed will be available at: /rss.xml');
    console.log('🏥 Health check available at: /rss-health');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error generating RSS feed:', error);
    process.exit(1);
  }
}

// Run the build
buildRSS();
