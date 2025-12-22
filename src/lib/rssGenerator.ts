import type { PodcastRelease, PodcastTrailer } from '@/types/podcast';
import { PODCAST_CONFIG, type PodcastConfig } from './podcastConfig';
import { encodeReleaseAsNaddr } from './nip19Utils';
import { generateRSSFeed as generateRSSFeedCore, podcastConfigToRSSConfig } from './rssCore';

/**
 * Browser-compatible RSS feed generation using the consolidated core
 */
export function generateRSSFeed(releases: PodcastRelease[], trailers: PodcastTrailer[] = [], config?: PodcastConfig): string {
  const podcastConfig = config || PODCAST_CONFIG;
  const rssConfig = podcastConfigToRSSConfig(podcastConfig);
  
  return generateRSSFeedCore(releases, trailers, rssConfig, encodeReleaseAsNaddr);
}

/**
 * Downloads RSS feed as a file
 */
export function downloadRSSFeed(releases: PodcastRelease[], trailers: PodcastTrailer[] = []): void {
  const xml = generateRSSFeed(releases, trailers);
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
export function useRSSFeed(releases: PodcastRelease[] | undefined, trailers: PodcastTrailer[] = []): string | null {
  if (!releases) return null;
  return generateRSSFeed(releases, trailers);
}

/**
 * Generate RSS feed and make it available at /rss.xml
 * This function should be called when podcast metadata or releases are updated
 */
export async function genRSSFeed(releases?: PodcastRelease[], trailers: PodcastTrailer[] = [], config?: PodcastConfig): Promise<void> {
  try {
    // Fetch releases if not provided
    if (!releases) {
      // This is a placeholder - in a real implementation, you'd fetch releases from your data source
      console.warn('genRSSFeed called without releases - using placeholder data');
      releases = [];
    }

    // Generate RSS XML with provided configuration or fallback to hardcoded config
    const rssContent = generateRSSFeed(releases, trailers, config);

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