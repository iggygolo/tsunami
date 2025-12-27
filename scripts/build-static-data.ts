import { promises as fs } from 'fs';
import path from 'path';
import { config } from 'dotenv';
import { fetchNostrDataBundle } from './shared/nostr-data-fetcher.js';
import { generateRSSFeed, type ArtistInfo } from '../src/lib/rssCore.js';
import { playlistToRelease } from '../src/lib/eventConversions.js';
import type { MusicRelease, MusicTrackData, MusicPlaylistData } from '../src/types/music.js';
import type { SimpleArtistInfo } from '../src/lib/artistUtils.js';
import { processTrendingTracks, TRENDING_CONFIG } from '../src/lib/trendingAlgorithm.js';

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

interface TrendingTracksCache {
  tracks: any[]; // TrendingTrackResult[]
  metadata: {
    generatedAt: string;
    totalCount: number;
    dataSource: 'nostr' | 'fallback';
    relaysUsed: string[];
    cacheVersion: string;
    algorithm: {
      zapAmountWeight: number;
      zapCountWeight: number;
      recencyWeight: number;
      maxPerArtist: number;
      defaultLimit: number;
    };
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
 * Write file to multiple output directories (dist and public)
 */
async function writeToMultipleDirectories(
  relativePath: string, 
  content: string, 
  directories: string[] = ['dist', 'public']
): Promise<void> {
  const writePromises = directories.map(async (dir) => {
    const fullPath = path.join(dir, relativePath);
    const dirPath = path.dirname(fullPath);
    
    // Ensure directory exists
    await fs.mkdir(dirPath, { recursive: true });
    
    // Write file
    await fs.writeFile(fullPath, content, 'utf-8');
    
    return fullPath;
  });

  const writtenPaths = await Promise.all(writePromises);
  console.log(`📄 Written to: ${writtenPaths.join(', ')}`);
}

/**
 * Calculate trending score for a track (matches client-side algorithm)
 */
function calculateTrendingScore(track: MusicTrackData): number {
  const zapAmount = track.totalSats || 0;
  const zapCount = track.zapCount || 0;
  const createdAt = track.createdAt;

  // Calculate recency score (0-1, where 1 is most recent)
  const recencyScore = getRecencyScore(createdAt);

  // Apply weights: 60% zap amounts, 25% zap count, 15% recency
  const zapAmountScore = Math.log(zapAmount + 1) * 0.6;
  const zapCountScore = Math.log(zapCount + 1) * 0.25;
  const recencyWeightedScore = recencyScore * 0.15;

  return zapAmountScore + zapCountScore + recencyWeightedScore;
}

/**
 * Calculate recency score based on publication date
 */
function getRecencyScore(createdAt?: Date): number {
  if (!createdAt) return 0;

  const now = new Date();
  const daysSincePublish = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
  
  // Score decreases linearly over 7 days, then becomes 0
  return Math.max(0, (7 - daysSincePublish) / 7);
}

/**
 * Apply artist diversity filter (max 2 tracks per artist)
 */
function applyDiversityFilter<T extends { track: MusicTrackData; trendingScore: number }>(
  tracks: T[], 
  maxPerArtist: number = 2
): T[] {
  const artistTrackCount = new Map<string, number>();
  const filteredTracks: T[] = [];

  // Sort by trending score first to prioritize best tracks
  const sortedTracks = [...tracks].sort((a, b) => b.trendingScore - a.trendingScore);

  for (const trackResult of sortedTracks) {
    const artistPubkey = trackResult.track.artistPubkey || '';
    const currentCount = artistTrackCount.get(artistPubkey) || 0;

    if (currentCount < maxPerArtist) {
      filteredTracks.push(trackResult);
      artistTrackCount.set(artistPubkey, currentCount + 1);
    }
  }

  return filteredTracks;
}

/**
 * Sort tracks by trending score or fallback to date sorting
 */
function sortByTrendingScore<T extends { 
  track: MusicTrackData; 
  trendingScore: number; 
  zapCount: number; 
  totalSats: number; 
}>(tracks: T[]): T[] {
  return [...tracks].sort((a, b) => {
    // If both have no engagement, sort by date (newest first)
    if (a.zapCount === 0 && a.totalSats === 0 && b.zapCount === 0 && b.totalSats === 0) {
      const aTime = a.track.createdAt?.getTime() || 0;
      const bTime = b.track.createdAt?.getTime() || 0;
      return bTime - aTime; // Newest first
    }

    // Otherwise sort by trending score (highest first)
    return b.trendingScore - a.trendingScore;
  });
}

/**
 * Create a Node.js compatible TTL setting
 */
function getDefaultTTL(): number {
  return 60; // RSS cache time in minutes
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

  // Prioritize releases with images, but cache top 20 regardless
  const releasesWithImages = releases.filter(release => release.imageUrl);
  const releasesWithoutImages = releases.filter(release => !release.imageUrl);
  
  // Combine: prioritize releases with images, then add releases without images to fill up to 20
  const prioritizedReleases = [
    ...releasesWithImages.slice(0, 20),
    ...releasesWithoutImages.slice(0, Math.max(0, 20 - releasesWithImages.length))
  ].slice(0, 20);

  console.log(`🖼️  Individual caches: ${releasesWithImages.length} with images, ${releasesWithoutImages.length} without images, caching ${prioritizedReleases.length} total`);
  
  for (const release of prioritizedReleases) {
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
      await writeToMultipleDirectories(`data/releases/${fileName}`, JSON.stringify(singleReleaseCache, null, 2));

      console.log(`✅ Generated cache for release: ${fileName}`);
    } catch (error) {
      console.error(`❌ Failed to generate cache for release ${release.title}:`, error);
    }
  }

  console.log(`✅ Generated ${prioritizedReleases.length} individual release cache files`);
}

/**
 * Generate individual RSS feeds for artists with RSS enabled
 */
async function generateArtistRSSFeeds(
  tracks: MusicTrackData[], 
  playlists: MusicPlaylistData[], 
  allArtistMetadata: Map<string, Record<string, unknown>>,
  artists: SimpleArtistInfo[],
  ttl: number,
  distDir: string
): Promise<void> {
  console.log('📝 Generating individual artist RSS feeds...');

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
      // Prepare artist metadata for RSS generation
      const artistInfo = {
        pubkey: artist.pubkey,
        npub: artist.npub,
        name: artist.name,
        metadata: artistMetadata as any // Cast to avoid type issues during refactor
      };

      // Generate RSS content with validation
      console.log(`🔄 Generating RSS for ${artist.name || artist.npub.slice(0, 12) + '...'}`);
      const rssContent = generateRSSFeed(artistTracks, artistPlaylists, artistInfo, ttl);

      // Additional validation before saving
      if (!rssContent || rssContent.trim().length === 0) {
        throw new Error('Generated RSS content is empty');
      }

      if (!rssContent.includes('<?xml')) {
        throw new Error('Generated RSS content is not valid XML');
      }

      // Save to both dist and public directories
      const rssFileName = `${artist.pubkey}.xml`;
      await writeToMultipleDirectories(`rss/${rssFileName}`, rssContent);

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
        
        const fallbackArtistInfo = {
          pubkey: artist.pubkey,
          npub: artist.npub,
          name: artist.name || 'Artist',
          metadata: {
            artist: artist.name || 'Artist',
            description: 'Music by artist',
            copyright: '© Artist',
          }
        };

        // Generate minimal RSS with empty content
        const fallbackRss = generateRSSFeed([], [], fallbackArtistInfo, ttl);
        
        const rssFileName = `${artist.pubkey}.xml`;
        await writeToMultipleDirectories(`rss/${rssFileName}`, fallbackRss);
        
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
      await writeToMultipleDirectories('rss-build-errors.json', JSON.stringify(errorSummary, null, 2));
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
    // Filter releases to only include those with images (required for recent releases display)
    const releasesWithImages = releases.filter(release => release.imageUrl);
    
    // Take latest 20 releases with images for cache
    const cachedReleases = releasesWithImages.slice(0, 20);

    console.log(`🖼️  Filtered releases: ${releases.length} total → ${releasesWithImages.length} with images → ${cachedReleases.length} cached`);

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

    // Write releases cache to both directories
    await writeToMultipleDirectories('data/releases.json', JSON.stringify(cache, null, 2));

    console.log(`✅ Generated releases cache (${cachedReleases.length} releases with images)`);
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
    await writeToMultipleDirectories('data/releases.json', JSON.stringify(fallbackCache, null, 2));
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
    // Prefer releases with images for the latest release display
    const releasesWithImages = releases.filter(release => release.imageUrl);
    const latestRelease = releasesWithImages.length > 0 ? releasesWithImages[0] : (releases.length > 0 ? releases[0] : null);

    if (latestRelease) {
      console.log(`🖼️  Latest release: "${latestRelease.title}" ${latestRelease.imageUrl ? '(with image)' : '(no image)'}`);
    }

    const cache: LatestReleaseCache = {
      release: latestRelease,
      metadata: {
        generatedAt: new Date().toISOString(),
        dataSource: latestRelease ? 'nostr' : 'fallback',
        relaysUsed: relayUrls,
        cacheVersion: '1.0.0',
      }
    };

    // Write latest release cache to both directories
    await writeToMultipleDirectories('data/latest-release.json', JSON.stringify(cache, null, 2));

    console.log(`✅ Generated latest release cache`);
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
    await writeToMultipleDirectories('data/latest-release.json', JSON.stringify(fallbackCache, null, 2));
    console.log('📄 Created fallback latest release cache');
    
    throw error;
  }
}

