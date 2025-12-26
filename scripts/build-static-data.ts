import { promises as fs } from 'fs';
import path from 'path';
import { config } from 'dotenv';
import { fetchNostrDataBundle } from './shared/nostr-data-fetcher.js';
import { generateRSSFeed, type RSSConfig } from '../src/lib/rssCore.js';
import { playlistToRelease } from '../src/lib/eventConversions.js';
import type { MusicRelease, MusicTrackData, MusicPlaylistData } from '../src/types/music.js';

// Load environment variables
config();

// Cache file interfaces
interface ReleaseCache {
  releases: MusicRelease[];
  metadata: {
    generatedAt: string;
    totalCount: number;
    dataSource: 'nostr' | 'fallback';
    relaysUsed: string[];
    cacheVersion: string;
  };
}

interface LatestReleaseCache {
  release: MusicRelease | null;
  metadata: {
    generatedAt: string;
    dataSource: 'nostr' | 'fallback';
    relaysUsed: string[];
    cacheVersion: string;
  };
}

interface SingleReleaseCache {
  release: MusicRelease;
  metadata: {
    generatedAt: string;
    dataSource: 'nostr' | 'fallback';
    relaysUsed: string[];
    cacheVersion: string;
    releaseId: string;
  };
}

/**
 * Create a Node.js compatible config that reads from actual env vars
 */
