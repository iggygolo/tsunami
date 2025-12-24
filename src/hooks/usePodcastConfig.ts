import { usePodcastMetadata } from './usePodcastMetadata';
import { MUSIC_CONFIG } from '@/lib/musicConfig';

export function usePodcastConfig() {
  const { data: podcastMetadata } = usePodcastMetadata();

  // Return dynamic config if metadata exists, otherwise fallback to hardcoded config
  const config = podcastMetadata ? {
    ...MUSIC_CONFIG,
    podcast: {
      ...MUSIC_CONFIG.podcast,
      ...podcastMetadata
    }
  } : MUSIC_CONFIG;

  return config;
}