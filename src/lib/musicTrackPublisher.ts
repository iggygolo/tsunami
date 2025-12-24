import type { NostrEvent } from '@nostrify/nostrify';
import type { MusicTrackData, ZapSplit } from '@/types/podcast';
import { MUSIC_KINDS } from '@/lib/musicConfig';
import { validateAudioUrl, validateImageUrl, validateVideoUrl } from '@/lib/urlValidation';

/**
 * Publisher for Music Track Events (Kind 36787)
 * Handles creation and publishing of individual music track events
 */
export class MusicTrackPublisher {
  /**
   * Generate a unique identifier for a music track
   */
  private generateTrackIdentifier(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `track-${timestamp}-${random}`;
  }

  /**
   * Validate required fields for music track data
   */
  private validateRequiredFields(trackData: MusicTrackData): void {
    if (!trackData.title?.trim()) {
      throw new Error('Track title is required');
    }
    if (!trackData.artist?.trim()) {
      throw new Error('Artist name is required');
    }
    if (!trackData.audioUrl?.trim()) {
      throw new Error('Audio URL is required');
    }
    
    // Validate audio URL format and compatibility
    const audioValidation = validateAudioUrl(trackData.audioUrl);
    if (!audioValidation.isValid) {
      throw new Error(`Invalid audio URL: ${audioValidation.error}`);
    }
  }

  /**
   * Validate zap splits sum to 100%
   */
  private validateZapSplits(zapSplits: ZapSplit[]): void {
    if (zapSplits.length === 0) return;
    
    const totalPercentage = zapSplits.reduce((sum, split) => sum + split.percentage, 0);
    if (Math.abs(totalPercentage - 100) > 0.01) { // Allow for small floating point errors
      throw new Error(`Zap splits must sum to 100%, got ${totalPercentage}%`);
    }
    
    // Validate individual splits
    for (const split of zapSplits) {
      if (split.percentage <= 0 || split.percentage > 100) {
        throw new Error(`Zap split percentage must be between 0 and 100, got ${split.percentage}%`);
      }
      if (!split.address?.trim()) {
        throw new Error('Zap split address is required');
      }
    }
  }

  /**
   * Build tags array for music track event
   */
  private buildEventTags(trackData: MusicTrackData): Array<[string, ...string[]]> {
    const tags: Array<[string, ...string[]]> = [];
    
    // Required tags
    tags.push(['d', trackData.identifier]);
    tags.push(['title', trackData.title]);
    tags.push(['artist', trackData.artist]);
    tags.push(['url', trackData.audioUrl]);
    tags.push(['t', 'music']); // Required music tag
    
    // Optional metadata tags
    if (trackData.album) {
      tags.push(['album', trackData.album]);
    }
    
    if (trackData.trackNumber !== undefined) {
      tags.push(['track_number', trackData.trackNumber.toString()]);
    }
    
    if (trackData.releaseDate) {
      // Validate ISO 8601 date format (YYYY-MM-DD)
      if (!/^\d{4}-\d{2}-\d{2}$/.test(trackData.releaseDate)) {
        throw new Error('Release date must be in ISO 8601 format (YYYY-MM-DD)');
      }
      tags.push(['released', trackData.releaseDate]);
    }
    
    if (trackData.duration !== undefined) {
      tags.push(['duration', trackData.duration.toString()]);
    }
    
    if (trackData.format) {
      tags.push(['format', trackData.format]);
    }
    
    if (trackData.bitrate) {
      tags.push(['bitrate', trackData.bitrate]);
    }
    
    if (trackData.sampleRate) {
      tags.push(['sample_rate', trackData.sampleRate]);
    }
    
    // Media file tags
    if (trackData.imageUrl) {
      const imageValidation = validateImageUrl(trackData.imageUrl);
      if (!imageValidation.isValid) {
        throw new Error(`Invalid image URL: ${imageValidation.error}`);
      }
      tags.push(['image', trackData.imageUrl]);
    }
    
    if (trackData.videoUrl) {
      const videoValidation = validateVideoUrl(trackData.videoUrl);
      if (!videoValidation.isValid) {
        throw new Error(`Invalid video URL: ${videoValidation.error}`);
      }
      tags.push(['video', trackData.videoUrl]);
    }
    
    // Language tag
    if (trackData.language) {
      // Validate ISO 639-1 language code
      if (!/^[a-z]{2}$/.test(trackData.language)) {
        throw new Error('Language must be a valid ISO 639-1 two-letter code');
      }
      tags.push(['language', trackData.language]);
    }
    
    // Explicit content flag
    if (trackData.explicit === true) {
      tags.push(['explicit', 'true']);
    }
    
    // Genre tags (additional 't' tags)
    if (trackData.genres && trackData.genres.length > 0) {
      for (const genre of trackData.genres) {
        if (genre.trim()) {
          tags.push(['t', genre.trim().toLowerCase()]);
        }
      }
    }
    
    // Lightning Network zap splits
    if (trackData.zapSplits && trackData.zapSplits.length > 0) {
      this.validateZapSplits(trackData.zapSplits);
      for (const split of trackData.zapSplits) {
        tags.push(['zap', split.address, split.percentage.toString()]);
      }
    }
    
    // Alt tag for accessibility (NIP-31)
    tags.push(['alt', `Music track: ${trackData.title} by ${trackData.artist}`]);
    
    return tags;
  }

