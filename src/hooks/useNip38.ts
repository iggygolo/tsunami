
import { useEffect, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { usePodcastMetadata } from '@/hooks/usePodcastMetadata';
import { encodeEventIdAsNevent } from '@/lib/nip19Utils';
import type { PodcastRelease } from '@/types/podcast';

/**
 * Hook to update now playing status using NIP-38 User Status events
 * Publishes podcast release status updates that appear next to usernames
 */
/**
 * Get the current website URL for the nevent link
 */
function getCurrentSiteUrl(): string {
  // Use current browser origin for the nevent link
  if (typeof window !== 'undefined' && window.location) {
    return window.location.origin;
  }
  
  // Fallback for SSR or non-browser environments
  return 'https://tsunami.com';
}

export function useUpdateNowPlaying() {
  const { mutate: createEvent } = useNostrPublish();

  return useMutation({
    mutationFn: async ({ 
      release, 
      podcastName
    }: {
      release: PodcastRelease;
      podcastName?: string;
    }) => {
      // Use provided podcast name or fall back to extracting from release tags
      const finalPodcastName = podcastName || 
        release.tags.find(tag => tag.startsWith('podcast:'))?.replace('podcast:', '') || 
        'Podcast';
      
      // Format content as "Release Title - Podcast Name"
      const content = `${release.title} - ${finalPodcastName}`;
      
      // Calculate expiration based on release duration (if available)
      // Default to 2 hours if no duration specified
      const durationSeconds = release.duration || 7200; // 2 hours default
      const expiration = Math.floor(Date.now() / 1000) + durationSeconds;

      // Generate nevent URL for the release
      const nevent = encodeEventIdAsNevent(release.eventId, release.artistPubkey);
      const releaseUrl = `${getCurrentSiteUrl()}/${nevent}`;

      createEvent({
        kind: 30315, // NIP-38 User Status
        content,
        tags: [
          ['d', 'music'], // Status type identifier - using 'music' for compatibility with existing clients
          ['r', releaseUrl], // Reference link to the release using nevent format
          ['expiration', expiration.toString()], // Auto-clear when release should be finished
          ['alt', `Currently listening to podcast release: ${content}`], // NIP-31 alt tag for accessibility
        ],
      });
    },
  });
}

/**
 * Hook to clear the now playing status
 * Publishes an empty status to clear the current podcast status
 */
export function useClearNowPlaying() {
  const { mutate: createEvent } = useNostrPublish();

  return useMutation({
    mutationFn: async () => {
      createEvent({
        kind: 30315, // NIP-38 User Status
        content: '', // Empty content clears the status
        tags: [
          ['d', 'music'], // Status type identifier - using 'music' for compatibility with existing clients
          ['alt', 'Cleared podcast listening status'], // NIP-31 alt tag
        ],
      });
    },
  });
}

/**
 * Hook that automatically manages NIP-38 status updates based on audio player state
 * Only publishes once per release to avoid spam, and gets proper podcast name from metadata
 */
export function useNip38() {
  const { state } = useAudioPlayer();
  const { user } = useCurrentUser();
  const { data: podcastMetadata } = usePodcastMetadata();
  const { mutateAsync: updateNowPlaying } = useUpdateNowPlaying();
  const { mutateAsync: clearNowPlaying } = useClearNowPlaying();
  
  // Track the last published release to avoid spam
  const lastPublishedreleaseRef = useRef<string | null>(null);
  const lastPlayingStateRef = useRef<boolean>(false);
  const hasStatusClearedRef = useRef<boolean>(false);

  const { currentRelease, isPlaying } = state;

  useEffect(() => {
    if (!user) return;

    const releaseId = currentRelease?.eventId;
    const wasPlaying = lastPlayingStateRef.current;
    
    // Update the playing state ref
    lastPlayingStateRef.current = isPlaying;

    if (isPlaying && currentRelease) {
      // Reset clear status flag when starting to play
      hasStatusClearedRef.current = false;
      
      // Only publish if this is a new release or we weren't playing before
      if (lastPublishedreleaseRef.current !== releaseId || !wasPlaying) {
        const podcastName = podcastMetadata?.artist || 'Unknown Podcast';
        
        updateNowPlaying({
          release: currentRelease,
          podcastName
          // websiteUrl is now auto-detected, no need to hardcode
        }).then(() => {
          // Mark this release as published
          lastPublishedreleaseRef.current = releaseId || null;
          console.log(`Published NIP-38 status for: ${currentRelease.title} - ${podcastName}`);
        }).catch(error => {
          console.error('Failed to update now playing status:', error);
        });
      }
    } else if (wasPlaying && !isPlaying && !hasStatusClearedRef.current && lastPublishedreleaseRef.current) {
      // Only clear once when transitioning from playing to not playing
      // And only if we haven't already cleared for this session
      hasStatusClearedRef.current = true;
      
      clearNowPlaying().then(() => {
        console.log('Cleared NIP-38 status after playback ended');
      }).catch(error => {
        console.error('Failed to clear now playing status:', error);
      });
    }
  }, [isPlaying, currentRelease?.eventId, currentRelease, user, podcastMetadata?.artist, updateNowPlaying, clearNowPlaying]);

  // Clear status when component unmounts 
  useEffect(() => {
    return () => {
      // Clear on unmount only if we published something and haven't already cleared
      if (user && lastPublishedreleaseRef.current && !hasStatusClearedRef.current) {
        clearNowPlaying().catch(error => {
          console.error('Failed to clear now playing status on unmount:', error);
        });
      }
    };
  }, [user, clearNowPlaying]);

  // Reset tracking when release changes
  useEffect(() => {
    if (currentRelease?.eventId && lastPublishedreleaseRef.current && 
        lastPublishedreleaseRef.current !== currentRelease.eventId) {
      // release changed, reset tracking so new release can be published
      lastPublishedreleaseRef.current = null;
      hasStatusClearedRef.current = false;
    }
  }, [currentRelease?.eventId]);
}
