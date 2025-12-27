import { useArtistMetadata } from './useArtistMetadata';
import { useCurrentUser } from './useCurrentUser';
import { PLATFORM_CONFIG } from '@/lib/musicConfig';

/**
 * Hook for managing upload configuration
 * Uses artist-configured Blossom servers with platform defaults as fallback
 */
export function useUploadConfig() {
  const { user } = useCurrentUser();
  const { data: artistMetadata } = useArtistMetadata(user?.pubkey);

  // Get Blossom servers from artist metadata or use platform defaults
  const blossomServers = artistMetadata?.blossomServers || PLATFORM_CONFIG.upload.blossomServers;

  return {
    config: {
      defaultProvider: 'blossom' as const,
      blossomServers,
      maxFileSize: PLATFORM_CONFIG.upload.maxFileSize,
      allowedTypes: ['*/*']
    }
  };
}