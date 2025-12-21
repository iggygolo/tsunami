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
  artistNpub: import.meta.env.VITE_ARTIST_NPUB || "npub1km5prrxcgt5fwgjzjpltyswsuu7u7jcj2cx9hk2rwvxyk00v2jqsgv0a3h",

  podcast: {
    artistName: import.meta.env.VITE_ARTIST_NAME || "Tsunami Artist",
    description: import.meta.env.VITE_MUSIC_DESCRIPTION || "A Nostr-powered artist exploring decentralized music",
    image: import.meta.env.VITE_ARTIST_IMAGE || "",
    website: import.meta.env.VITE_ARTIST_WEBSITE || "https://tsunami.example",
    copyright: import.meta.env.VITE_ARTIST_COPYRIGHT || "© 2025 Tsunami Artist",
    funding: parseArrayEnv(import.meta.env.VITE_ARTIST_FUNDING, ["/about"]),
    value: {
      amount: parseInt(import.meta.env.VITE_MUSIC_VALUE_AMOUNT || "1000", 10),
      currency: import.meta.env.VITE_MUSIC_VALUE_CURRENCY || "sats",
      recipients: parseJsonEnv(import.meta.env.VITE_MUSIC_VALUE_RECIPIENTS, [
        {
          name: "Artist",
          type: "node" as const,
          address: "030a58b8653d32b99200a2334cfe913e51dc7d155aa0116c176657a4f1722677a3",
          split: 80,
          fee: false
        },
        {
          name: "Producer",
          type: "lnaddress" as const, 
          address: "producer@getalby.com",
          split: 15,
          customKey: "podcast",
          customValue: "producer-fee"
        },
        {
          name: "Platform Fee",
          type: "node" as const,
          address: "021f2f8e1e46a48d0a9f1b7e4e8b5c8d5e4f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6",
          split: 5,
          fee: true
        }
      ])
    },
    // Podcasting 2.0 fields from environment
    guid: import.meta.env.VITE_MUSIC_GUID || import.meta.env.VITE_ARTIST_NPUB || "npub1km5prrxcgt5fwgjzjpltyswsuu7u7jcj2cx9hk2rwvxyk00v2jqsgv0a3h",
    medium: (import.meta.env.VITE_MUSIC_MEDIUM as "podcast" | "music" | "video" | "film" | "audiobook" | "newsletter" | "blog") || "podcast",
    publisher: import.meta.env.VITE_ARTIST_PUBLISHER || import.meta.env.VITE_ARTIST_NAME || "Tsunami Artist",
    location: import.meta.env.VITE_ARTIST_LOCATION_NAME ? {
      name: import.meta.env.VITE_ARTIST_LOCATION_NAME,
      geo: import.meta.env.VITE_ARTIST_LOCATION_GEO || undefined,
      osm: import.meta.env.VITE_ARTIST_LOCATION_OSM || undefined
    } : undefined,
    person: parseJsonEnv(import.meta.env.VITE_MUSIC_PERSON, [
      {
        name: import.meta.env.VITE_ARTIST_NAME || "Tsunami Artist",
        role: "artist",
        group: "cast"
      }
    ]),
    license: {
      identifier: import.meta.env.VITE_MUSIC_LICENSE_IDENTIFIER || "All Right Reserved",
      url: import.meta.env.VITE_MUSIC_LICENSE_URL || ""
    },
    txt: parseJsonEnv(import.meta.env.VITE_MUSIC_TXT, undefined),
    remoteItem: parseJsonEnv(import.meta.env.VITE_MUSIC_REMOTE_ITEM, undefined),
    block: parseJsonEnv(import.meta.env.VITE_MUSIC_BLOCK, undefined),
    newFeedUrl: import.meta.env.VITE_MUSIC_NEW_FEED_URL || undefined,
  },

  rss: {
    ttl: parseInt(import.meta.env.VITE_MUSIC_RSS_TTL || "60", 10)
  }
};

/**
 * Nostr event kinds used by Tsunami
 */
export const PODCAST_KINDS = {
  /** Addressable Podcast releases (editable, replaceable) */
  EPISODE: 30054,
  /** Addressable Podcast trailers (editable, replaceable) */
  TRAILER: 30055,
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
