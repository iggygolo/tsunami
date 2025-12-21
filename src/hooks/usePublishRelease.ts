import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useUploadFile } from '@/hooks/useUploadFile';
import type { ReleaseFormData } from '@/types/podcast';
import { PODCAST_KINDS, isArtist } from '@/lib/podcastConfig';

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

      // Upload audio file if provided
      let audioUrl = releaseData.audioUrl;
      let audioType = releaseData.audioType;

      if (releaseData.audioFile) {
        try {
          const audioTags = await uploadFile(releaseData.audioFile);
          audioUrl = audioTags[0][1]; // First tag contains the URL
          audioType = releaseData.audioFile.type;
        } catch (error) {
          throw new Error(`Failed to upload audio file: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      if (!audioUrl) {
        throw new Error('Audio URL or file is required');
      }

      // If we have a URL but no type, try to infer from file extension
      if (audioUrl && !audioType) {
        try {
          const url = new URL(audioUrl);
          const pathname = url.pathname.toLowerCase();
          if (pathname.endsWith('.mp3')) {
            audioType = 'audio/mpeg';
          } else if (pathname.endsWith('.wav')) {
            audioType = 'audio/wav';
          } else if (pathname.endsWith('.m4a')) {
            audioType = 'audio/mp4';
          } else if (pathname.endsWith('.ogg')) {
            audioType = 'audio/ogg';
          } else {
            audioType = 'audio/mpeg'; // Default fallback
          }
        } catch {
          audioType = 'audio/mpeg';
        }
      }

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

      // Upload video file if provided
      let videoUrl = releaseData.videoUrl;
      let videoType = releaseData.videoType;
      if (releaseData.videoFile) {
        try {
          const videoTags = await uploadFile(releaseData.videoFile);
          videoUrl = videoTags[0][1];
          videoType = releaseData.videoFile.type;
        } catch (error) {
          throw new Error(`Failed to upload video file: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Upload transcript file if provided
      let transcriptUrl = releaseData.transcriptUrl;
      if (releaseData.transcriptFile) {
        try {
          const transcriptTags = await uploadFile(releaseData.transcriptFile);
          transcriptUrl = transcriptTags[0][1];
        } catch (error) {
          throw new Error(`Failed to upload transcript file: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Upload chapters file if provided
      let chaptersUrl = releaseData.chaptersUrl;
      if (releaseData.chaptersFile) {
        try {
          const chaptersTags = await uploadFile(releaseData.chaptersFile);
          chaptersUrl = chaptersTags[0][1];
        } catch (error) {
          throw new Error(`Failed to upload chapters file: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Generate a unique identifier for this addressable release
      const releaseIdentifier = `release-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Build tags for addressable podcast release (kind 30054)
      const tags: Array<[string, ...string[]]> = [
        ['d', releaseIdentifier], // Addressable event identifier
        ['title', releaseData.title], // release title
        ['audio', audioUrl, audioType || 'audio/mpeg'], // Audio URL with media type
        ['pubdate', new Date().toUTCString()], // RFC2822 format - set once when first published
        ['alt', `Podcast release: ${releaseData.title}`] // NIP-31 alt tag
      ];

      // Add optional tags per NIP-54
      if (releaseData.description) {
        tags.push(['description', releaseData.description]);
      }

      if (imageUrl) {
        tags.push(['image', imageUrl]);
      }

      // Add video enclosure if provided
      if (videoUrl) {
        tags.push(['video', videoUrl, videoType || 'video/mp4']);
      }

      // Add duration if provided
      if (releaseData.duration && releaseData.duration > 0) {
        tags.push(['duration', releaseData.duration.toString()]);
      }

      // Add transcript URL if provided
      if (transcriptUrl) {
        tags.push(['transcript', transcriptUrl]);
      }

      // Add chapters URL if provided
      if (chaptersUrl) {
        tags.push(['chapters', chaptersUrl]);
      }

      // Add topic tags
      releaseData.tags.forEach(tag => {
        if (tag.trim()) {
          tags.push(['t', tag.trim().toLowerCase()]);
        }
      });

      // Create and publish the event
      const event = await createEvent({
        kind: PODCAST_KINDS.EPISODE,
        content: releaseData.content || '',
        tags
      });

      // Invalidate related queries to refresh the UI
      await queryClient.invalidateQueries({ queryKey: ['podcast-releases'] });
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

      // Upload new files if provided
      let audioUrl = releaseData.audioUrl;
      let audioType = releaseData.audioType;

      if (releaseData.audioFile) {
        try {
          const audioTags = await uploadFile(releaseData.audioFile);
          audioUrl = audioTags[0][1];
          audioType = releaseData.audioFile.type;
        } catch (error) {
          throw new Error(`Failed to upload audio file: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      if (!audioUrl) {
        throw new Error('Audio URL or file is required');
      }

      // If we have a URL but no type, try to infer from file extension
      if (audioUrl && !audioType) {
        try {
          const url = new URL(audioUrl);
          const pathname = url.pathname.toLowerCase();
          if (pathname.endsWith('.mp3')) {
            audioType = 'audio/mpeg';
          } else if (pathname.endsWith('.wav')) {
            audioType = 'audio/wav';
          } else if (pathname.endsWith('.m4a')) {
            audioType = 'audio/mp4';
          } else if (pathname.endsWith('.ogg')) {
            audioType = 'audio/ogg';
          } else {
            audioType = 'audio/mpeg'; // Default fallback
          }
        } catch {
          audioType = 'audio/mpeg';
        }
      }

      let imageUrl = releaseData.imageUrl;
      if (releaseData.imageFile) {
        try {
          const imageTags = await uploadFile(releaseData.imageFile);
          imageUrl = imageTags[0][1];
        } catch (error) {
          throw new Error(`Failed to upload image file: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Upload video file if provided
      let videoUrl = releaseData.videoUrl;
      let videoType = releaseData.videoType;
      if (releaseData.videoFile) {
        try {
          const videoTags = await uploadFile(releaseData.videoFile);
          videoUrl = videoTags[0][1];
          videoType = releaseData.videoFile.type;
        } catch (error) {
          throw new Error(`Failed to upload video file: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Upload transcript file if provided
      let transcriptUrl = releaseData.transcriptUrl;
      if (releaseData.transcriptFile) {
        try {
          const transcriptTags = await uploadFile(releaseData.transcriptFile);
          transcriptUrl = transcriptTags[0][1];
        } catch (error) {
          throw new Error(`Failed to upload transcript file: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Upload chapters file if provided
      let chaptersUrl = releaseData.chaptersUrl;
      if (releaseData.chaptersFile) {
        try {
          const chaptersTags = await uploadFile(releaseData.chaptersFile);
          chaptersUrl = chaptersTags[0][1];
        } catch (error) {
          throw new Error(`Failed to upload chapters file: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Use the provided release identifier to preserve the same addressable event
      // This ensures comments and other references remain linked to the same release

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

      // Fallback to current time if no original pubdate found (for releases created before this feature)
      const pubdate = originalPubdate || new Date().toUTCString();

      // Build tags for updated addressable podcast release (kind 30054)
      const tags: Array<[string, ...string[]]> = [
        ['d', releaseIdentifier], // Preserve the original addressable event identifier
        ['title', releaseData.title], // release title
        ['audio', audioUrl, audioType || 'audio/mpeg'], // Audio URL with media type
        ['pubdate', pubdate], // Preserve original publication date
        ['alt', `Updated podcast release: ${releaseData.title}`], // NIP-31 alt tag
        ['edit', releaseId] // Reference to the original event being edited
      ];

      // Add optional tags per NIP-54
      if (releaseData.description) {
        tags.push(['description', releaseData.description]);
      }

      if (imageUrl) {
        tags.push(['image', imageUrl]);
      }

      // Add video enclosure if provided
      if (videoUrl) {
        tags.push(['video', videoUrl, videoType || 'video/mp4']);
      }

      // Add duration if provided
      if (releaseData.duration && releaseData.duration > 0) {
        tags.push(['duration', releaseData.duration.toString()]);
      }

      // Add transcript URL if provided
      if (transcriptUrl) {
        tags.push(['transcript', transcriptUrl]);
      }

      // Add chapters URL if provided
      if (chaptersUrl) {
        tags.push(['chapters', chaptersUrl]);
      }

      // Add topic tags
      releaseData.tags.forEach(tag => {
        if (tag.trim()) {
          tags.push(['t', tag.trim().toLowerCase()]);
        }
      });

      // Create the updated event
      const event = await createEvent({
        kind: PODCAST_KINDS.EPISODE,
        content: releaseData.content || '',
        tags
      });

      // Invalidate queries (don't await - let them happen in background)
      queryClient.invalidateQueries({ queryKey: ['podcast-releases'] });
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
        content: 'Deleted podcast release',
        tags: [
          ['e', releaseId]
        ]
      });

      // Invalidate queries
      await queryClient.invalidateQueries({ queryKey: ['podcast-releases'] });
      await queryClient.invalidateQueries({ queryKey: ['podcast-release', releaseId] });
      await queryClient.invalidateQueries({ queryKey: ['podcast-stats'] });
      await queryClient.invalidateQueries({ queryKey: ['rss-feed-generator'] });

      return event.id;
    }
  });
}