  /**
   * Build content field for music track event
   */
  private buildEventContent(trackData: MusicTrackData): string {
    const contentParts: string[] = [];
    
    if (trackData.lyrics?.trim()) {
      contentParts.push(`Lyrics:\n${trackData.lyrics.trim()}`);
    }
    
    if (trackData.credits?.trim()) {
      contentParts.push(`Credits:\n${trackData.credits.trim()}`);
    }
    
    return contentParts.join('\n\n');
  }

  /**
   * Create a music track event structure
   */
  public createTrackEvent(trackData: MusicTrackData): Omit<NostrEvent, 'id' | 'pubkey' | 'sig'> {
    // Ensure identifier is set
    if (!trackData.identifier) {
      trackData.identifier = this.generateTrackIdentifier();
    }
    
    // Validate required fields
    this.validateRequiredFields(trackData);
    
    // Build event structure
    const tags = this.buildEventTags(trackData);
    const content = this.buildEventContent(trackData);
    
    return {
      kind: MUSIC_KINDS.MUSIC_TRACK,
      content,
      tags,
      created_at: Math.floor(Date.now() / 1000)
    };
  }

  /**
   * Create an update event for an existing music track
   */
  public createUpdateEvent(
    originalIdentifier: string, 
    trackData: MusicTrackData
  ): Omit<NostrEvent, 'id' | 'pubkey' | 'sig'> {
    // Use the original identifier for updates
    trackData.identifier = originalIdentifier;
    
    // Create the event (same as new event but with preserved identifier)
    return this.createTrackEvent(trackData);
  }

  /**
   * Validate a music track event against the specification
   */
  public validateEvent(event: NostrEvent): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Check event kind
    if (event.kind !== MUSIC_KINDS.MUSIC_TRACK) {
      errors.push(`Event kind must be ${MUSIC_KINDS.MUSIC_TRACK}, got ${event.kind}`);
    }
    
    // Check required tags
    const tags = new Map(event.tags.map(([key, ...values]) => [key, values]));
    
    const requiredTags = ['d', 'title', 'artist', 'url'];
    for (const tagName of requiredTags) {
      if (!tags.has(tagName) || !tags.get(tagName)?.[0]?.trim()) {
        errors.push(`Missing required tag: ${tagName}`);
      }
    }
    
    // Check for music tag
    const tTags = event.tags.filter(([key, value]) => key === 't' && value === 'music');
    if (tTags.length === 0) {
      errors.push('Missing required "t" tag with value "music"');
    }
    
    // Validate URL format for required url tag
    const urlTag = tags.get('url')?.[0];
    if (urlTag) {
      try {
        new URL(urlTag);
      } catch {
        errors.push('Invalid URL format in "url" tag');
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

/**
 * Default instance for use throughout the application
 */
export const musicTrackPublisher = new MusicTrackPublisher();