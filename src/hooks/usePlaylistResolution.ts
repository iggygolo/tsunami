import { useQuery } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import { validateMusicPlaylist, eventToMusicPlaylist } from '@/lib/eventConversions';
import { MUSIC_KINDS } from '@/lib/musicConfig';
import type { MusicPlaylistData } from '@/types/music';
import type { NostrEvent } from '@nostrify/nostrify';

export interface PlaylistResolutionOptions {
  trackPubkey: string;
  trackIdentifier: string;
  limit?: number;
  enabled?: boolean;
  timeout?: number;
}

export interface PlaylistResolutionResult {
  playlists: MusicPlaylistData[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Hook for finding all playlists that contain a specific track.
 * Queries for MUSIC_PLAYLIST events (kind 34139) that reference the track
 * in their 'a' tags using the format "36787:pubkey:identifier".
 */
export function usePlaylistResolution(
  options: PlaylistResolutionOptions
): PlaylistResolutionResult {
  const { nostr } = useNostr();
  const { 
    trackPubkey, 
    trackIdentifier, 
    limit = 50, 
    enabled = true, 
    timeout = 10000 
  } = options;

  const queryResult = useQuery<MusicPlaylistData[], Error>({
    queryKey: ['playlist-resolution', trackPubkey, trackIdentifier, limit],
    queryFn: async (context) => {
      const signal = AbortSignal.any([context.signal, AbortSignal.timeout(timeout)]);

      // Create the track reference string that playlists use in their 'a' tags
      const trackRef = `36787:${trackPubkey}:${trackIdentifier}`;

      console.log('🔍 PlaylistResolution - Searching for playlists containing track:', {
        trackRef,
        trackPubkey: trackPubkey.slice(0, 8) + '...',
        trackIdentifier,
        limit
      });

      try {
        // Query for playlist events that reference this track
        const events = await nostr.query([{
          kinds: [MUSIC_KINDS.MUSIC_PLAYLIST],
          '#a': [trackRef],
          limit
        }], { signal });

        console.log('📡 PlaylistResolution - Query result:', {
          found: events.length,
          trackRef
        });

        if (events.length === 0) {
          console.log('ℹ️ PlaylistResolution - No playlists found containing track');
          return [];
        }

        // Validate and convert events to playlist data
        const playlists: MusicPlaylistData[] = [];
        
        for (const event of events) {
          if (validateMusicPlaylist(event)) {
            try {
              const playlist = eventToMusicPlaylist(event);
              playlists.push(playlist);
              
              console.log('✅ PlaylistResolution - Playlist converted:', {
                title: playlist.title,
                identifier: playlist.identifier,
                trackCount: playlist.tracks.length
              });
            } catch (error) {
              console.warn('⚠️ PlaylistResolution - Failed to convert playlist:', {
                eventId: event.id.slice(0, 8) + '...',
                error: error instanceof Error ? error.message : 'Unknown error'
              });
            }
          } else {
            console.warn('⚠️ PlaylistResolution - Invalid playlist event:', {
              eventId: event.id.slice(0, 8) + '...',
              kind: event.kind
            });
          }
        }

        // Sort by creation date (newest first)
        playlists.sort((a, b) => {
          const aTime = a.createdAt?.getTime() || 0;
          const bTime = b.createdAt?.getTime() || 0;
          return bTime - aTime;
        });

        console.log('🎉 PlaylistResolution - Resolution complete:', {
          totalPlaylists: playlists.length,
          trackRef
        });

        return playlists;
      } catch (error) {
        console.error('❌ PlaylistResolution - Query failed:', {
          error: error instanceof Error ? error.message : 'Unknown error',
          trackRef
        });
        
        throw error;
      }
    },
    enabled: enabled && !!trackPubkey && !!trackIdentifier,
    staleTime: 300000, // 5 minutes
    gcTime: 1800000, // 30 minutes
    retry: (failureCount, error) => {
      if (failureCount >= 3) {
        console.log('🛑 PlaylistResolution - Max retries reached');
        return false;
      }
      
      // Don't retry on validation errors
      if (error instanceof Error && error.message.includes('Invalid')) {
        console.log('🚫 PlaylistResolution - Not retrying validation error');
        return false;
      }
      
      console.log(`🔄 PlaylistResolution - Retry ${failureCount + 1}/3 in ${Math.pow(2, failureCount) * 1000}ms`);
      return true;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * Math.pow(2, attemptIndex), 30000),
  });

  return {
    playlists: queryResult.data || [],
    isLoading: queryResult.isLoading,
    error: queryResult.error?.message || null,
    refetch: queryResult.refetch
  };
}

/**
 * Simplified hook that returns just the playlist count for a track
 */
export function usePlaylistCount(
  trackPubkey: string,
  trackIdentifier: string,
  options?: { enabled?: boolean }
): { count: number; isLoading: boolean } {
  const { playlists, isLoading } = usePlaylistResolution({
    trackPubkey,
    trackIdentifier,
    limit: 100, // Higher limit for accurate count
    enabled: options?.enabled
  });

  return {
    count: playlists.length,
    isLoading
  };
}