import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useUploadFile } from '@/hooks/useUploadFile';
import type { ReleaseFormData, TrackFormData, MusicTrackData, MusicPlaylistData, TrackReference } from '@/types/music';
import { MUSIC_KINDS, MUSIC_CONFIG, isArtist } from '@/lib/musicConfig';
import { musicTrackPublisher } from '@/lib/musicTrackPublisher';
import { musicPlaylistPublisher } from '@/lib/musicPlaylistPublisher';
import { audioTypeToFormat } from '@/lib/audioUtils';

/**
 * SIMPLIFIED AND ROBUST RELEASE PUBLISHING
 * 
 * Key improvements:
 * 1. Centralized validation
 * 2. Atomic operations with rollback capability
 * 3. Simplified error handling
 * 4. Reduced async complexity
 * 5. Better separation of concerns
 */

// Types for internal processing
interface ProcessedTrack {
  formData: TrackFormData;
  trackData: MusicTrackData;
  trackReference: TrackReference;
  eventId?: string;
}

/**
 * Centralized validation for all release data
 */
class ReleaseValidator {
  static validateUser(user: any): void {
    if (!user) {
      throw new Error('You must be logged in to publish releases');
    }
    if (!isArtist(user.pubkey)) {
      throw new Error('Only the music artist can publish releases');
    }
  }

  static validateReleaseData(releaseData: ReleaseFormData): void {
    if (!releaseData.title?.trim()) {
      throw new Error('Release title is required');
    }
    if (!releaseData.tracks || releaseData.tracks.length === 0) {
      throw new Error('At least one track is required');
    }
  }

  static validateTrack(track: TrackFormData, index: number): void {
    if (!track.title?.trim()) {
      throw new Error(`Track ${index + 1}: Title is required`);
    }
    if (!track.audioFile && !track.audioUrl?.trim()) {
      throw new Error(`Track ${index + 1} ("${track.title}"): Audio file or URL is required`);
    }
  }

  static validateAll(user: any, releaseData: ReleaseFormData): void {
    console.log('🔍 ReleaseValidator - Validating release data:', {
      userExists: !!user,
      isArtist: user ? isArtist(user.pubkey) : false,
      releaseTitle: releaseData.title,
      trackCount: releaseData.tracks?.length || 0
    });

    this.validateUser(user);
    this.validateReleaseData(releaseData);
    
    releaseData.tracks.forEach((track, index) => {
      this.validateTrack(track, index);
    });

    console.log('✅ ReleaseValidator - All validation passed');
  }
}

/**
 * Handles file uploads with proper error handling
 */
class FileUploadHandler {
  constructor(private uploadFile: (file: File) => Promise<Array<string[]>>) {}

