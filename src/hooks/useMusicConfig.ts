import { useArtistMetadata } from './useArtistMetadata';
import { MUSIC_CONFIG } from '@/lib/musicConfig';

export function useMusicConfig() {
  const { data: artistMetadata } = useArtistMetadata();

  // Return dynamic config if metadata exists, otherwise fallback to hardcoded config
  const config = artistMetadata ? {
    ...MUSIC_CONFIG,
    music: {
      ...MUSIC_CONFIG.music,
      ...artistMetadata
    }
  } : MUSIC_CONFIG;

  return config;
}