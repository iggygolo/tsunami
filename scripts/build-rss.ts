import { promises as fs } from 'fs';
import path from 'path';
import { config } from 'dotenv';
import { nip19 } from 'nostr-tools';
import { NRelay1, NostrEvent } from '@nostrify/nostrify';
// import { generateRSSFeed } from '../src/lib/rssGenerator.js'; // Can't import due to import.meta.env issues
import type { PodcastRelease, PodcastTrailer } from '../src/types/podcast.js';

// Import naddr encoding function
import { encodeReleaseAsNaddr } from '../src/lib/nip19Utils.js';

// Copied from podcastConfig.ts to avoid import.meta.env issues
const PODCAST_KINDS = {
  RELEASE: 30054, // Addressable Podcast releases (editable, replaceable)
  TRAILER: 30055, // Addressable Podcast trailers (editable, replaceable)
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
  let recipients = [];
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
    artistNpub: artistNpub,
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
 * Escape XML special characters
 */
function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Node-compatible RSS feed generation (simplified version)
 */
function generateRSSFeed(releases: PodcastRelease[], trailers: PodcastTrailer[], podcastConfig: Record<string, unknown>): string {
  const baseUrl = podcastConfig.podcast.website || 'https://tsunami.example';

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
     xmlns:content="http://purl.org/rss/1.0/modules/content/"
     xmlns:podcast="https://github.com/Podcastindex-org/podcast-namespace/blob/main/docs/1.0.md">
  <channel>
    <title>${escapeXml(podcastConfig.podcast.artistName)}</title>
    <description>${escapeXml(podcastConfig.podcast.description)}</description>
    <link>${escapeXml(podcastConfig.podcast.website || baseUrl)}</link>
    <copyright>${escapeXml(podcastConfig.podcast.copyright)}</copyright>
    <pubDate>${new Date().toUTCString()}</pubDate>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <ttl>${podcastConfig.rss.ttl}</ttl>

    <!-- Podcasting 2.0 tags -->
    <podcast:guid>${escapeXml(podcastConfig.podcast.guid || podcastConfig.artistNpub)}</podcast:guid>
    <podcast:medium>${escapeXml(podcastConfig.podcast.medium || 'music')}</podcast:medium>

    ${podcastConfig.podcast.funding && podcastConfig.podcast.funding.length > 0 ?
      podcastConfig.podcast.funding.map(url =>
        `<podcast:funding url="${escapeXml(url)}">Support the artist</podcast:funding>`
      ).join('\n    ') : ''
    }

    ${podcastConfig.podcast.value && podcastConfig.podcast.value.amount > 0 ?
      `<podcast:value type="lightning" method="lnaddress">
        ${podcastConfig.podcast.value.recipients && podcastConfig.podcast.value.recipients.length > 0 ?
          podcastConfig.podcast.value.recipients.map(recipient =>
            `<podcast:valueRecipient name="${escapeXml(recipient.name)}" type="${escapeXml(recipient.type)}" address="${escapeXml(recipient.address)}" split="${recipient.split}"${recipient.customKey ? ` customKey="${escapeXml(recipient.customKey)}"` : ''}${recipient.customValue ? ` customValue="${escapeXml(recipient.customValue)}"` : ''}${recipient.fee ? ` fee="true"` : ''} />`
          ).join('\n        ') :
          `<podcast:valueRecipient name="${escapeXml(podcastConfig.podcast.artistName)}" type="lnaddress" address="${escapeXml(podcastConfig.podcast.funding?.[0] || '')}" split="100" />`
        }
      </podcast:value>` : ''
    }

    ${trailers.map(trailer => 
      `<podcast:trailer pubdate="${trailer.pubDate.toUTCString()}" url="${escapeXml(trailer.url)}"${trailer.length ? ` length="${trailer.length}"` : ''}${trailer.type ? ` type="${escapeXml(trailer.type)}"` : ''}${trailer.season ? ` season="${trailer.season}"` : ''}>${escapeXml(trailer.title)}</podcast:trailer>`
    ).join('\n    ')}

    ${releases.map(release => {
      return `
    <item>
      <title>${escapeXml(release.title)}</title>
      <description>${escapeXml(release.description || '')}</description>
      <link>${escapeXml(baseUrl)}/${encodeReleaseAsNaddr(release.artistPubkey, release.identifier)}</link>
      <pubDate>${release.publishDate.toUTCString()}</pubDate>
      <guid isPermaLink="false">${release.artistPubkey}:${release.identifier}</guid>
      <enclosure url="${escapeXml(release.audioUrl)}" type="${release.audioType}" length="0" />
      ${release.videoUrl ? `<enclosure url="${escapeXml(release.videoUrl)}" type="${release.videoType || 'video/mp4'}" length="0" />` : ''}
      ${release.transcriptUrl ? `<podcast:transcript url="${escapeXml(release.transcriptUrl)}" type="text/plain" />` : ''}
      ${release.content ? `<content:encoded><![CDATA[${release.content}]]></content:encoded>` : ''}
    </item>`;
    }).join('')}
  </channel>
</rss>`;
}

/**
 * Validates if a Nostr event is a valid podcast release
 */
function validatePodcastRelease(event: NostrEvent, artistPubkeyHex: string): boolean {
  if (event.kind !== PODCAST_KINDS.RELEASE) return false;

  // Check for required title tag
  const title = event.tags.find(([name]) => name === 'title')?.[1];
  if (!title) return false;

  // Check for required audio tag
  const audio = event.tags.find(([name]) => name === 'audio')?.[1];
  if (!audio) return false;

  // Verify it's from the music artist
  if (event.pubkey !== artistPubkeyHex) return false;

  return true;
}

/**
 * Converts a validated Nostr event to a PodcastRelease object
 */
function eventToPodcastRelease(event: NostrEvent): PodcastRelease {
  const tags = new Map(event.tags.map(([key, ...values]) => [key, values]));

  const title = tags.get('title')?.[0] || 'Untitled release';
  const description = tags.get('description')?.[0];
  const imageUrl = tags.get('image')?.[0];

  // Extract audio URL and type from audio tag
  const audioTag = tags.get('audio');
  const audioUrl = audioTag?.[0] || '';
  const audioType = audioTag?.[1] || 'audio/mpeg';

  // Extract video URL and type from video tag
  const videoTag = tags.get('video');
  const videoUrl = videoTag?.[0];
  const videoType = videoTag?.[1] || 'video/mp4';

  // Extract all 't' tags for topics
  const topicTags = event.tags
    .filter(([name]) => name === 't')
    .map(([, value]) => value);

  // Extract identifier from 'd' tag (for addressable events)
  const identifier = tags.get('d')?.[0] || event.id; // Fallback to event ID for backward compatibility

  // Extract duration from tag
  const durationStr = tags.get('duration')?.[0];
  const duration = durationStr ? parseInt(durationStr, 10) : undefined;

  // Extract publication date from pubdate tag with fallback to created_at
  const pubdateStr = tags.get('pubdate')?.[0];
  let publishDate: Date;
  try {
    publishDate = pubdateStr ? new Date(pubdateStr) : new Date(event.created_at * 1000);
  } catch {
    publishDate = new Date(event.created_at * 1000);
  }

  // Extract transcript URL from tag
  const transcriptUrl = tags.get('transcript')?.[0];

  return {
    id: event.id,
    title,
    description,
    content: undefined,
    audioUrl,
    audioType,
    videoUrl,
    videoType,
    imageUrl,
    transcriptUrl,
    duration,
    publishDate,
    explicit: false,
    tags: topicTags,
    externalRefs: [],
    eventId: event.id,
    artistPubkey: event.pubkey,
    identifier,
    createdAt: new Date(event.created_at * 1000),
  };
}

/**
 * Validates if a Nostr event is a valid podcast trailer
 */
function validatePodcastTrailer(event: NostrEvent, artistPubkeyHex: string): boolean {
  if (event.kind !== PODCAST_KINDS.TRAILER) return false;

  // Check for required title tag
  const title = event.tags.find(([name]) => name === 'title')?.[1];
  if (!title) return false;

  // Check for required URL tag
  const url = event.tags.find(([name]) => name === 'url')?.[1];
  if (!url) return false;

  // Check for required pubdate tag
  const pubdate = event.tags.find(([name]) => name === 'pubdate')?.[1];
  if (!pubdate) return false;

  // Verify it's from the music artist
  if (event.pubkey !== artistPubkeyHex) return false;

  return true;
}

/**
 * Converts a validated Nostr event to a PodcastTrailer object
 */
function eventToPodcastTrailer(event: NostrEvent): PodcastTrailer {
  const tags = new Map(event.tags.map(([key, ...values]) => [key, values]));

  const title = tags.get('title')?.[0] || 'Untitled Trailer';
  const url = tags.get('url')?.[0] || '';
  const pubdateStr = tags.get('pubdate')?.[0];
  const lengthStr = tags.get('length')?.[0];
  const type = tags.get('type')?.[0];
  const seasonStr = tags.get('season')?.[0];
  
  // Parse pubdate (RFC2822 format)
  let pubDate: Date;
  try {
    pubDate = pubdateStr ? new Date(pubdateStr) : new Date(event.created_at * 1000);
  } catch {
    pubDate = new Date(event.created_at * 1000);
  }

  // Extract identifier from 'd' tag (for addressable events)
  const identifier = tags.get('d')?.[0] || event.id;

  return {
    id: event.id,
    title,
    url,
    pubDate,
    length: lengthStr ? parseInt(lengthStr, 10) : undefined,
    type,
    season: seasonStr ? parseInt(seasonStr, 10) : undefined,
    eventId: event.id,
    artistPubkey: event.pubkey,
    identifier,
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
 * Fetch podcast releases from multiple Nostr relays
 */
async function fetchPodcastReleasesMultiRelay(relays: Array<{url: string, relay: NRelay1}>, artistPubkeyHex: string) {
  console.log('📡 Fetching podcast releases from Nostr...');

  const relayPromises = relays.map(async ({url, relay}) => {
    try {
      const events = await Promise.race([
        relay.query([{
          kinds: [PODCAST_KINDS.RELEASE],
          authors: [artistPubkeyHex],
          limit: 100
        }]),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`Releases query timeout for ${url}`)), 5000)
        )
      ]) as NostrEvent[];

      const validEvents = events.filter(event => validatePodcastRelease(event, artistPubkeyHex));

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

  // Convert to PodcastRelease format and sort by publishDate (newest first)
  const releases = uniqueEvents.map(event => eventToPodcastRelease(event));

  return releases.sort((a, b) => b.publishDate.getTime() - a.publishDate.getTime());
}

/**
 * Fetch podcast trailers from multiple Nostr relays
 */
async function fetchPodcastTrailersMultiRelay(relays: Array<{url: string, relay: NRelay1}>, artistPubkeyHex: string) {
  console.log('📡 Fetching podcast trailers from Nostr...');

  const relayPromises = relays.map(async ({url, relay}) => {
    try {
      const events = await Promise.race([
        relay.query([{
          kinds: [PODCAST_KINDS.TRAILER],
          authors: [artistPubkeyHex],
          limit: 50
        }]),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`Trailers query timeout for ${url}`)), 5000)
        )
      ]) as NostrEvent[];

      const validEvents = events.filter(event => validatePodcastTrailer(event, artistPubkeyHex));

      if (validEvents.length > 0) {
        console.log(`✅ Found ${validEvents.length} trailers from ${url}`);
        return validEvents;
      }
      return [];
    } catch (error) {
      console.log(`⚠️ Failed to fetch trailers from ${url}:`, (error as Error).message);
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
  const trailersByIdentifier = new Map<string, NostrEvent>();
  
  allEvents.forEach(event => {
    // Get the 'd' tag identifier for addressable events
    const identifier = event.tags.find(([name]) => name === 'd')?.[1];
    if (!identifier) return; // Skip events without 'd' tag
    
    const existing = trailersByIdentifier.get(identifier);
    // Keep the latest version (highest created_at timestamp)
    if (!existing || event.created_at > existing.created_at) {
      trailersByIdentifier.set(identifier, event);
    }
  });

  const uniqueEvents = Array.from(trailersByIdentifier.values());
  console.log(`✅ Found ${uniqueEvents.length} unique trailers from ${allResults.length} relays`);

  // Convert to PodcastTrailer format
  const trailers = uniqueEvents.map(event => eventToPodcastTrailer(event));
  
  // Additional deduplication by URL + title combination (in case same content was published with different identifiers)
  const trailersByContent = new Map<string, PodcastTrailer>();
  
  trailers.forEach(trailer => {
    const contentKey = `${trailer.url}-${trailer.title}`;
    const existing = trailersByContent.get(contentKey);
    
    // Keep the latest version by publication date
    if (!existing || trailer.pubDate.getTime() > existing.pubDate.getTime()) {
      trailersByContent.set(contentKey, trailer);
    }
  });
  
  const finalTrailers = Array.from(trailersByContent.values());
  console.log(`🔄 Deduplicated to ${finalTrailers.length} unique trailers (removed ${trailers.length - finalTrailers.length} duplicates)`);
  
  // Sort by pubDate (newest first)
  return finalTrailers.sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime());
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
    let releases: PodcastRelease[] = [];
    let trailers: PodcastTrailer[] = [];
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

      // Fetch releases from multiple relays
      releases = await fetchPodcastReleasesMultiRelay(relays, artistPubkeyHex);

      // Fetch trailers from multiple relays
      trailers = await fetchPodcastTrailersMultiRelay(relays, artistPubkeyHex);

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

    console.log(`📊 Generating RSS with ${releases.length} releases and ${trailers.length} trailers`);

    // Generate RSS feed with fetched data
    const rssContent = generateRSSFeed(releases, trailers, finalConfig);

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
      releaseCount: releases.length,
      trailerCount: trailers.length,
      feedSize: rssContent.length,
      environment: 'production',
      accessible: true,
      dataSource: {
        metadata: nostrMetadata ? 'nostr' : 'env',
        releases: releases.length > 0 ? 'nostr' : 'none',
        trailers: trailers.length > 0 ? 'nostr' : 'none',
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
