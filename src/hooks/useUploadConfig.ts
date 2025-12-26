import { useArtistMetadata } from './useArtistMetadata';
import { useCurrentUser } from './useCurrentUser';
import { PLATFORM_CONFIG } from '@/lib/musicConfig';

/**
 * Hook for managing upload configuration
 * Now uses artist-configured Blossom servers instead of local storage
 */
export function useUploadConfig() {
  const { user } = useCurrentUser();
  const { data: artistMetadata } = useArtistMetadata(user?.pubkey);

  // Get Blossom servers from artist metadata or use platform defaults
  const blossomServers = artistMetadata?.blossomServers || PLATFORM_CONFIG.upload.blossomServers;

  return {
    config: {
      defaultProvider: 'blossom' as const, // Always use Blossom now
      blossomServers,
      vercelEnabled: false, // No longer supported
      blossomEnabled: true,
      maxFileSize: PLATFORM_CONFIG.upload.maxFileSize,
      allowedTypes: ['*/*'] // Blossom supports all file types
    },
    // Legacy function for backward compatibility
    updateProvider: () => {
      console.warn('updateProvider is deprecated - upload provider is now always Blossom');
    },
    // Legacy function for backward compatibility
    setConfig: () => {
      console.warn('setConfig is deprecated - configuration is now handled through Artist Settings');
    }
  };
}