/**
 * Generate trending-tracks.json cache file
 */
async function generateTrendingTracksCache(
  tracks: MusicTrackData[], 
  relayUrls: string[], 
  distDir: string
): Promise<void> {
  console.log('📝 Generating trending tracks cache...');

  try {
    // Use the shared trending algorithm for consistency
    const cachedTracks = processTrendingTracks(tracks, {
      limit: TRENDING_CONFIG.DEFAULT_LIMIT, // Use same limit as live component
      excludeTrackIds: [], // No exclusions for cache generation
      maxPerArtist: TRENDING_CONFIG.MAX_PER_ARTIST
    });

    console.log(`📈 Trending tracks: ${tracks.length} total → ${cachedTracks.length} cached (using shared algorithm)`);

    const cache: TrendingTracksCache = {
      tracks: cachedTracks,
      metadata: {
        generatedAt: new Date().toISOString(),
        totalCount: cachedTracks.length,
        dataSource: tracks.length > 0 ? 'nostr' : 'fallback',
        relaysUsed: relayUrls,
        cacheVersion: '1.0.0',
        algorithm: {
          zapAmountWeight: TRENDING_CONFIG.WEIGHTS.ZAP_AMOUNT,
          zapCountWeight: TRENDING_CONFIG.WEIGHTS.ZAP_COUNT,
          recencyWeight: TRENDING_CONFIG.WEIGHTS.RECENCY,
          maxPerArtist: TRENDING_CONFIG.MAX_PER_ARTIST,
          defaultLimit: TRENDING_CONFIG.DEFAULT_LIMIT
        }
      }
    };

    // Write trending tracks cache to both directories
    await writeToMultipleDirectories('data/trending-tracks.json', JSON.stringify(cache, null, 2));

    console.log(`✅ Generated trending tracks cache (${cachedTracks.length} tracks using shared algorithm)`);
  } catch (error) {
    console.error('❌ Failed to generate trending tracks cache:', error);
    
    // Create minimal fallback cache
    const fallbackCache: TrendingTracksCache = {
      tracks: [],
      metadata: {
        generatedAt: new Date().toISOString(),
        totalCount: 0,
        dataSource: 'fallback',
        relaysUsed: relayUrls,
        cacheVersion: '1.0.0',
        algorithm: {
          zapAmountWeight: TRENDING_CONFIG.WEIGHTS.ZAP_AMOUNT,
          zapCountWeight: TRENDING_CONFIG.WEIGHTS.ZAP_COUNT,
          recencyWeight: TRENDING_CONFIG.WEIGHTS.RECENCY,
          maxPerArtist: TRENDING_CONFIG.MAX_PER_ARTIST,
          defaultLimit: TRENDING_CONFIG.DEFAULT_LIMIT
        }
      }
    };
    
    await writeToMultipleDirectories('data/trending-tracks.json', JSON.stringify(fallbackCache, null, 2));
    console.log('📄 Created fallback trending tracks cache');
    
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

    // RSS health check
    await writeToMultipleDirectories('rss-health.json', JSON.stringify(rssHealthData, null, 2));

    // Cache health check
    const cacheHealthData = {
      status: 'ok',
      endpoints: {
        releases: '/data/releases.json',
        latestRelease: '/data/latest-release.json',
        trendingTracks: '/data/trending-tracks.json'
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

    await writeToMultipleDirectories('cache-health.json', JSON.stringify(cacheHealthData, null, 2));

    // .nojekyll file for GitHub Pages compatibility (only in dist)
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

    // Get default TTL
    const defaultTTL = getDefaultTTL();
    console.log(`👤 Multi-artist platform - no single configured artist`);

    // Fetch all data from Nostr relays (single fetch)
    const dataBundle = await fetchNostrDataBundle();

    // Convert playlists to releases for cache
    const releases = convertToReleases(dataBundle.playlists, dataBundle.tracks);

    // Ensure both dist and public directories exist
    const distDir = path.resolve('dist');
    const publicDir = path.resolve('public');
    await fs.mkdir(distDir, { recursive: true });
    await fs.mkdir(publicDir, { recursive: true });

    // Generate all outputs in parallel with error handling
    console.log('📝 Generating all outputs...');
    const buildPromises = [
      generateArtistRSSFeeds(dataBundle.tracks, dataBundle.playlists, dataBundle.allArtistMetadata, dataBundle.artists, defaultTTL, distDir)
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
      generateTrendingTracksCache(dataBundle.tracks, dataBundle.relaysUsed, distDir)
        .catch(error => {
          console.error('❌ Trending tracks cache generation failed:', error);
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
    console.log(`   • Trending tracks cache`);
    console.log(`   • Individual release caches (top 20)`);
    console.log(`   • Health check files`);
    console.log(`📁 Files available in: dist/ and public/`);
    console.log(`📡 RSS feeds: /rss/{artistPubkey}.xml`);
    console.log(`🗂️  Cache files: /data/releases.json, /data/latest-release.json, /data/trending-tracks.json`);
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