import type { MusicTrackData, MusicPlaylistData } from '@/types/podcast';
import { PODCAST_CONFIG, type PodcastConfig } from './podcastConfig';
import { encodeMusicTrackAsNaddr, encodeMusicPlaylistAsNaddr } from './nip19Utils';
import { 
  generateRSSFeed as generateRSSFeedCore,
  podcastConfigToRSSConfig 
} from './rssCore';

/**
 * Browser-compatible RSS feed generation using the consolidated core
 * Returns single RSS feed with multiple channels (one per release)
 */
export function generateRSSFeed(tracks: MusicTrackData[], releases: MusicPlaylistData[] = [], config?: PodcastConfig): string {
  const podcastConfig = config || PODCAST_CONFIG;
  const rssConfig = podcastConfigToRSSConfig(podcastConfig);
  
  return generateRSSFeedCore(tracks, releases, rssConfig, encodeMusicTrackAsNaddr, encodeMusicPlaylistAsNaddr);
}

/**
 * Downloads RSS feed as a file
 */
export function downloadRSSFeed(tracks: MusicTrackData[], releases: MusicPlaylistData[] = []): void {
  const xml = generateRSSFeed(tracks, releases);
  const blob = new Blob([xml], { type: 'application/rss+xml' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = 'podcast-feed.xml';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
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
 * This function should be called when podcast metadata or tracks are updated
 */
export async function genRSSFeed(tracks?: MusicTrackData[], releases: MusicPlaylistData[] = [], config?: PodcastConfig): Promise<void> {
  try {
    // Fetch tracks if not provided
    if (!tracks) {
      console.warn('genRSSFeed called without tracks - using placeholder data');
      tracks = [];
    }

    // Generate single RSS feed with multiple channels (one per release)
    const rssContent = generateRSSFeed(tracks, releases, config);

    // Store the RSS content in localStorage
    localStorage.setItem('podcast-rss-content', rssContent);
    localStorage.setItem('podcast-rss-updated', Date.now().toString());

    console.log(`Generated RSS feed with ${releases.length} channels (one per release)`);

  } catch (error) {
    console.error('Failed to generate RSS feed:', error);
    throw new Error('Failed to generate RSS feed');
  }
}