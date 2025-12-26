import { useQuery } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import { MUSIC_CONFIG, MUSIC_KINDS, PLATFORM_CONFIG, getDefaultArtistConfig } from '@/lib/musicConfig';

interface ArtistMetadata {
  artist: string;
  description: string;
  image: string;
  website: string;
  copyright: string;
  rssEnabled?: boolean; // Optional for backward compatibility
  blossomServers?: string[]; // Custom Blossom servers for this artist
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
  // Podcasting 2.0 fields
  guid?: string;
  medium?: 'podcast' | 'music' | 'video' | 'film' | 'audiobook' | 'newsletter' | 'blog';
  publisher?: string;
  location?: {
    name: string;
    geo?: string;
    osm?: string;
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
  updated_at: number;
}

export function useArtistMetadata(artistPubkey?: string) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['artist-metadata', artistPubkey],
    queryFn: async (context): Promise<ArtistMetadata> => {
      // Use provided pubkey or fall back to config
      const pubkey = artistPubkey || MUSIC_CONFIG.artistNpub;
      
      // Convert npub to hex if needed
      let hexPubkey = pubkey;
      if (pubkey.startsWith('npub')) {
        try {
          const { nip19 } = await import('nostr-tools');
          const decoded = nip19.decode(pubkey);
          if (decoded.type === 'npub') {
            hexPubkey = decoded.data;
          }
        } catch (error) {
          console.warn('Failed to decode npub, using as-is:', error);
        }
      }

      try {
        // Query for podcast metadata events with shorter timeout for speed
        // NPool will query all configured relays and return results from fastest responders
        const signal = AbortSignal.any([context.signal, AbortSignal.timeout(3000)]);

        const events = await nostr.query([
          {
            kinds: [MUSIC_KINDS.ARTIST_METADATA], // Addressable podcast metadata event
            authors: [hexPubkey],
            '#d': ['artist-metadata'],
            limit: 10 // Only need the most recent event
          }
        ], { signal });

        if (events.length > 0) {
          // Get the most recent event
          const latestEvent = events.reduce((latest, current) =>
            current.created_at > latest.created_at ? current : latest
          );

          const metadata = JSON.parse(latestEvent.content);

          return {
            ...metadata,
            artist: metadata.artist || PLATFORM_CONFIG.defaults.artistName,
            rssEnabled: metadata.rssEnabled || false, // Default to false if not present
            blossomServers: metadata.blossomServers || PLATFORM_CONFIG.upload.blossomServers, // Use platform defaults if not configured
            updated_at: latestEvent.created_at
          };
        }
      } catch (error) {
        console.warn('Failed to fetch podcast metadata from Nostr, using fallback:', error);
      }

      // Fallback to platform defaults
      const defaultConfig = getDefaultArtistConfig();
      return {
        description: defaultConfig.description,
        artist: defaultConfig.artistName,
        image: defaultConfig.image,
        website: defaultConfig.website,
        copyright: defaultConfig.copyright,
        rssEnabled: defaultConfig.rssEnabled,
        blossomServers: defaultConfig.blossomServers,
        value: {
          amount: defaultConfig.value.amount,
          currency: defaultConfig.value.currency,
          recipients: defaultConfig.value.recipients
        },
        guid: MUSIC_CONFIG.music.guid, // Keep for backward compatibility
        medium: defaultConfig.medium,
        publisher: defaultConfig.artistName,
        location: undefined,
        person: [
          {
            name: defaultConfig.artistName,
            role: "artist",
            group: "cast"
          }
        ],
        license: defaultConfig.license,
        updated_at: 0
      };
    },
    staleTime: 10 * 60 * 1000, // 10 minutes - cache longer for speed
    gcTime: 60 * 60 * 1000, // 1 hour
    retry: 1, // Only retry once for faster failure
    retryDelay: 500, // Quick retry
    enabled: !!artistPubkey || !!MUSIC_CONFIG.artistNpub, // Only run if we have a pubkey
  });
}