import { useArtistMetadata } from './useArtistMetadata';
import { useCurrentUser } from './useCurrentUser';
import { PLATFORM_CONFIG, getDefaultArtistConfig } from '@/lib/musicConfig';

/**
 * Hook for getting music configuration with proper fallback handling
 * Returns artist-specific config when available, or platform defaults
 */
export function useMusicConfig() {
  const { user } = useCurrentUser();
  const { data: artistMetadata, isLoading, error } = useArtistMetadata(user?.pubkey);

  // Create a consistent config structure
  const createConfig = (data: any) => ({
    // Legacy structure for backward compatibility
    artistNpub: user?.npub || "",
    music: {
      artistName: data.artistName,
      description: data.description,
      image: data.image,
      website: data.website,
      copyright: data.copyright,
      value: data.value,
      guid: data.guid || user?.pubkey || "",
      medium: data.medium,
      publisher: data.publisher || data.artistName,
      locked: {
        owner: data.artistName,
        locked: true
      },
      location: data.location,
      person: data.person || [
        {
          name: data.artistName,
          role: "artist",
          group: "cast"
        }
      ],
      license: data.license,
      txt: undefined,
      remoteItem: undefined,
      block: undefined,
      newFeedUrl: undefined,
    },
    rss: {
      ttl: PLATFORM_CONFIG.rss.ttl
    }
  });

  // If we have artist metadata, use it
  if (artistMetadata && !error) {
    return createConfig({
      artistName: artistMetadata.artist,
      description: artistMetadata.description,
      image: artistMetadata.image,
      website: artistMetadata.website,
      copyright: artistMetadata.copyright,
      value: artistMetadata.value,
      guid: artistMetadata.guid,
      medium: artistMetadata.medium || PLATFORM_CONFIG.defaults.medium,
      publisher: artistMetadata.publisher,
      location: artistMetadata.location,
      person: artistMetadata.person,
      license: artistMetadata.license || PLATFORM_CONFIG.defaults.license,
    });
  }

  // If user is logged in but no metadata (or loading), use user profile + platform defaults
  if (user) {
    const defaultConfig = getDefaultArtistConfig();
    return createConfig({
      artistName: user.name || defaultConfig.artistName,
      description: defaultConfig.description,
      image: user.picture || defaultConfig.image,
      website: user.website || defaultConfig.website,
      copyright: `© ${new Date().getFullYear()} ${user.name || defaultConfig.artistName}`,
      value: defaultConfig.value,
      guid: user.pubkey,
      medium: defaultConfig.medium,
      publisher: user.name || defaultConfig.artistName,
      location: undefined,
      person: [
        {
          name: user.name || defaultConfig.artistName,
          role: "artist",
          group: "cast"
        }
      ],
      license: defaultConfig.license,
    });
  }

  // Fallback to generic platform defaults when no user is logged in
  const defaultConfig = getDefaultArtistConfig();
  return createConfig(defaultConfig);
}