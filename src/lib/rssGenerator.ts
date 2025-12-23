import type { MusicTrackData, MusicPlaylistData } from '@/types/podcast';
import { PODCAST_CONFIG, type PodcastConfig } from './podcastConfig';
import { encodeMusicTrackAsNaddr, encodeMusicPlaylistAsNaddr } from './nip19Utils';
import { generateRSSFeed as generateRSSFeedCore, podcastConfigToRSSConfig } from './rssCore';

/**
 * Browser-compatible RSS feed generation using the consolidated core
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
 * Generate RSS feed and make it available at /rss.xml
 * This function should be called when podcast metadata or tracks are updated
 */
export async function genRSSFeed(tracks?: MusicTrackData[], releases: MusicPlaylistData[] = [], config?: PodcastConfig): Promise<void> {
  try {
    // Fetch tracks if not provided
    if (!tracks) {
      // This is a placeholder - in a real implementation, you'd fetch tracks from your data source
      console.warn('genRSSFeed called without tracks - using placeholder data');
      tracks = [];
    }

    // Generate RSS XML with provided configuration or fallback to hardcoded config
    const rssContent = generateRSSFeed(tracks, releases, config);

    // Create a blob and object URL
    const blob = new Blob([rssContent], { type: 'application/rss+xml' });
    const rssUrl = URL.createObjectURL(blob);

    // Store the RSS content in localStorage for the RSSFeed component to use
    localStorage.setItem('podcast-rss-content', rssContent);
    localStorage.setItem('podcast-rss-updated', Date.now().toString());

    // Log success
    console.log('RSS feed generated and updated');

    // Clean up the object URL
    setTimeout(() => URL.revokeObjectURL(rssUrl), 1000);

  } catch (error) {
    console.error('Failed to generate RSS feed:', error);
    throw new Error('Failed to generate RSS feed');
  }
}