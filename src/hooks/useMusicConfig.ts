import { useArtistMetadata } from './useArtistMetadata';
import { useCurrentUser } from './useCurrentUser';
import { MUSIC_CONFIG, PLATFORM_CONFIG, getDefaultArtistConfig } from '@/lib/musicConfig';

export function useMusicConfig() {
  const { user } = useCurrentUser();
  const { data: artistMetadata } = useArtistMetadata(user?.pubkey);

  // Prioritize artist metadata over hardcoded config with graceful fallbacks
  if (artistMetadata) {
    return {
      ...MUSIC_CONFIG, // Keep legacy structure for backward compatibility
      music: {
        ...MUSIC_CONFIG.music,
        // Override with artist metadata
        artistName: artistMetadata.artist,
        description: artistMetadata.description,
        image: artistMetadata.image,
        website: artistMetadata.website,
        copyright: artistMetadata.copyright,
        value: artistMetadata.value,
        guid: artistMetadata.guid || user?.pubkey || MUSIC_CONFIG.music.guid,
        medium: artistMetadata.medium || PLATFORM_CONFIG.defaults.medium,
        publisher: artistMetadata.publisher || artistMetadata.artist,
        location: artistMetadata.location,
        person: artistMetadata.person || [
          {
            name: artistMetadata.artist,
            role: "artist",
            group: "cast"
          }
        ],
        license: artistMetadata.license || PLATFORM_CONFIG.defaults.license,
      }
    };
  }

  // Fallback to platform defaults when no artist metadata is available
  const defaultConfig = getDefaultArtistConfig();
  return {
    ...MUSIC_CONFIG, // Keep legacy structure for backward compatibility
    music: {
      ...MUSIC_CONFIG.music,
      // Use platform defaults
      artistName: defaultConfig.artistName,
      description: defaultConfig.description,
      image: defaultConfig.image,
      website: defaultConfig.website,
      copyright: defaultConfig.copyright,
      value: defaultConfig.value,
      medium: defaultConfig.medium,
      publisher: defaultConfig.artistName,
      person: [
        {
          name: defaultConfig.artistName,
          role: "artist",
          group: "cast"
        }
      ],
      license: defaultConfig.license,
    }
  };
}