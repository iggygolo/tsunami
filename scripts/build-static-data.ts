import { promises as fs } from 'fs';
import path from 'path';
import { config } from 'dotenv';
import { fetchNostrDataBundle } from './shared/nostr-data-fetcher.js';
import { generateRSSFeed, type RSSConfig } from '../src/lib/rssCore.js';
import { playlistToRelease } from '../src/lib/eventConversions.js';
import type { MusicRelease, MusicTrackData, MusicPlaylistData } from '../src/types/music.js';
import type { SimpleArtistInfo } from '../src/lib/artistUtils.js';

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
 * Create a Node.js compatible config using platform defaults
 * No longer depends on environment variables
 */
function createNodejsConfig(): RSSConfig {
  // Use hardcoded platform defaults since we no longer use environment variables
  const artistNpub = "npub1km5prrxcgt5fwgjzjpltyswsuu7u7jcj2cx9hk2rwvxyk00v2jqsgv0a3h"; // Default fallback

  return {
    artistNpub,
    music: {
      description: "A Nostr-powered artist exploring decentralized music",
      artistName: "Unknown Artist",
      image: "",
      website: "",
      copyright: `© ${new Date().getFullYear()} Unknown Artist`,
      value: {
        amount: 100,
        currency: "sats",
        recipients: []
      },
      // Podcasting 2.0 fields
      guid: artistNpub,
      medium: "music",
      publisher: "Unknown Artist",
      location: undefined,
      person: [{ name: "Unknown Artist", role: "artist", group: "cast" }],
      license: {
        identifier: "All Rights Reserved",
        url: ""
      }
    },
    rss: {
      ttl: 60
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

/**
 * Generate individual RSS feeds for artists with RSS enabled
 */
async function generateArtistRSSFeeds(
  tracks: MusicTrackData[], 
  playlists: MusicPlaylistData[], 
  allArtistMetadata: Map<string, Record<string, unknown>>,
  artists: SimpleArtistInfo[],
  baseConfig: RSSConfig,
  distDir: string
): Promise<void> {
  console.log('📝 Generating individual artist RSS feeds...');

  // Create RSS directory
  const rssDir = path.join(distDir, 'rss');
  await fs.mkdir(rssDir, { recursive: true });

  let generatedCount = 0;
  let errorCount = 0;
  const errors: Array<{ artist: string; error: string }> = [];

  // Process each artist
  for (const artist of artists) {
    const artistMetadata = allArtistMetadata.get(artist.pubkey);
    const rssEnabled = artistMetadata?.rssEnabled === true;

    if (!rssEnabled) {
      console.log(`⏭️  Skipping RSS for ${artist.name || artist.npub.slice(0, 12) + '...'} (RSS disabled)`);
      continue;
    }

    // Filter content for this artist
    const artistTracks = tracks.filter(t => t.artistPubkey === artist.pubkey);
    const artistPlaylists = playlists.filter(p => p.authorPubkey === artist.pubkey);

    if (artistTracks.length === 0 && artistPlaylists.length === 0) {
      console.log(`⏭️  Skipping RSS for ${artist.name || artist.npub.slice(0, 12) + '...'} (no content)`);
      continue;
    }

    try {
      // Create artist-specific config
      const artistConfig: RSSConfig = {
        ...baseConfig,
        artistNpub: artist.npub,
        music: {
          ...baseConfig.music,
          // Override with artist's metadata, ensuring type safety
          artistName: (artistMetadata?.artist as string) || artist.name || baseConfig.music.artistName,
          description: (artistMetadata?.description as string) || baseConfig.music.description,
          image: (artistMetadata?.image as string) || baseConfig.music.image,
          website: (artistMetadata?.website as string) || baseConfig.music.website,
          copyright: (artistMetadata?.copyright as string) || baseConfig.music.copyright,
        }
      };

      // Generate RSS content with validation
      console.log(`🔄 Generating RSS for ${artist.name || artist.npub.slice(0, 12) + '...'}`);
      const rssContent = generateRSSFeed(artistTracks, artistPlaylists, artistConfig);

      // Additional validation before saving
      if (!rssContent || rssContent.trim().length === 0) {
        throw new Error('Generated RSS content is empty');
      }

      if (!rssContent.includes('<?xml')) {
        throw new Error('Generated RSS content is not valid XML');
      }

      // Save to file
      const rssFileName = `${artist.pubkey}.xml`;
      const rssPath = path.join(rssDir, rssFileName);
      await fs.writeFile(rssPath, rssContent, 'utf-8');

      generatedCount++;
      console.log(`✅ Generated RSS for ${artist.name || artist.npub.slice(0, 12) + '...'}: /rss/${rssFileName}`);
      console.log(`   📊 ${artistTracks.length} tracks, ${artistPlaylists.length} releases`);

    } catch (error) {
      errorCount++;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const artistName = artist.name || artist.npub.slice(0, 12) + '...';
      
      console.error(`❌ Failed to generate RSS for artist ${artistName}:`, errorMessage);
      
      // Store error details for summary
      errors.push({
        artist: artistName,
        error: errorMessage
      });

      // Try to generate a minimal fallback RSS feed
      try {
        console.log(`🔄 Attempting fallback RSS generation for ${artistName}...`);
        
        const fallbackConfig: RSSConfig = {
          ...baseConfig,
          artistNpub: artist.npub,
          music: {
            ...baseConfig.music,
            artistName: artist.name || 'Artist',
            description: 'Music by artist',
            copyright: '© Artist',
          }
        };

        // Generate minimal RSS with empty content
        const fallbackRss = generateRSSFeed([], [], fallbackConfig);
        
        const rssFileName = `${artist.pubkey}.xml`;
        const rssPath = path.join(rssDir, rssFileName);
        await fs.writeFile(rssPath, fallbackRss, 'utf-8');
        
        console.log(`⚠️  Generated fallback RSS for ${artistName}`);
        generatedCount++; // Count fallback as generated
        
      } catch (fallbackError) {
        console.error(`❌ Fallback RSS generation also failed for ${artistName}:`, fallbackError);
        // Continue with other artists - don't let one failure stop the entire build
      }
    }
  }

  // Summary logging
  console.log(`✅ RSS generation completed: ${generatedCount} feeds generated`);
  
  if (errorCount > 0) {
    console.warn(`⚠️  ${errorCount} RSS generation errors occurred:`);
    errors.forEach(({ artist, error }) => {
      console.warn(`   • ${artist}: ${error}`);
    });
    
    // Write error summary to file for debugging
    const errorSummary = {
      timestamp: new Date().toISOString(),
      totalArtists: artists.length,
      rssEnabledArtists: artists.filter(a => allArtistMetadata.get(a.pubkey)?.rssEnabled === true).length,
      successfulFeeds: generatedCount,
      failedFeeds: errorCount,
      errors: errors
    };
    
    try {
      const errorPath = path.join(distDir, 'rss-build-errors.json');
      await fs.writeFile(errorPath, JSON.stringify(errorSummary, null, 2), 'utf-8');
      console.log(`📄 Error summary written to: rss-build-errors.json`);
    } catch (writeError) {
      console.error('Failed to write error summary:', writeError);
    }
  }

  console.log(`✅ Generated ${generatedCount} individual RSS feeds`);
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
    // Get unique artist count
    const uniqueArtists = new Set([
      ...tracks.map(t => t.artistPubkey),
      ...playlists.map(p => p.authorPubkey)
    ]).size;

    // RSS health check
    const rssHealthData = {
      status: 'ok',
      endpoint: '/rss.xml',
      generatedAt: new Date().toISOString(),
      trackCount: tracks.length,
      releaseCount: playlists.length,
      artistCount: uniqueArtists,
      environment: 'production',
      accessible: true,
      dataSource: {
        metadata: metadata ? 'nostr' : 'env',
        tracks: tracks.length > 0 ? 'nostr' : 'none',
        releases: playlists.length > 0 ? 'nostr' : 'none',
        relays: relayUrls
      },
      configuredArtist: undefined // No longer using environment variables
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
      artistCount: uniqueArtists,
      environment: 'production',
      accessible: true,
      dataSource: {
        releases: releases.length > 0 ? 'nostr' : 'fallback',
        relays: relayUrls
      },
      configuredArtist: undefined // No longer using environment variables
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

    // Generate all outputs in parallel with error handling
    console.log('📝 Generating all outputs...');
    const buildPromises = [
      generateArtistRSSFeeds(dataBundle.tracks, dataBundle.playlists, dataBundle.allArtistMetadata, dataBundle.artists, finalConfig, distDir)
        .catch(error => {
          console.error('❌ RSS feeds generation failed:', error);
          // Don't throw - continue with other builds
          return Promise.resolve();
        }),
      generateReleaseCache(releases, dataBundle.relaysUsed, distDir)
        .catch(error => {
          console.error('❌ Release cache generation failed:', error);
          // Don't throw - continue with other builds
          return Promise.resolve();
        }),
      generateLatestReleaseCache(releases, dataBundle.relaysUsed, distDir)
        .catch(error => {
          console.error('❌ Latest release cache generation failed:', error);
          // Don't throw - continue with other builds
          return Promise.resolve();
        }),
      generateIndividualReleaseCaches(releases, {
        generatedAt: new Date().toISOString(),
        totalCount: releases.length,
        dataSource: dataBundle.metadata ? 'nostr' : 'fallback',
        relaysUsed: dataBundle.relaysUsed,
        cacheVersion: '1.0.0',
      }, distDir)
        .catch(error => {
          console.error('❌ Individual release caches generation failed:', error);
          // Don't throw - continue with other builds
          return Promise.resolve();
        }),
      generateHealthChecks(
        dataBundle.tracks, 
        dataBundle.playlists, 
        releases, 
        dataBundle.relaysUsed, 
        dataBundle.metadata, 
        distDir
      )
        .catch(error => {
          console.error('❌ Health checks generation failed:', error);
          // Don't throw - health checks are not critical
          return Promise.resolve();
        })
    ];

    // Wait for all builds to complete (with individual error handling)
    await Promise.all(buildPromises);

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n🎉 Static data build completed successfully in ${totalTime}s!`);
    console.log(`📊 Generated:`);
    
    // Count RSS-enabled artists
    const rssEnabledArtists = dataBundle.artists.filter(artist => {
      const metadata = dataBundle.allArtistMetadata.get(artist.pubkey);
      return metadata?.rssEnabled === true;
    });
    
    console.log(`   • Individual RSS feeds for ${rssEnabledArtists.length} artists (out of ${dataBundle.artists.length} total)`);
    console.log(`   • Release cache with ${releases.length} releases`);
    console.log(`   • Latest release cache`);
    console.log(`   • Individual release caches (top 20)`);
    console.log(`   • Health check files`);
    console.log(`📁 Files available in: dist/`);
    console.log(`📡 RSS feeds: /rss/{artistPubkey}.xml`);
    console.log(`🗂️  Cache files: /data/releases.json, /data/latest-release.json`);
    console.log(`📄 Individual caches: /data/releases/[id].json`);
    console.log(`🏥 Health checks: /rss-health.json, /cache-health.json`);
    
    // Log artist summary with RSS status
    if (dataBundle.artists.length > 0) {
      console.log(`\n🎨 Artist RSS status:`);
      dataBundle.artists.forEach(artist => {
        const artistTracks = dataBundle.tracks.filter(t => t.artistPubkey === artist.pubkey);
        const artistPlaylists = dataBundle.playlists.filter(p => p.authorPubkey === artist.pubkey);
        const metadata = dataBundle.allArtistMetadata.get(artist.pubkey);
        const rssEnabled = metadata?.rssEnabled === true;
        const rssStatus = rssEnabled ? '✅ RSS enabled' : '⏸️  RSS disabled';
        
        console.log(`   • ${artist.name || artist.npub.slice(0, 12) + '...'}: ${artistTracks.length} tracks, ${artistPlaylists.length} playlists - ${rssStatus}`);
      });
    }

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