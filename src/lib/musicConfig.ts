import { nip19 } from 'nostr-tools';

/**
 * Platform configuration for Tsunami multi-artist platform
 * This defines default values and constants used across the platform
 * All artist-specific configuration is now handled through Artist Settings UI
 */

/**
 * Default Blossom servers for file uploads
 */
export const DEFAULT_BLOSSOM_SERVERS = [
  'https://blossom.primal.net',
  'https://blossom.nostr.band'
];

/**
 * Platform configuration interface
 * This is now minimal since all artist-specific config is handled per-artist
 */
export interface PlatformConfig {
  /** Default values for new artists */
  defaults: {
    artistName: string;
    description: string;
    image: string;
    website: string;
    copyright: string;
    value: {
      amount: number;
      currency: string;
      recipients: Array<{
        name: string;
        type: 'node' | 'lnaddress';
        address: string;
        split: number;
        customKey?: string;
        customValue?: string;
        fee?: boolean;
      }>;
    };
    medium: 'music';
    license: {
      identifier: string;
      url?: string;
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
    artistName: 'Unknown Artist',
    description: 'A Nostr-powered artist exploring decentralized music',
    image: '',
    website: '',
    copyright: `© ${new Date().getFullYear()} Unknown Artist`,
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
 * Legacy MUSIC_CONFIG for backward compatibility
 * This maintains the same interface but uses hardcoded defaults
 * @deprecated Use PLATFORM_CONFIG instead for new code
 */
export const MUSIC_CONFIG = {
  // No longer uses environment variables - this is just for backward compatibility
  artistNpub: "npub1km5prrxcgt5fwgjzjpltyswsuu7u7jcj2cx9hk2rwvxyk00v2jqsgv0a3h",

  music: {
    artistName: PLATFORM_CONFIG.defaults.artistName,
    description: PLATFORM_CONFIG.defaults.description,
    image: PLATFORM_CONFIG.defaults.image,
    website: PLATFORM_CONFIG.defaults.website,
    copyright: PLATFORM_CONFIG.defaults.copyright,
    value: PLATFORM_CONFIG.defaults.value,
    guid: "npub1km5prrxcgt5fwgjzjpltyswsuu7u7jcj2cx9hk2rwvxyk00v2jqsgv0a3h",
    medium: PLATFORM_CONFIG.defaults.medium,
    publisher: PLATFORM_CONFIG.defaults.artistName,
    locked: {
      owner: PLATFORM_CONFIG.defaults.artistName,
      locked: true
    },
    location: undefined,
    person: [
      {
        name: PLATFORM_CONFIG.defaults.artistName,
        role: "artist",
        group: "cast"
      }
    ],
    license: PLATFORM_CONFIG.defaults.license,
    txt: undefined,
    remoteItem: undefined,
    block: undefined,
    newFeedUrl: undefined,
  },

  rss: {
    ttl: PLATFORM_CONFIG.rss.ttl
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
 * Get the artist's pubkey in hex format (for Nostr queries)
 * @deprecated This function is for backward compatibility only
 * In multi-artist platform, use the specific artist's pubkey instead
 */
export function getArtistPubkeyHex(): string {
  try {
    const decoded = nip19.decode(MUSIC_CONFIG.artistNpub);
    if (decoded.type === 'npub') {
      return decoded.data;
    }
    throw new Error('Invalid npub format');
  } catch (error) {
    console.error('Failed to decode artist npub:', error);
    // Fallback to the original value in case it's already hex
    return MUSIC_CONFIG.artistNpub;
  }
}

/**
 * Check if a pubkey is the music artist
 * @deprecated This function is for backward compatibility only
 * In multi-artist platform, any logged-in user can be an artist
 */
export function isArtist(pubkey: string): boolean {
  // In multi-artist platform, any user with a valid pubkey can be an artist
  return Boolean(pubkey && pubkey.length > 0);
}

/**
 * Get default configuration for a new artist
 */
export function getDefaultArtistConfig() {
  return {
    ...PLATFORM_CONFIG.defaults,
    blossomServers: PLATFORM_CONFIG.upload.blossomServers,
    rssEnabled: false,
    updated_at: Math.floor(Date.now() / 1000)
  };
}