function createNodejsConfig(): RSSConfig {
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
    }
  } catch {
    console.warn('Failed to parse VITE_MUSIC_VALUE_RECIPIENTS, using defaults');
    recipients = [];
  }

  return {
    artistNpub: artistNpub || "",
    music: {
      description: process.env.VITE_MUSIC_DESCRIPTION || "A Nostr-powered artist exploring decentralized music",
      artistName: process.env.VITE_ARTIST_NAME || "Tsunami Artist",
      image: process.env.VITE_ARTIST_IMAGE || "",
      website: process.env.VITE_ARTIST_WEBSITE || "https://tsunami.example",
      copyright: process.env.VITE_ARTIST_COPYRIGHT || "© 2025 Tsunami",
      value: {
        amount: parseInt(process.env.VITE_MUSIC_VALUE_AMOUNT || "100", 10),
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
 * Convert playlists and tracks to PodcastRelease format
 */
function convertToReleases(playlists: MusicPlaylistData[], tracks: MusicTrackData[]): MusicRelease[] {
  console.log('🔄 Converting playlists to releases...');

  // Create tracks map for efficient lookup
  const tracksMap = new Map<string, MusicTrackData>();
  tracks.forEach(track => {
    const key = `${track.artistPubkey}:${track.identifier}`;
    tracksMap.set(key, track);
  });

  // Convert playlists to releases
  const releases = playlists.map(playlist => {
    try {
      return playlistToRelease(playlist, tracksMap);
    } catch (error) {
      console.error(`Failed to convert playlist ${playlist.title}:`, error);
      return null;
    }
  }).filter((release): release is MusicRelease => release !== null);

  // Sort by creation date (newest first)
  releases.sort((a, b) => b.publishDate.getTime() - a.publishDate.getTime());

  console.log(`✅ Converted ${releases.length} releases`);
  return releases;
}

/**
 * Generate individual release cache files for SSG
 */
async function generateIndividualReleaseCaches(
  releases: MusicRelease[], 
  metadata: ReleaseCache['metadata'], 
  distDir: string
): Promise<void> {
  console.log('📄 Generating individual release cache files...');

  const releasesDir = path.join(distDir, 'data', 'releases');
  await fs.mkdir(releasesDir, { recursive: true });

  // Generate cache files for top 20 releases (most recent)
  const topReleases = releases.slice(0, 20);
  
  for (const release of topReleases) {
    try {
      const eventId = release.eventId || release.id;
      if (!eventId) {
        console.warn('⚠️ Skipping release without event ID:', release.title);
        continue;
      }

      const singleReleaseCache: SingleReleaseCache = {
        release,
        metadata: {
          ...metadata,
          releaseId: eventId,
        },
      };

      // Generate cache file with event ID (for /releases/:eventId routes)
      const fileName = `${eventId}.json`;
      const filePath = path.join(releasesDir, fileName);
      
      await fs.writeFile(
        filePath, 
        JSON.stringify(singleReleaseCache, null, 2), 
        'utf-8'
      );

      console.log(`✅ Generated cache for release: ${fileName}`);
    } catch (error) {
      console.error(`❌ Failed to generate cache for release ${release.title}:`, error);
    }
  }

  console.log(`✅ Generated ${topReleases.length} individual release cache files`);
}

async function generateRSSFile(
  tracks: MusicTrackData[], 
  playlists: MusicPlaylistData[], 
  config: RSSConfig, 
  distDir: string
): Promise<void> {
  console.log('📝 Generating RSS feed...');

  try {
    const rssContent = generateRSSFeed(
      tracks, 
      playlists, 
      config
    );

    const rssPath = path.join(distDir, 'rss.xml');
    await fs.writeFile(rssPath, rssContent, 'utf-8');

    console.log(`✅ RSS feed generated: ${rssPath}`);
    console.log(`📊 Feed size: ${(rssContent.length / 1024).toFixed(2)} KB`);
  } catch (error) {
    console.error('❌ Failed to generate RSS feed:', error);
    throw error;
  }
}

/**
 * Generate releases.json cache file
 */
async function generateReleaseCache(
  releases: MusicRelease[], 
  relayUrls: string[], 
  distDir: string
): Promise<void> {
  console.log('📝 Generating releases cache...');

  try {
    // Take latest 20 releases for cache
    const cachedReleases = releases.slice(0, 20);

    const cache: ReleaseCache = {
      releases: cachedReleases,
      metadata: {
        generatedAt: new Date().toISOString(),
        totalCount: cachedReleases.length,
        dataSource: releases.length > 0 ? 'nostr' : 'fallback',
        relaysUsed: relayUrls,
        cacheVersion: '1.0.0',
      }
    };

    // Ensure data directory exists
    const dataDir = path.join(distDir, 'data');
    await fs.mkdir(dataDir, { recursive: true });

    // Write releases cache
    const releasesPath = path.join(dataDir, 'releases.json');
    await fs.writeFile(releasesPath, JSON.stringify(cache, null, 2), 'utf-8');

    console.log(`✅ Generated releases cache: ${releasesPath} (${cachedReleases.length} releases)`);
  } catch (error) {
    console.error('❌ Failed to generate releases cache:', error);
    
    // Create minimal fallback cache
    const fallbackCache: ReleaseCache = {
      releases: [],
      metadata: {
        generatedAt: new Date().toISOString(),
        totalCount: 0,
        dataSource: 'fallback',
        relaysUsed: relayUrls,
        cacheVersion: '1.0.0',
      }
    };
    
    const dataDir = path.join(distDir, 'data');
    await fs.mkdir(dataDir, { recursive: true });
    const fallbackPath = path.join(dataDir, 'releases.json');
    await fs.writeFile(fallbackPath, JSON.stringify(fallbackCache, null, 2), 'utf-8');
    console.log('📄 Created fallback releases cache');
    
    throw error;
  }
}

/**
 * Generate latest-release.json cache file
 */
async function generateLatestReleaseCache(
  releases: MusicRelease[], 
  relayUrls: string[], 
  distDir: string
): Promise<void> {
  console.log('📝 Generating latest release cache...');

  try {
    const latestRelease = releases.length > 0 ? releases[0] : null;

    const cache: LatestReleaseCache = {
      release: latestRelease,
      metadata: {
        generatedAt: new Date().toISOString(),
        dataSource: latestRelease ? 'nostr' : 'fallback',
        relaysUsed: relayUrls,
        cacheVersion: '1.0.0',
      }
    };

    // Ensure data directory exists
    const dataDir = path.join(distDir, 'data');
    await fs.mkdir(dataDir, { recursive: true });

    // Write latest release cache
    const latestPath = path.join(dataDir, 'latest-release.json');
    await fs.writeFile(latestPath, JSON.stringify(cache, null, 2), 'utf-8');

    console.log(`✅ Generated latest release cache: ${latestPath}`);
  } catch (error) {
    console.error('❌ Failed to generate latest release cache:', error);
    
    // Create minimal fallback cache
    const fallbackCache: LatestReleaseCache = {
      release: null,
      metadata: {
        generatedAt: new Date().toISOString(),
        dataSource: 'fallback',
        relaysUsed: relayUrls,
        cacheVersion: '1.0.0',
      }
    };
    
    const dataDir = path.join(distDir, 'data');
    await fs.mkdir(dataDir, { recursive: true });
    const fallbackPath = path.join(dataDir, 'latest-release.json');
    await fs.writeFile(fallbackPath, JSON.stringify(fallbackCache, null, 2), 'utf-8');
    console.log('📄 Created fallback latest release cache');
    
    throw error;
  }
}

/**
 * Generate health check files
 */
async function generateHealthChecks(
  tracks: MusicTrackData[],
  playlists: MusicPlaylistData[],
  releases: MusicRelease[],
  relayUrls: string[],
  metadata: Record<string, unknown> | null,
  distDir: string
): Promise<void> {
  console.log('📝 Generating health check files...');

  try {
    // RSS health check
    const rssHealthData = {
      status: 'ok',
      endpoint: '/rss.xml',
      generatedAt: new Date().toISOString(),
      trackCount: tracks.length,
      releaseCount: playlists.length,
      environment: 'production',
      accessible: true,
      dataSource: {
        metadata: metadata ? 'nostr' : 'env',
        tracks: tracks.length > 0 ? 'nostr' : 'none',
        releases: playlists.length > 0 ? 'nostr' : 'none',
        relays: relayUrls
      },
      artist: process.env.VITE_ARTIST_NPUB
    };

    const rssHealthPath = path.join(distDir, 'rss-health.json');
    await fs.writeFile(rssHealthPath, JSON.stringify(rssHealthData, null, 2));

    // Cache health check
    const cacheHealthData = {
      status: 'ok',
      endpoints: {
        releases: '/data/releases.json',
        latestRelease: '/data/latest-release.json'
      },
      generatedAt: new Date().toISOString(),
      cacheCount: releases.length,
      environment: 'production',
      accessible: true,
      dataSource: {
        releases: releases.length > 0 ? 'nostr' : 'fallback',
        relays: relayUrls
      },
      artist: process.env.VITE_ARTIST_NPUB
    };

    const cacheHealthPath = path.join(distDir, 'cache-health.json');
    await fs.writeFile(cacheHealthPath, JSON.stringify(cacheHealthData, null, 2));

    // .nojekyll file for GitHub Pages compatibility
    const nojekyllPath = path.join(distDir, '.nojekyll');
    await fs.writeFile(nojekyllPath, '');

    console.log(`✅ Generated health check files`);
  } catch (error) {
    console.error('❌ Failed to generate health check files:', error);
    // Don't throw - health checks are not critical
  }
}

/**
 * Main build function that generates both RSS and static cache files
 */
export async function buildStaticData(): Promise<void> {
  const startTime = Date.now();
  
  try {
    console.log('🏗️  Building static data (RSS + Cache)...');

    // Get base configuration
    const baseConfig = createNodejsConfig();
    console.log(`👤 Artist: ${baseConfig.artistNpub}`);

    // Fetch all data from Nostr relays (single fetch)
    const dataBundle = await fetchNostrDataBundle();

    // Merge Nostr metadata with base config (Nostr data takes precedence)
    let finalConfig = baseConfig;
    if (dataBundle.metadata) {
      finalConfig = {
        ...baseConfig,
        music: {
          ...baseConfig.music,
          ...dataBundle.metadata
        }
      };
      console.log('🎯 Using podcast metadata from Nostr');
    } else {
      console.log('📄 Using podcast metadata from .env file');
    }

    // Convert playlists to releases for cache
    const releases = convertToReleases(dataBundle.playlists, dataBundle.tracks);

    // Ensure dist directory exists
    const distDir = path.resolve('dist');
    await fs.mkdir(distDir, { recursive: true });

    // Generate all outputs in parallel
    console.log('📝 Generating all outputs...');
    await Promise.all([
      generateRSSFile(dataBundle.tracks, dataBundle.playlists, finalConfig, distDir),
      generateReleaseCache(releases, dataBundle.relaysUsed, distDir),
      generateLatestReleaseCache(releases, dataBundle.relaysUsed, distDir),
      generateIndividualReleaseCaches(releases, {
        generatedAt: new Date().toISOString(),
        totalCount: releases.length,
        dataSource: dataBundle.metadata ? 'nostr' : 'fallback',
        relaysUsed: dataBundle.relaysUsed,
        cacheVersion: '1.0.0',
      }, distDir),
      generateHealthChecks(
        dataBundle.tracks, 
        dataBundle.playlists, 
        releases, 
        dataBundle.relaysUsed, 
        dataBundle.metadata, 
        distDir
      )
    ]);

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n🎉 Static data build completed successfully in ${totalTime}s!`);
    console.log(`📊 Generated:`);
    console.log(`   • RSS feed with ${dataBundle.tracks.length} tracks and ${dataBundle.playlists.length} releases`);
    console.log(`   • Release cache with ${releases.length} releases`);
    console.log(`   • Latest release cache`);
    console.log(`   • Individual release caches (top 20)`);
    console.log(`   • Health check files`);
    console.log(`� Files a vailable in: dist/`);
    console.log(`📡 RSS feed: /rss.xml`);
    console.log(`🗂️  Cache files: /data/releases.json, /data/latest-release.json`);
    console.log(`📄 Individual caches: /data/releases/[id].json`);
    console.log(`🏥 Health checks: /rss-health.json, /cache-health.json`);

  } catch (error) {
    console.error('❌ Error building static data:', error);
    throw error;
  }
}

// Run build if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  buildStaticData()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}