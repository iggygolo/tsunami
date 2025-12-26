import type { MusicTrackData, MusicPlaylistData } from '@/types/music';
import { MUSIC_CONFIG, type MusicConfig } from './musicConfig';
import { 
  generateRSSFeed as generateRSSFeedCore,
  musicConfigToRSSConfig 
} from './rssCore';

/**
 * Browser-compatible RSS feed generation using the consolidated core
 * Returns single RSS feed with multiple channels (one per release)
 */
export function generateRSSFeed(tracks: MusicTrackData[], releases: MusicPlaylistData[] = [], config?: MusicConfig): string {
  const musicConfig = config || MUSIC_CONFIG;
  const rssConfig = musicConfigToRSSConfig(musicConfig);
  
  return generateRSSFeedCore(tracks, releases, rssConfig);
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
export async function genRSSFeed(tracks?: MusicTrackData[], releases: MusicPlaylistData[] = [], config?: MusicConfig): Promise<void> {
  try {
    // Fetch tracks if not provided
    if (!tracks) {
      console.warn('genRSSFeed called without tracks - using placeholder data');
      tracks = [];
    }

    // Generate single RSS feed with multiple channels (one per release)
    const rssContent = generateRSSFeed(tracks, releases, config);

    // Store the RSS content in localStorage
    localStorage.setItem('rss-content', rssContent);
    localStorage.setItem('rss-updated', Date.now().toString());

    console.log(`Generated RSS feed with ${releases.length} channels (one per release)`);

  } catch (error) {
    console.error('Failed to generate RSS feed:', error);
    throw new Error('Failed to generate RSS feed');
  }
}