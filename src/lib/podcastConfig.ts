import { nip19 } from 'nostr-tools';

/**
 * Podcast configuration for Tsunami
 * This defines the music metadata and artist information
 * Values are loaded from environment variables with fallbacks
 */

/**
 * Safely parse JSON from environment variable
 */
function parseJsonEnv<T>(envValue: string | undefined, fallback: T): T {
  if (!envValue || envValue.trim() === '') return fallback;
  try {
    return JSON.parse(envValue) as T;
  } catch (error) {
    console.warn(`Failed to parse JSON from env var, using fallback:`, error);
    return fallback;
  }
}

/**
 * Parse comma-separated string to array
 */
function parseArrayEnv(envValue: string | undefined, fallback: string[]): string[] {
  if (!envValue || envValue.trim() === '') return fallback;
  return envValue.split(',').map(s => s.trim()).filter(s => s.length > 0);
}

export interface PodcastConfig {
  /** The hardcoded npub of the music artist */
  artistNpub: string;

  /** Podcast metadata */
  podcast: {
    artistName: string;
    description: string;
    image: string;
    website: string;
    copyright: string;
    funding: string[];
    value: {
      amount: number;
      currency: string;
      recipients?: Array<{
        name: string;
        type: 'node' | 'lnaddress';
        address: string;
        split: number;
        customKey?: string;
        customValue?: string;
        fee?: boolean;
      }>;
    };
    // New Podcasting 2.0 fields
    guid?: string; // Unique podcast identifier
    medium?: 'podcast' | 'music' | 'video' | 'film' | 'audiobook' | 'newsletter' | 'blog';
    publisher?: string; // Publisher name
    location?: {
      name: string;
      geo?: string; // latitude,longitude
      osm?: string; // OpenStreetMap identifier
    };
    person?: Array<{
      name: string;
      role: string;
      group?: string;
      img?: string;
      href?: string;
    }>;
    license?: {
      identifier: string;
      url?: string;
    };
    txt?: Array<{
      purpose: string;
      content: string;
    }>;
    remoteItem?: Array<{
      feedGuid: string;
      feedUrl?: string;
      itemGuid?: string;
      medium?: string;
    }>;
    block?: {
      id: string;
      reason?: string;
    };
    newFeedUrl?: string;
  };

  /** RSS feed configuration */
  rss: {
    ttl: number; // Cache time in minutes - RSS specific setting
  };
}

export const PODCAST_CONFIG: PodcastConfig = {
  // Artist npub - loaded from environment
  artistNpub: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_ARTIST_NPUB) || "npub1km5prrxcgt5fwgjzjpltyswsuu7u7jcj2cx9hk2rwvxyk00v2jqsgv0a3h",

  podcast: {
    artistName: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_ARTIST_NAME) || "Tsunami Artist",
    description: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_MUSIC_DESCRIPTION) || "A Nostr-powered artist exploring decentralized music",
    image: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_ARTIST_IMAGE) || "",
    website: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_ARTIST_WEBSITE) || "https://tsunami.example",
    copyright: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_ARTIST_COPYRIGHT) || "© 2025 Tsunami Artist",
    funding: parseArrayEnv((typeof import.meta !== 'undefined' && import.meta.env?.VITE_ARTIST_FUNDING), ["/about"]),
    value: {
      amount: parseInt((typeof import.meta !== 'undefined' && import.meta.env?.VITE_MUSIC_VALUE_AMOUNT) || "1000", 10),
      currency: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_MUSIC_VALUE_CURRENCY) || "sats",
      recipients: parseJsonEnv((typeof import.meta !== 'undefined' && import.meta.env?.VITE_MUSIC_VALUE_RECIPIENTS), [])
    },
    // Podcasting 2.0 fields from environment
    guid: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_MUSIC_GUID) || (typeof import.meta !== 'undefined' && import.meta.env?.VITE_ARTIST_NPUB) || "npub1km5prrxcgt5fwgjzjpltyswsuu7u7jcj2cx9hk2rwvxyk00v2jqsgv0a3h",
    medium: ((typeof import.meta !== 'undefined' && import.meta.env?.VITE_MUSIC_MEDIUM) as "podcast" | "music" | "video" | "film" | "audiobook" | "newsletter" | "blog") || "podcast",
    publisher: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_ARTIST_PUBLISHER) || (typeof import.meta !== 'undefined' && import.meta.env?.VITE_ARTIST_NAME) || "Tsunami Artist",
    location: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_ARTIST_LOCATION_NAME) ? {
      name: import.meta.env.VITE_ARTIST_LOCATION_NAME,
      geo: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_ARTIST_LOCATION_GEO) || undefined,
      osm: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_ARTIST_LOCATION_OSM) || undefined
    } : undefined,
    person: parseJsonEnv((typeof import.meta !== 'undefined' && import.meta.env?.VITE_MUSIC_PERSON), [
      {
        name: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_ARTIST_NAME) || "Tsunami Artist",
        role: "artist",
        group: "cast"
      }
    ]),
    license: {
      identifier: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_MUSIC_LICENSE_IDENTIFIER) || "All Right Reserved",
      url: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_MUSIC_LICENSE_URL) || ""
    },
    txt: parseJsonEnv((typeof import.meta !== 'undefined' && import.meta.env?.VITE_MUSIC_TXT), undefined),
    remoteItem: parseJsonEnv((typeof import.meta !== 'undefined' && import.meta.env?.VITE_MUSIC_REMOTE_ITEM), undefined),
    block: parseJsonEnv((typeof import.meta !== 'undefined' && import.meta.env?.VITE_MUSIC_BLOCK), undefined),
    newFeedUrl: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_MUSIC_NEW_FEED_URL) || undefined,
  },

  rss: {
    ttl: parseInt((typeof import.meta !== 'undefined' && import.meta.env?.VITE_MUSIC_RSS_TTL) || "60", 10)
  }
};

/**
 * Nostr event kinds used by Tsunami
 */
export const PODCAST_KINDS = {
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
 */
export function getArtistPubkeyHex(): string {
  try {
    const decoded = nip19.decode(PODCAST_CONFIG.artistNpub);
    if (decoded.type === 'npub') {
      return decoded.data;
    }
    throw new Error('Invalid npub format');
  } catch (error) {
    console.error('Failed to decode artist npub:', error);
    // Fallback to the original value in case it's already hex
    return PODCAST_CONFIG.artistNpub;
  }
}

/**
 * Check if a pubkey is the music artist
 */
export function isArtist(pubkey: string): boolean {
  const artistHex = getArtistPubkeyHex();
  return pubkey === artistHex;
}
