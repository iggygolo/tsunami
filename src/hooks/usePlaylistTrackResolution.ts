import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import { PODCAST_KINDS } from '@/lib/podcastConfig';
import { eventToMusicTrack } from '@/hooks/useMusicTracks';
import type { TrackReference, MusicTrackData } from '@/types/podcast';
import type { NostrEvent } from '@nostrify/nostrify';

/**
 * Resolved track data combining reference info with actual track data
 */
export interface ResolvedTrack {
  reference: TrackReference;
  trackData?: MusicTrackData;
  isLoading: boolean;
  error?: string;
}

/**
 * Hook to resolve track references into actual track data
 * This fetches the actual music track events for playlist track references
 */
export function usePlaylistTrackResolution(trackReferences: TrackReference[]) {
  const { nostr } = useNostr();
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ['playlist-track-resolution', JSON.stringify(trackReferences)],
    queryFn: async (context) => {
      if (trackReferences.length === 0) return [];

      const signal = AbortSignal.any([context.signal, AbortSignal.timeout(10000)]);
      const resolvedTracks: ResolvedTrack[] = [];

      // Group references by pubkey for more efficient querying
      const referencesByPubkey = new Map<string, TrackReference[]>();
      for (const ref of trackReferences) {
        if (!referencesByPubkey.has(ref.pubkey)) {
          referencesByPubkey.set(ref.pubkey, []);
        }
        referencesByPubkey.get(ref.pubkey)!.push(ref);
      }

      // Query tracks for each pubkey
      for (const [pubkey, refs] of referencesByPubkey) {
        try {
          const identifiers = refs.map(ref => ref.identifier);
          
          // Query for all tracks from this pubkey with the specified identifiers
          const events = await nostr.query([{
            kinds: [PODCAST_KINDS.MUSIC_TRACK],
            authors: [pubkey],
            '#d': identifiers,
            limit: identifiers.length * 2 // Allow for multiple versions
          }], { signal });

          // Group events by identifier and get the latest version of each
          const eventsByIdentifier = new Map<string, NostrEvent>();
          for (const event of events) {
            const identifier = event.tags.find(([key]) => key === 'd')?.[1];
            if (!identifier) continue;

            const existing = eventsByIdentifier.get(identifier);
            if (!existing || event.created_at > existing.created_at) {
              eventsByIdentifier.set(identifier, event);
            }
          }

          // Create resolved tracks for this pubkey
          for (const ref of refs) {
            const event = eventsByIdentifier.get(ref.identifier);
            
            if (event) {
              try {
                const trackData = eventToMusicTrack(event);
                resolvedTracks.push({
                  reference: ref,
                  trackData,
                  isLoading: false
                });
              } catch (error) {
                resolvedTracks.push({
                  reference: ref,
                  isLoading: false,
                  error: `Failed to parse track data: ${error instanceof Error ? error.message : 'Unknown error'}`
                });
              }
            } else {
              resolvedTracks.push({
                reference: ref,
                isLoading: false,
                error: 'Track not found'
              });
            }
          }
        } catch (error) {
          // If querying failed for this pubkey, mark all refs as errored
          for (const ref of refs) {
            resolvedTracks.push({
              reference: ref,
              isLoading: false,
              error: `Failed to fetch track: ${error instanceof Error ? error.message : 'Unknown error'}`
            });
          }
        }
      }

      // Sort resolved tracks to match the original order
      const orderedTracks: ResolvedTrack[] = [];
      for (const originalRef of trackReferences) {
        const resolved = resolvedTracks.find(rt => 
          rt.reference.pubkey === originalRef.pubkey && 
          rt.reference.identifier === originalRef.identifier
        );
        
        if (resolved) {
          orderedTracks.push(resolved);
        } else {
          // Fallback if something went wrong
          orderedTracks.push({
            reference: originalRef,
            isLoading: false,
            error: 'Failed to resolve track'
          });
        }
      }

      return orderedTracks;
    },
    enabled: trackReferences.length > 0,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
    // Check cache first - if we have cached resolved tracks data, use it immediately
    initialData: () => {
      if (trackReferences.length > 0) {
        const cachedTracks = queryClient.getQueryData<ResolvedTrack[]>(['playlist-track-resolution', JSON.stringify(trackReferences)]);
        if (cachedTracks) {
          console.log('usePlaylistTrackResolution - Using cached resolved tracks data');
          return cachedTracks;
        }
      }
      return undefined;
    },
  });
}

/**
 * Hook to resolve a single track reference
 */
export function useTrackResolution(trackReference: TrackReference | null) {
  const { data: resolvedTracks } = usePlaylistTrackResolution(
    trackReference ? [trackReference] : []
  );

  return {
    resolvedTrack: resolvedTracks?.[0] || null,
    isLoading: resolvedTracks?.[0]?.isLoading || false,
    error: resolvedTracks?.[0]?.error
  };
}

/**
 * Hook to get playlist statistics with resolved track data
 */
export function usePlaylistWithResolvedTracks(trackReferences: TrackReference[]) {
  const { data: resolvedTracks, isLoading, error } = usePlaylistTrackResolution(trackReferences);

  const stats = {
    totalTracks: trackReferences.length,
    resolvedTracks: resolvedTracks?.filter(rt => rt.trackData).length || 0,
    missingTracks: resolvedTracks?.filter(rt => rt.error).length || 0,
    totalDuration: resolvedTracks?.reduce((total, rt) => {
      return total + (rt.trackData?.duration || 0);
    }, 0) || 0,
    uniqueArtists: new Set(
      resolvedTracks?.map(rt => rt.trackData?.artist).filter(Boolean)
    ).size || 0
  };

  return {
    resolvedTracks: resolvedTracks || [],
    isLoading,
    error,
    stats
  };
}

/**
 * Utility function to format playlist duration
 */
export function formatPlaylistDuration(totalSeconds: number): string {
  if (totalSeconds === 0) return '0:00';
  
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  } else {
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
}

/**
 * Utility function to get playlist summary text
 */
export function getPlaylistSummary(stats: {
  totalTracks: number;
  resolvedTracks: number;
  missingTracks: number;
  totalDuration: number;
  uniqueArtists: number;
}): string {
  const parts: string[] = [];
  
  if (stats.totalTracks > 0) {
    parts.push(`${stats.totalTracks} track${stats.totalTracks === 1 ? '' : 's'}`);
  }
  
  if (stats.uniqueArtists > 0) {
    parts.push(`${stats.uniqueArtists} artist${stats.uniqueArtists === 1 ? '' : 's'}`);
  }
  
  if (stats.totalDuration > 0) {
    parts.push(formatPlaylistDuration(stats.totalDuration));
  }
  
  if (stats.missingTracks > 0) {
    parts.push(`${stats.missingTracks} missing`);
  }
  
  return parts.join(' • ');
}