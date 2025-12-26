import { useQuery } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import { type NostrEvent, type NostrMetadata, NSchema as n } from '@nostrify/nostrify';
import { 
  updateArtistCache, 
  batchUpdateArtistCache, 
  getArtistDisplayInfo,
  type SimpleArtistInfo 
} from '@/lib/artistUtils';
import { MUSIC_KINDS } from '@/lib/musicConfig';

/**
 * Hook to fetch profile metadata for multiple artists
 */
export function useArtistProfiles(pubkeys: string[]) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['artist-profiles', pubkeys.sort().join(',')],
    queryFn: async (context) => {
      if (pubkeys.length === 0) return [];

      const signal = AbortSignal.any([context.signal, AbortSignal.timeout(10000)]);

      console.log(`Fetching profiles for ${pubkeys.length} artists...`);

      // Fetch profile events for all artists
      const events = await nostr.query([{
        kinds: [MUSIC_KINDS.PROFILE], // Kind 0 - Profile metadata
        authors: pubkeys,
        limit: pubkeys.length * 2 // Allow for multiple versions per artist
      }], { signal });

      console.log(`Found ${events.length} profile events for ${pubkeys.length} artists`);

      // Process and deduplicate profiles (keep latest for each artist)
      const profilesByPubkey = new Map<string, { event: NostrEvent; metadata: NostrMetadata }>();

      events.forEach(event => {
        try {
          const metadata = n.json().pipe(n.metadata()).parse(event.content);
          const existing = profilesByPubkey.get(event.pubkey);
          
          // Keep the latest profile event
          if (!existing || event.created_at > existing.event.created_at) {
            profilesByPubkey.set(event.pubkey, { event, metadata });
          }
        } catch (error) {
          console.warn(`Failed to parse profile metadata for ${event.pubkey}:`, error);
        }
      });

      // Update cache and create artist info for all requested pubkeys
      const artistInfos: SimpleArtistInfo[] = [];
      
      pubkeys.forEach(pubkey => {
        const profile = profilesByPubkey.get(pubkey);
        
        if (profile) {
          // Update cache with profile data
          const artistInfo = updateArtistCache(pubkey, profile.metadata);
          artistInfos.push(artistInfo);
        } else {
          // Create basic info for artists without profiles
          const artistInfo = getArtistDisplayInfo(pubkey);
          artistInfos.push(artistInfo);
        }
      });

      console.log(`Processed ${artistInfos.length} artist profiles (${profilesByPubkey.size} with metadata)`);
      return artistInfos;
    },
    enabled: pubkeys.length > 0,
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
  });
}

/**
 * Hook to fetch profile for a single artist
 */
export function useArtistProfile(pubkey: string | undefined) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['artist-profile', pubkey],
    queryFn: async (context) => {
      if (!pubkey) return null;

      const signal = AbortSignal.any([context.signal, AbortSignal.timeout(5000)]);

      console.log(`Fetching profile for artist: ${pubkey.slice(0, 8)}...`);

      // Fetch profile events for the artist
      const events = await nostr.query([{
        kinds: [MUSIC_KINDS.PROFILE],
        authors: [pubkey],
        limit: 5 // Get multiple versions to find the latest
      }], { signal });

      if (events.length === 0) {
        console.log(`No profile found for artist: ${pubkey.slice(0, 8)}...`);
        // Return basic info without profile metadata
        return getArtistDisplayInfo(pubkey);
      }

      // Find the latest profile event
      const latestEvent = events.reduce((latest, current) => 
        current.created_at > latest.created_at ? current : latest
      );

      try {
        const metadata = n.json().pipe(n.metadata()).parse(latestEvent.content);
        console.log(`Found profile for artist: ${metadata.name || pubkey.slice(0, 8)}...`);
        
        // Update cache and return artist info
        return updateArtistCache(pubkey, metadata);
      } catch (error) {
        console.warn(`Failed to parse profile metadata for ${pubkey}:`, error);
        // Return basic info if profile parsing fails
        return getArtistDisplayInfo(pubkey);
      }
    },
    enabled: !!pubkey,
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
  });
}

/**
 * Hook to get artist info from cache or fetch if needed
 * This is optimized for UI components that need artist info quickly
 */
export function useArtistInfo(pubkey: string | undefined): SimpleArtistInfo | null {
  // First try to get from cache
  const cachedInfo = pubkey ? getArtistDisplayInfo(pubkey) : null;
  
  // Fetch profile in background if not cached or if we only have basic info
  const shouldFetch = pubkey && (!cachedInfo || !cachedInfo.name?.includes('@'));
  
  const { data: fetchedInfo } = useArtistProfile(shouldFetch ? pubkey : undefined);
  
  // Return fetched info if available, otherwise cached info
  return fetchedInfo || cachedInfo;
}

/**
 * Hook to discover and fetch profiles for artists from music events
 */
export function useDiscoveredArtists(musicEvents: Array<{ pubkey: string }>) {
  // Extract unique artist pubkeys
  const artistPubkeys = Array.from(new Set(
    musicEvents.map(event => event.pubkey).filter(Boolean)
  ));

  // Fetch profiles for all discovered artists
  return useArtistProfiles(artistPubkeys);
}