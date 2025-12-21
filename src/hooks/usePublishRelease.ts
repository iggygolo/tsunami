import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useUploadFile } from '@/hooks/useUploadFile';
import type { ReleaseFormData, TrackFormData } from '@/types/podcast';
import { PODCAST_KINDS, isArtist } from '@/lib/podcastConfig';

// Helper function to infer audio type from URL
function inferAudioType(urlString: string, fileType?: string): string {
  if (fileType && fileType.startsWith('audio/')) {
    return fileType;
  }

  try {
    const url = new URL(urlString);
    const pathname = url.pathname.toLowerCase();
    if (pathname.endsWith('.mp3')) {
      return 'audio/mpeg';
    } else if (pathname.endsWith('.wav')) {
      return 'audio/wav';
    } else if (pathname.endsWith('.m4a')) {
      return 'audio/mp4';
    } else if (pathname.endsWith('.ogg')) {
      return 'audio/ogg';
    } else if (pathname.endsWith('.flac')) {
      return 'audio/flac';
    }
  } catch {
    // Invalid URL, continue with default
  }
  
  return 'audio/mpeg'; // Default fallback
}

/**
 * Process a single track, uploading audio if needed
 */
async function processTrack(
  track: TrackFormData,
  uploadFile: (file: File) => Promise<Array<string[]>>
): Promise<TrackFormData> {
  let audioUrl = track.audioUrl;
  let audioType = track.audioType;

  if (track.audioFile) {
    try {
      const audioTags = await uploadFile(track.audioFile);
      // audioTags is an array of NIP-94 compatible tags
      const audioTag = audioTags.find((tag: string[]) => tag[0] === 'url') || audioTags[0];
      audioUrl = audioTag[1]; // Get the URL from the tag
      audioType = track.audioFile.type;
    } catch (error) {
      throw new Error(`Failed to upload audio file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  if (!audioUrl) {
    throw new Error('Audio URL or file is required for each track');
  }

  // Infer type from URL if not provided
  if (audioUrl && !audioType) {
    audioType = inferAudioType(audioUrl);
  }

  return {
    title: track.title,
    audioUrl,
    audioType: audioType || 'audio/mpeg',
    duration: track.duration,
    explicit: track.explicit || false,
  };
}

/**
 * Hook for publishing podcast releases (artist only)
 */
export function usePublishRelease() {
  const { user } = useCurrentUser();
  const { mutateAsync: createEvent } = useNostrPublish();
  const { mutateAsync: uploadFile } = useUploadFile();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (releaseData: ReleaseFormData): Promise<string> => {
      // Verify user is logged in and is the artist
      if (!user) {
        throw new Error('You must be logged in to publish releases');
      }

      if (!isArtist(user.pubkey)) {
        throw new Error('Only the music artist can publish releases');
      }

      // Validate that we have at least one track
      if (!releaseData.tracks || releaseData.tracks.length === 0) {
        throw new Error('At least one track is required');
      }

      // Process all tracks (upload audio files if needed)
      const processedTracks = await Promise.all(
        releaseData.tracks.map(track => processTrack(track, uploadFile))
      );

      // Upload image file if provided
      let imageUrl = releaseData.imageUrl;
      if (releaseData.imageFile) {
        try {
          const imageTags = await uploadFile(releaseData.imageFile);
          imageUrl = imageTags[0][1]; // First tag contains the URL
        } catch (error) {
          throw new Error(`Failed to upload image file: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Generate a unique identifier for this addressable release
      const releaseIdentifier = `release-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Build tags for addressable podcast release (kind 30054)
      const tags: Array<[string, ...string[]]> = [
        ['d', releaseIdentifier], // Addressable event identifier
        ['title', releaseData.title], // Release title
        ['pubdate', new Date().toUTCString()], // RFC2822 format - set once when first published
        ['alt', `Music release: ${releaseData.title}`] // NIP-31 alt tag
      ];

      // Add optional tags
      if (releaseData.description) {
        tags.push(['description', releaseData.description]);
      }

      if (imageUrl) {
        tags.push(['image', imageUrl]);
      }

      // Add topic tags
      releaseData.tags.forEach(tag => {
        if (tag.trim()) {
          tags.push(['t', tag.trim().toLowerCase()]);
        }
      });

      // Create and publish the event
      const event = await createEvent({
        kind: PODCAST_KINDS.RELEASE,
        content: JSON.stringify(processedTracks), // Tracklist as JSON string
        tags
      });

      // Invalidate related queries to refresh the UI
      await queryClient.invalidateQueries({ queryKey: ['releases'] });
      await queryClient.invalidateQueries({ queryKey: ['podcast-stats'] });
      await queryClient.invalidateQueries({ queryKey: ['rss-feed-generator'] });

      return event.id;
    },

    onError: (error) => {
      console.error('Failed to publish release:', error);
    }
  });
}

/**
 * Hook for updating/editing existing releases
 */
export function useUpdateRelease() {
  const { user } = useCurrentUser();
  const { mutateAsync: createEvent } = useNostrPublish();
  const { mutateAsync: uploadFile } = useUploadFile();
  const { nostr } = useNostr();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      releaseId,
      releaseIdentifier,
      releaseData
    }: {
      releaseId: string;
      releaseIdentifier: string;
      releaseData: ReleaseFormData;
    }): Promise<string> => {
      // Verify user is logged in and is the artist
      if (!user) {
        throw new Error('You must be logged in to update releases');
      }

      if (!isArtist(user.pubkey)) {
        throw new Error('Only the music artist can update releases');
      }

      // Validate that we have at least one track
      if (!releaseData.tracks || releaseData.tracks.length === 0) {
        throw new Error('At least one track is required');
      }

      // Process all tracks
      const processedTracks = await Promise.all(
        releaseData.tracks.map(track => processTrack(track, uploadFile))
      );

      let imageUrl = releaseData.imageUrl;
      if (releaseData.imageFile) {
        try {
          const imageTags = await uploadFile(releaseData.imageFile);
          imageUrl = imageTags[0][1];
        } catch (error) {
          throw new Error(`Failed to upload image file: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Fetch the original release to preserve its publication date
      let originalPubdate: string | undefined;
      try {
        const originalEvents = await nostr.query([{
          ids: [releaseId]
        }], { signal: AbortSignal.timeout(5000) });

        const originalEvent = originalEvents[0];
        if (originalEvent) {
          originalPubdate = originalEvent.tags.find(([name]) => name === 'pubdate')?.[1];
        }
      } catch (error) {
        console.warn('Could not fetch original release for pubdate preservation:', error);
      }

      // Fallback to current time if no original pubdate found
      const pubdate = originalPubdate || new Date().toUTCString();

      // Build tags for updated addressable podcast release (kind 30054)
      const tags: Array<[string, ...string[]]> = [
        ['d', releaseIdentifier], // Preserve the original addressable event identifier
        ['title', releaseData.title], // Release title
        ['pubdate', pubdate], // Preserve original publication date
        ['alt', `Updated podcast release: ${releaseData.title}`], // NIP-31 alt tag
        ['edit', releaseId] // Reference to the original event being edited
      ];

      // Add optional tags
      if (releaseData.description) {
        tags.push(['description', releaseData.description]);
      }

      if (imageUrl) {
        tags.push(['image', imageUrl]);
      }

      // Add topic tags
      releaseData.tags.forEach(tag => {
        if (tag.trim()) {
          tags.push(['t', tag.trim().toLowerCase()]);
        }
      });

      // Create the updated event
      const event = await createEvent({
        kind: PODCAST_KINDS.RELEASE,
        content: JSON.stringify(processedTracks),
        tags
      });

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['releases'] });
      queryClient.invalidateQueries({ queryKey: ['podcast-release', releaseId] });
      queryClient.invalidateQueries({ queryKey: ['podcast-stats'] });
      queryClient.invalidateQueries({ queryKey: ['rss-feed-generator'] });

      return event.id;
    },
    onSuccess: (data) => {
      console.log('release update successful:', data);
    },
    onError: (error) => {
      console.error('release update failed:', error);
    },
    onSettled: (data, error) => {
      console.log('release update settled:', { data, error });
    }
  });
}

/**
 * Hook for deleting releases (creates deletion event)
 */
export function useDeleteRelease() {
  const { user } = useCurrentUser();
  const { mutateAsync: createEvent } = useNostrPublish();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (releaseId: string): Promise<string> => {
      if (!user) {
        throw new Error('You must be logged in to delete releases');
      }

      if (!isArtist(user.pubkey)) {
        throw new Error('Only the music artist can delete releases');
      }

      // Create a deletion event (NIP-09)
      const event = await createEvent({
        kind: 5, // Deletion event
        content: 'Deleted release',
        tags: [
          ['e', releaseId]
        ]
      });

      // Invalidate queries
      await queryClient.invalidateQueries({ queryKey: ['releases'] });
      await queryClient.invalidateQueries({ queryKey: ['podcast-release', releaseId] });
      await queryClient.invalidateQueries({ queryKey: ['podcast-stats'] });
      await queryClient.invalidateQueries({ queryKey: ['rss-feed-generator'] });

      return event.id;
    }
  });
}
