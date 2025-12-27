import type { MusicTrackData, MusicPlaylistData } from '@/types/music';
import { PLATFORM_CONFIG } from './musicConfig';
import { 
  generateRSSFeed as generateRSSFeedCore,
  type ArtistInfo 
} from './rssCore';

/**
 * Browser-compatible RSS feed generation using simplified parameters
 * Returns single RSS feed with multiple channels (one per release)
 */
export function generateRSSFeed(
  tracks: MusicTrackData[], 
  releases: MusicPlaylistData[] = [], 
  artistInfo?: ArtistInfo,
  ttl?: number
): string {
  // If no artist info provided, create a minimal fallback
  const fallbackArtistInfo: ArtistInfo = artistInfo || {
    pubkey: '',
    npub: '',
    name: 'Unknown Artist',
    metadata: {
      artist: 'Unknown Artist',
      description: 'Music by artist',
      copyright: `© ${new Date().getFullYear()}`
    }
  };

  // Use provided TTL or platform default
  const rssTtl = ttl || PLATFORM_CONFIG.rss.ttl;
  
  return generateRSSFeedCore(tracks, releases, fallbackArtistInfo, rssTtl);
}

/**
 * Hook to generate RSS feed content
 */
export function useRSSFeed(tracks: MusicTrackData[] | undefined, releases: MusicPlaylistData[] = []): string | null {
  if (!tracks) return null;
  return generateRSSFeed(tracks, releases);
}

/**
 * Generate RSS feeds and store them
 * This function should be called when metadata or tracks are updated
 */
export async function genRSSFeed(
  tracks?: MusicTrackData[], 
  releases: MusicPlaylistData[] = [], 
  artistInfo?: ArtistInfo,
  ttl?: number
): Promise<void> {
  try {
    // Fetch tracks if not provided
    if (!tracks) {
      console.warn('genRSSFeed called without tracks - using placeholder data');
      tracks = [];
    }

    // Generate single RSS feed with multiple channels (one per release)
    const rssContent = generateRSSFeed(tracks, releases, artistInfo, ttl);

    // Store the RSS content in localStorage
    localStorage.setItem('rss-content', rssContent);
    localStorage.setItem('rss-updated', Date.now().toString());

    console.log(`Generated RSS feed with ${releases.length} channels (one per release)`);

  } catch (error) {
    console.error('Failed to generate RSS feed:', error);
    throw new Error('Failed to generate RSS feed');
  }
}