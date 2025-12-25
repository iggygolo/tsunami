import { useQuery } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import { genUserName } from '@/lib/genUserName';

interface UserMetadata {
  pubkey: string;
  name?: string;
  display_name?: string;
  picture?: string;
  about?: string;
  nip05?: string;
  created_at?: number;
}

interface ResolvedUser {
  pubkey: string;
  name: string;
  displayName: string;
  picture?: string;
  about?: string;
}

/**
 * Hook to fetch metadata for multiple users at once
 */
export function useUsersMetadata(pubkeys: string[]) {
  const { nostr } = useNostr();

  return useQuery<Map<string, ResolvedUser>>({
    queryKey: ['users-metadata', pubkeys.sort()],
    queryFn: async (context) => {
      const signal = AbortSignal.any([context.signal, AbortSignal.timeout(5000)]);
      
      if (pubkeys.length === 0) {
        return new Map();
      }

      console.log('🔍 Fetching metadata for users:', pubkeys.length);

      try {
        // Fetch kind 0 (metadata) events for all pubkeys
        const metadataEvents = await nostr.query([{
          kinds: [0],
          authors: pubkeys,
          limit: pubkeys.length * 2 // Allow for multiple events per user
        }], { signal });

        console.log('📄 User metadata events fetched:', metadataEvents.length);

        // Process metadata events and keep the latest for each pubkey
        const userMetadataMap = new Map<string, UserMetadata>();
        
        metadataEvents.forEach(event => {
          try {
            const existing = userMetadataMap.get(event.pubkey);
            if (!existing || event.created_at > (existing.created_at || 0)) {
              const metadata = JSON.parse(event.content);
              userMetadataMap.set(event.pubkey, {
                pubkey: event.pubkey,
                created_at: event.created_at,
                ...metadata
              });
            }
          } catch (error) {
            console.warn('Failed to parse user metadata:', error);
          }
        });

        // Convert to resolved users with fallbacks
        const resolvedUsers = new Map<string, ResolvedUser>();
        
        pubkeys.forEach(pubkey => {
          const metadata = userMetadataMap.get(pubkey);
          const fallbackName = genUserName(pubkey);
          
          resolvedUsers.set(pubkey, {
            pubkey,
            name: metadata?.name || metadata?.display_name || fallbackName,
            displayName: metadata?.display_name || metadata?.name || fallbackName,
            picture: metadata?.picture,
            about: metadata?.about,
          });
        });

        console.log('✅ Resolved users:', resolvedUsers.size);
        return resolvedUsers;

      } catch (error) {
        console.warn('Failed to fetch user metadata:', error);
        
        // Return fallback data for all pubkeys
        const fallbackUsers = new Map<string, ResolvedUser>();
        pubkeys.forEach(pubkey => {
          const fallbackName = genUserName(pubkey);
          fallbackUsers.set(pubkey, {
            pubkey,
            name: fallbackName,
            displayName: fallbackName,
          });
        });
        return fallbackUsers;
      }
    },
    enabled: pubkeys.length > 0,
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
  });
}

/**
 * Hook to fetch metadata for a single user
 */
export function useUserMetadata(pubkey: string) {
  const { data: usersMap } = useUsersMetadata(pubkey ? [pubkey] : []);
  return {
    data: pubkey ? usersMap?.get(pubkey) : undefined,
    isLoading: !usersMap && !!pubkey,
  };
}