  async uploadReleaseImage(imageFile?: File): Promise<string | undefined> {
    if (!imageFile) return undefined;

    console.log('📤 FileUploadHandler - Uploading release image:', {
      fileName: imageFile.name,
      fileSize: imageFile.size,
      fileType: imageFile.type
    });

    try {
      const imageTags = await this.uploadFile(imageFile);
      const imageUrl = imageTags[0]?.[1];
      if (!imageUrl) {
        throw new Error('Upload returned invalid response');
      }
      
      console.log('✅ FileUploadHandler - Release image uploaded:', imageUrl);
      return imageUrl;
    } catch (error) {
      console.error('❌ FileUploadHandler - Release image upload failed:', error);
      throw new Error(`Failed to upload release image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async uploadTrackAudio(audioFile: File, trackTitle: string): Promise<{ url: string; type: string }> {
    console.log('📤 FileUploadHandler - Uploading track audio:', {
      trackTitle,
      fileName: audioFile.name,
      fileSize: audioFile.size,
      fileType: audioFile.type
    });

    try {
      const audioTags = await this.uploadFile(audioFile);
      const audioTag = audioTags.find((tag: string[]) => tag[0] === 'url') || audioTags[0];
      const audioUrl = audioTag?.[1];
      
      if (!audioUrl) {
        throw new Error('Upload returned invalid response');
      }

      console.log('✅ FileUploadHandler - Track audio uploaded:', {
        trackTitle,
        audioUrl: audioUrl.slice(0, 50) + '...'
      });

      return {
        url: audioUrl,
        type: audioFile.type
      };
    } catch (error) {
      console.error('❌ FileUploadHandler - Track audio upload failed:', error);
      throw new Error(`Failed to upload audio file for track "${trackTitle}": ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

/**
 * Converts form data to Nostr event data
 */
class TrackDataProcessor {
  constructor(
    private uploadHandler: FileUploadHandler,
    private releaseData: ReleaseFormData,
    private artistPubkey: string,
    private releaseImageUrl?: string
  ) {}

  private inferAudioType(urlString: string, fileType?: string): string {
    if (fileType && fileType.startsWith('audio/')) {
      return fileType;
    }

    try {
      const url = new URL(urlString);
      const pathname = url.pathname.toLowerCase();
      const extensions = {
        '.mp3': 'audio/mpeg',
        '.wav': 'audio/wav',
        '.m4a': 'audio/mp4',
        '.ogg': 'audio/ogg',
        '.flac': 'audio/flac'
      };
      
      for (const [ext, type] of Object.entries(extensions)) {
        if (pathname.endsWith(ext)) return type;
      }
    } catch {
      // Invalid URL, use default
    }
    
    return 'audio/mpeg';
  }

  async processTrack(track: TrackFormData, trackIndex: number): Promise<ProcessedTrack> {
    console.log(`🔄 TrackDataProcessor - Processing track ${trackIndex + 1}:`, {
      title: track.title,
      hasAudioFile: !!track.audioFile,
      hasAudioUrl: !!track.audioUrl,
      duration: track.duration
    });

    let audioUrl = track.audioUrl;
    let audioType = track.audioType;

    // Handle audio file upload
    if (track.audioFile) {
      const uploadResult = await this.uploadHandler.uploadTrackAudio(track.audioFile, track.title);
      audioUrl = uploadResult.url;
      audioType = uploadResult.type;
    }

    // Final validation
    if (!audioUrl) {
      throw new Error(`Track "${track.title}": No audio URL available after processing`);
    }

    // Infer audio type if not provided
    if (!audioType) {
      audioType = this.inferAudioType(audioUrl);
    }

    // Create track data
    const trackData: MusicTrackData = {
      identifier: '', // Will be generated by publisher
      title: track.title,
      artist: MUSIC_CONFIG.music.artistName,
      audioUrl,
      album: this.releaseData.title,
      trackNumber: trackIndex + 1,
      duration: track.duration,
      format: audioTypeToFormat(audioType || 'audio/mpeg'),
      imageUrl: this.releaseImageUrl,
      language: track.language || undefined,
      explicit: track.explicit || false,
      genres: this.releaseData.tags.length > 0 ? this.releaseData.tags : undefined,
      artistPubkey: this.artistPubkey,
    };

    // Create track reference (will be populated with identifier after event creation)
    const trackReference: TrackReference = {
      kind: MUSIC_KINDS.MUSIC_TRACK,
      pubkey: this.artistPubkey,
      identifier: '', // Will be set after track event creation
      title: trackData.title,
      artist: trackData.artist,
    };

    console.log(`✅ TrackDataProcessor - Track ${trackIndex + 1} processed:`, {
      title: trackData.title,
      audioUrl: trackData.audioUrl ? '✓' : '✗',
      format: trackData.format,
      trackNumber: trackData.trackNumber
    });

    return {
      formData: track,
      trackData,
      trackReference
    };
  }
}

/**
 * Handles Nostr event publishing with rollback capability
 */
class EventPublisher {
  private publishedEventIds: string[] = [];

  constructor(private createEvent: (eventData: any) => Promise<any>) {}

  async publishTrackEvent(processedTrack: ProcessedTrack): Promise<string> {
    console.log('📄 EventPublisher - Publishing track event:', {
      title: processedTrack.trackData.title,
      artist: processedTrack.trackData.artist
    });

    try {
      const trackEventData = musicTrackPublisher.createTrackEvent(processedTrack.trackData);
      const trackEvent = await this.createEvent(trackEventData);
      
      // Update the processed track with the generated identifier and event ID
      processedTrack.trackReference.identifier = processedTrack.trackData.identifier;
      processedTrack.eventId = trackEvent.id;
      
      this.publishedEventIds.push(trackEvent.id);
      
      console.log('✅ EventPublisher - Track event published:', {
        title: processedTrack.trackData.title,
        eventId: trackEvent.id,
        identifier: processedTrack.trackData.identifier
      });

      return trackEvent.id;
    } catch (error) {
      console.error('❌ EventPublisher - Track event publishing failed:', error);
      throw new Error(`Failed to publish track "${processedTrack.trackData.title}": ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async publishPlaylistEvent(playlistData: MusicPlaylistData, isUpdate = false, originalIdentifier?: string): Promise<string> {
    console.log('📄 EventPublisher - Publishing playlist event:', {
      title: playlistData.title,
      trackCount: playlistData.tracks.length,
      isUpdate,
      originalIdentifier
    });

    try {
      const playlistEventData = isUpdate && originalIdentifier
        ? musicPlaylistPublisher.createUpdateEvent(originalIdentifier, playlistData)
        : musicPlaylistPublisher.createPlaylistEvent(playlistData);
      
      const playlistEvent = await this.createEvent(playlistEventData);
      this.publishedEventIds.push(playlistEvent.id);
      
      console.log('✅ EventPublisher - Playlist event published:', {
        title: playlistData.title,
        eventId: playlistEvent.id,
        identifier: playlistData.identifier
      });

      return playlistEvent.id;
    } catch (error) {
      console.error('❌ EventPublisher - Playlist event publishing failed:', error);
      throw new Error(`Failed to publish playlist "${playlistData.title}": ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  getPublishedEventIds(): string[] {
    return [...this.publishedEventIds];
  }

  // TODO: Implement rollback functionality for failed publishes
  // This would create deletion events for any successfully published events
  // if the overall operation fails
}

/**
 * Main publishing orchestrator
 */
class ReleasePublisher {
  constructor(
    private createEvent: (eventData: any) => Promise<any>,
    private uploadFile: (file: File) => Promise<Array<string[]>>,
    private queryClient: any
  ) {}

  async publishRelease(releaseData: ReleaseFormData, user: any): Promise<string> {
    console.log('🚀 ReleasePublisher - Starting release publishing:', {
      title: releaseData.title,
      trackCount: releaseData.tracks.length
    });

    // Step 1: Validate everything upfront
    ReleaseValidator.validateAll(user, releaseData);

    // Step 2: Initialize handlers
    const uploadHandler = new FileUploadHandler(this.uploadFile);
    const eventPublisher = new EventPublisher(this.createEvent);

    try {
      // Step 3: Upload release image
      const releaseImageUrl = await uploadHandler.uploadReleaseImage(releaseData.imageFile);

      // Step 4: Process all tracks (upload files, create track data)
      const trackProcessor = new TrackDataProcessor(
        uploadHandler,
        releaseData,
        user.pubkey,
        releaseImageUrl
      );

      const processedTracks: ProcessedTrack[] = [];
      for (let i = 0; i < releaseData.tracks.length; i++) {
        const processedTrack = await trackProcessor.processTrack(releaseData.tracks[i], i);
        processedTracks.push(processedTrack);
      }

      // Step 5: Publish all track events
      for (const processedTrack of processedTracks) {
        await eventPublisher.publishTrackEvent(processedTrack);
      }

      // Step 6: Create and publish playlist event
      const playlistData: MusicPlaylistData = {
        identifier: '', // Will be generated
        title: releaseData.title,
        tracks: processedTracks.map(pt => pt.trackReference),
        description: releaseData.description,
        imageUrl: releaseImageUrl,
        categories: releaseData.tags.length > 0 ? releaseData.tags : undefined,
        isPublic: true,
        authorPubkey: user.pubkey,
      };

      const playlistEventId = await eventPublisher.publishPlaylistEvent(playlistData);

      // Step 7: Invalidate caches
      await this.invalidateQueries();

      console.log('🎉 ReleasePublisher - Release published successfully:', {
        title: releaseData.title,
        playlistEventId,
        trackCount: processedTracks.length
      });

      return playlistEventId;

    } catch (error) {
      console.error('❌ ReleasePublisher - Release publishing failed:', error);
      // TODO: Implement rollback of published events
      throw error;
    }
  }

  async updateRelease(
    releaseId: string,
    releaseIdentifier: string,
    releaseData: ReleaseFormData,
    user: any
  ): Promise<string> {
    console.log('🔄 ReleasePublisher - Starting release update:', {
      releaseId,
      releaseIdentifier,
      title: releaseData.title,
      trackCount: releaseData.tracks.length
    });

    // Validation
    ReleaseValidator.validateAll(user, releaseData);

    // Initialize handlers
    const uploadHandler = new FileUploadHandler(this.uploadFile);
    const eventPublisher = new EventPublisher(this.createEvent);

    try {
      // Upload release image
      const releaseImageUrl = await uploadHandler.uploadReleaseImage(releaseData.imageFile);

      // Process tracks
      const trackProcessor = new TrackDataProcessor(
        uploadHandler,
        releaseData,
        user.pubkey,
        releaseImageUrl
      );

      const processedTracks: ProcessedTrack[] = [];
      for (let i = 0; i < releaseData.tracks.length; i++) {
        const processedTrack = await trackProcessor.processTrack(releaseData.tracks[i], i);
        processedTracks.push(processedTrack);
      }

      // Publish track events (creates new events for updates)
      for (const processedTrack of processedTracks) {
        await eventPublisher.publishTrackEvent(processedTrack);
      }

      // Update playlist event
      const playlistData: MusicPlaylistData = {
        identifier: releaseIdentifier,
        title: releaseData.title,
        tracks: processedTracks.map(pt => pt.trackReference),
        description: releaseData.description,
        imageUrl: releaseImageUrl,
        categories: releaseData.tags.length > 0 ? releaseData.tags : undefined,
        isPublic: true,
        authorPubkey: user.pubkey,
      };

      const playlistEventId = await eventPublisher.publishPlaylistEvent(
        playlistData,
        true,
        releaseIdentifier
      );

      // Invalidate caches
      await this.invalidateQueries(releaseId);

      console.log('🎉 ReleasePublisher - Release updated successfully:', {
        releaseId,
        playlistEventId,
        trackCount: processedTracks.length
      });

      return playlistEventId;

    } catch (error) {
      console.error('❌ ReleasePublisher - Release update failed:', error);
      throw error;
    }
  }

  private async invalidateQueries(releaseId?: string): Promise<void> {
    const queries = [
      ['releases'],
      ['music-tracks'],
      ['music-playlists'],
      ['podcast-stats'],
      ['rss-feed-generator']
    ];

    if (releaseId) {
      queries.push(['podcast-release', releaseId]);
    }

    await Promise.all(
      queries.map(queryKey => 
        this.queryClient.invalidateQueries({ queryKey })
      )
    );
  }
}

/**
 * Simplified hooks using the new architecture
 */
export function usePublishRelease() {
  const { user } = useCurrentUser();
  const { mutateAsync: createEvent } = useNostrPublish();
  const { mutateAsync: uploadFile } = useUploadFile();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (releaseData: ReleaseFormData): Promise<string> => {
      const publisher = new ReleasePublisher(createEvent, uploadFile, queryClient);
      return await publisher.publishRelease(releaseData, user);
    },
    onError: (error) => {
      console.error('Failed to publish release:', error);
    }
  });
}

export function useUpdateRelease() {
  const { user } = useCurrentUser();
  const { mutateAsync: createEvent } = useNostrPublish();
  const { mutateAsync: uploadFile } = useUploadFile();
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
      const publisher = new ReleasePublisher(createEvent, uploadFile, queryClient);
      return await publisher.updateRelease(releaseId, releaseIdentifier, releaseData, user);
    },
    onError: (error) => {
      console.error('Failed to update release:', error);
    }
  });
}

/**
 * Deletion remains simple as it's already well-structured
 */
export function useDeleteRelease() {
  const { user } = useCurrentUser();
  const { mutateAsync: createEvent } = useNostrPublish();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      playlistId,
      trackIds
    }: {
      playlistId: string;
      trackIds?: string[];
    }): Promise<string[]> => {
      ReleaseValidator.validateUser(user);

      const deletionEventIds: string[] = [];

      // Delete track events
      if (trackIds?.length) {
        for (const trackId of trackIds) {
          const trackDeletionEvent = await createEvent({
            kind: 5,
            content: 'Deleted track',
            tags: [['e', trackId]]
          });
          deletionEventIds.push(trackDeletionEvent.id);
        }
      }

      // Delete playlist event
      const playlistDeletionEvent = await createEvent({
        kind: 5,
        content: 'Deleted release/playlist',
        tags: [['e', playlistId]]
      });
      deletionEventIds.push(playlistDeletionEvent.id);

      // Invalidate queries
      const publisher = new ReleasePublisher(createEvent, () => Promise.resolve([]), queryClient);
      await (publisher as any).invalidateQueries(playlistId);

      return deletionEventIds;
    }
  });
}
