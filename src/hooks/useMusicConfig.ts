import { useArtistMetadata } from './useArtistMetadata';
import { MUSIC_CONFIG } from '@/lib/musicConfig';

export function useMusicConfig() {
  const { data: podcastMetadata } = useArtistMetadata();

  // Return dynamic config if metadata exists, otherwise fallback to hardcoded config
  const config = podcastMetadata ? {
    ...MUSIC_CONFIG,
    podcast: {
      ...MUSIC_CONFIG.music,
      ...podcastMetadata
    }
  } : MUSIC_CONFIG;

  return config;
}