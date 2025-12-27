import { nip19 } from 'nostr-tools';

/**
 * Platform configuration for Tsunami multi-artist platform
 * This defines default values and constants used across the platform
 * All artist-specific configuration is now handled through Artist Settings UI
 */

/**

/**
 * Default Blossom servers for file uploads
 */
export const DEFAULT_BLOSSOM_SERVERS = [
  'https://blossom.primal.net',
  'https://blossom.nostr.band'
];

/**
 * Platform configuration interface
 * Provides empty defaults that should be populated per-artist in multi-artist platform
 */
export interface PlatformConfig {
  /** Empty defaults for new artists - should be customized per artist */
  defaults: {
    artistName: string; // Empty string - must be set per artist
    description: string; // Empty string - must be set per artist
    image: string; // Empty string - must be set per artist
    website: string; // Empty string - optional per artist
    copyright: string; // Year only - artist name added per artist
    value: {
      amount: number; // Default sats amount for zaps
      currency: string; // Always 'sats'
      recipients: Array<{
        name: string;
        type: 'node' | 'lnaddress';
        address: string;
        split: number;
        customKey?: string;
        customValue?: string;
        fee?: boolean;
      }>; // Empty array - must be configured per artist
    };
    medium: 'music'; // Always 'music' for this platform
    license: {
      identifier: string; // Default license type
      url?: string; // Optional license URL
    };
  };
  
  /** Upload configuration */
  upload: {
    blossomServers: string[];
    maxFileSize: number;
  };

  /** RSS feed configuration */
  rss: {
    ttl: number; // Cache time in minutes
  };
}

/**
 * Platform configuration with sensible defaults
 * No environment variables needed - everything is hardcoded or configured per-artist
 */
export const PLATFORM_CONFIG: PlatformConfig = {
  defaults: {
    artistName: '',
    description: '',
    image: '',
    website: '',
    copyright: `© ${new Date().getFullYear()}`,
    value: {
      amount: 100,
      currency: 'sats',
      recipients: []
    },
    medium: 'music',
    license: {
      identifier: 'All Rights Reserved',
      url: ''
    }
  },
  
  upload: {
    blossomServers: DEFAULT_BLOSSOM_SERVERS,
    maxFileSize: 100 * 1024 * 1024 // 100MB
  },

  rss: {
    ttl: 60 // 60 minutes
  }
};

/**
 * Nostr event kinds used by Tsunami
 */
export const MUSIC_KINDS = {
  /** Music Track Event (addressable, individual tracks) */
  MUSIC_TRACK: 36787,
  /** Music Playlist Event (addressable, ordered track collections) */
  MUSIC_PLAYLIST: 34139,
  /** NIP-22: Comments on podcast releases */
  COMMENT: 1111,
  /** Standard text notes that may reference releases */
  NOTE: 1,
  /** Profile metadata */
  PROFILE: 0,
  /** Artist metadata - using addressable event for artist-specific config */
  ARTIST_METADATA: 30078
} as const;

/**
 * Check if a user can act as an artist (any authenticated user can be an artist)
 * In multi-artist platform, any logged-in user can create and manage music content
 */
export function isArtist(pubkey: string): boolean {
  // In multi-artist platform, any user with a valid pubkey can be an artist
  return Boolean(pubkey && pubkey.length > 0);
}

/**
 * Get default configuration for a new artist
 * Returns empty values that must be populated by the artist
 */
export function getDefaultArtistConfig() {
  return {
    ...PLATFORM_CONFIG.defaults,
    // Artist must fill these in:
    // - artistName (required)
    // - description (recommended)
    // - image (recommended)
    // - website (optional)
    // - value.recipients (required for payments)
    blossomServers: PLATFORM_CONFIG.upload.blossomServers,
    rssEnabled: false,
    updated_at: Math.floor(Date.now() / 1000)
  };
}