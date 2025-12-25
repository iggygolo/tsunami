import type { NostrEvent } from '@nostrify/nostrify';
import type { MusicPlaylistData, TrackReference } from '@/types/music';
import { MUSIC_KINDS } from '@/lib/musicConfig';
import { validateImageUrl } from '@/lib/urlValidation';

/**
 * Publisher for Music Playlist Events (Kind 34139)
 * Handles creation and publishing of music playlist events
 */
export class MusicPlaylistPublisher {
  /**
   * Generate a unique identifier for a music playlist
   */
  private generatePlaylistIdentifier(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `playlist-${timestamp}-${random}`;
  }

  /**
   * Validate required fields for music playlist data
   */
  private validateRequiredFields(playlistData: MusicPlaylistData): void {
    if (!playlistData.title?.trim()) {
      throw new Error('Playlist title is required');
    }
    
    if (!playlistData.tracks || playlistData.tracks.length === 0) {
      throw new Error('Playlist must contain at least one track');
    }
    
    // Validate track references
    for (let i = 0; i < playlistData.tracks.length; i++) {
      const track = playlistData.tracks[i];
      if (track.kind !== MUSIC_KINDS.MUSIC_TRACK) {
        throw new Error(`Track ${i + 1}: Invalid track kind, must be ${MUSIC_KINDS.MUSIC_TRACK}`);
      }
      if (!track.pubkey?.trim()) {
        throw new Error(`Track ${i + 1}: Track pubkey is required`);
      }
      if (!track.identifier?.trim()) {
        throw new Error(`Track ${i + 1}: Track identifier is required`);
      }
      // Validate pubkey format (hex)
      if (!/^[0-9a-f]{64}$/i.test(track.pubkey)) {
        throw new Error(`Track ${i + 1}: Invalid pubkey format`);
      }
    }
  }

  /**
   * Build tags array for music playlist event
   */
  private buildEventTags(playlistData: MusicPlaylistData): Array<[string, ...string[]]> {
    const tags: Array<[string, ...string[]]> = [];
    
    // Required tags
    tags.push(['d', playlistData.identifier]);
    tags.push(['title', playlistData.title]);
    tags.push(['alt', `Playlist: ${playlistData.title}`]); // NIP-31 alt tag
    
    // Track references (ordered)
    for (const track of playlistData.tracks) {
      tags.push(['a', `${track.kind}:${track.pubkey}:${track.identifier}`]);
    }
    
    // Optional metadata tags
    if (playlistData.description?.trim()) {
      tags.push(['description', playlistData.description.trim()]);
    }
    
    if (playlistData.imageUrl) {
      const imageValidation = validateImageUrl(playlistData.imageUrl);
      if (!imageValidation.isValid) {
        throw new Error(`Invalid playlist image URL: ${imageValidation.error}`);
      }
      tags.push(['image', playlistData.imageUrl]);
    }
    
    // Category tags
    tags.push(['t', 'playlist']); // Always include playlist tag
    if (playlistData.categories && playlistData.categories.length > 0) {
      for (const category of playlistData.categories) {
        if (category.trim()) {
          tags.push(['t', category.trim().toLowerCase()]);
        }
      }
    }
    
    // Playlist settings
    tags.push(['public', 'true']);
    
    return tags;
  }

  /**
   * Build content field for music playlist event
   */
  private buildEventContent(playlistData: MusicPlaylistData): string {
    // Use description as content if provided
    return playlistData.description?.trim() || '';
  }

  /**
   * Create a music playlist event structure
   */
  public createPlaylistEvent(playlistData: MusicPlaylistData): Omit<NostrEvent, 'id' | 'pubkey' | 'sig'> {
    // Ensure identifier is set
    if (!playlistData.identifier) {
      playlistData.identifier = this.generatePlaylistIdentifier();
      console.log('🆔 musicPlaylistPublisher - Generated playlist identifier:', playlistData.identifier);
    } else {
      console.log('🆔 musicPlaylistPublisher - Using existing identifier:', playlistData.identifier);
    }
    
    console.log('📝 musicPlaylistPublisher - Creating playlist event:', {
      identifier: playlistData.identifier,
      title: playlistData.title,
      trackCount: playlistData.tracks.length,
      tracks: playlistData.tracks.map(t => ({
        pubkey: t.pubkey.slice(0, 8) + '...',
        identifier: t.identifier,
        title: t.title
      }))
    });
    
    // Validate required fields
    this.validateRequiredFields(playlistData);
    
    // Build event structure
    const tags = this.buildEventTags(playlistData);
    const content = this.buildEventContent(playlistData);
    
    console.log('🏷️ musicPlaylistPublisher - Event tags built:', {
      totalTags: tags.length,
      dTag: tags.find(t => t[0] === 'd')?.[1],
      titleTag: tags.find(t => t[0] === 'title')?.[1],
      aTags: tags.filter(t => t[0] === 'a').length,
      trackReferences: tags.filter(t => t[0] === 'a').map(t => t[1])
    });
    
    return {
      kind: MUSIC_KINDS.MUSIC_PLAYLIST,
      content,
      tags,
      created_at: Math.floor(Date.now() / 1000)
    };
  }

  /**
   * Create an update event for an existing music playlist
   */
  public createUpdateEvent(
    originalIdentifier: string, 
    playlistData: MusicPlaylistData
  ): Omit<NostrEvent, 'id' | 'pubkey' | 'sig'> {
    // Use the original identifier for updates
    playlistData.identifier = originalIdentifier;
    
    // Create the event (same as new event but with preserved identifier)
    return this.createPlaylistEvent(playlistData);
  }

  /**
   * Add tracks to an existing playlist
   */
  public addTracksToPlaylist(
    currentPlaylist: MusicPlaylistData,
    newTracks: TrackReference[],
    position?: number
  ): MusicPlaylistData {
    const updatedPlaylist = { ...currentPlaylist };
    
    if (position !== undefined && position >= 0 && position <= updatedPlaylist.tracks.length) {
      // Insert at specific position
      updatedPlaylist.tracks = [
        ...updatedPlaylist.tracks.slice(0, position),
        ...newTracks,
        ...updatedPlaylist.tracks.slice(position)
      ];
    } else {
      // Add to end
      updatedPlaylist.tracks = [...updatedPlaylist.tracks, ...newTracks];
    }
    
    return updatedPlaylist;
  }

  /**
   * Remove tracks from a playlist by index
   */
  public removeTracksFromPlaylist(
    currentPlaylist: MusicPlaylistData,
    indicesToRemove: number[]
  ): MusicPlaylistData {
    const updatedPlaylist = { ...currentPlaylist };
    
    // Sort indices in descending order to remove from end first
    const sortedIndices = [...indicesToRemove].sort((a, b) => b - a);
    
    for (const index of sortedIndices) {
      if (index >= 0 && index < updatedPlaylist.tracks.length) {
        updatedPlaylist.tracks.splice(index, 1);
      }
    }
    
    return updatedPlaylist;
  }

  /**
   * Reorder tracks in a playlist
   */
  public reorderPlaylistTracks(
    currentPlaylist: MusicPlaylistData,
    fromIndex: number,
    toIndex: number
  ): MusicPlaylistData {
    const updatedPlaylist = { ...currentPlaylist };
    const tracks = [...updatedPlaylist.tracks];
    
    if (fromIndex >= 0 && fromIndex < tracks.length && 
        toIndex >= 0 && toIndex < tracks.length && 
        fromIndex !== toIndex) {
      
      const [movedTrack] = tracks.splice(fromIndex, 1);
      tracks.splice(toIndex, 0, movedTrack);
      
      updatedPlaylist.tracks = tracks;
    }
    
    return updatedPlaylist;
  }

  /**
   * Validate a music playlist event against the specification
   */
  public validateEvent(event: NostrEvent): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Check event kind
    if (event.kind !== MUSIC_KINDS.MUSIC_PLAYLIST) {
      errors.push(`Event kind must be ${MUSIC_KINDS.MUSIC_PLAYLIST}, got ${event.kind}`);
    }
    
    // Check required tags
    const tags = new Map(event.tags.map(([key, ...values]) => [key, values]));
    
    const requiredTags = ['d', 'title', 'alt'];
    for (const tagName of requiredTags) {
      if (!tags.has(tagName) || !tags.get(tagName)?.[0]?.trim()) {
        errors.push(`Missing required tag: ${tagName}`);
      }
    }
    
    // Check for at least one track reference
    const trackRefs = event.tags.filter(([key]) => key === 'a');
    if (trackRefs.length === 0) {
      errors.push('Playlist must contain at least one track reference');
    }
    
    // Validate track reference format
    for (let i = 0; i < trackRefs.length; i++) {
      const [, ref] = trackRefs[i];
      if (!ref) {
        errors.push(`Track reference ${i + 1}: Missing reference value`);
        continue;
      }
      
      const parts = ref.split(':');
      if (parts.length !== 3) {
        errors.push(`Track reference ${i + 1}: Invalid format, expected "kind:pubkey:identifier"`);
        continue;
      }
      
      const [kind, pubkey, identifier] = parts;
      if (kind !== MUSIC_KINDS.MUSIC_TRACK.toString()) {
        errors.push(`Track reference ${i + 1}: Invalid kind, expected ${MUSIC_KINDS.MUSIC_TRACK}`);
      }
      
      if (!/^[0-9a-f]{64}$/i.test(pubkey)) {
        errors.push(`Track reference ${i + 1}: Invalid pubkey format`);
      }
      
      if (!identifier.trim()) {
        errors.push(`Track reference ${i + 1}: Missing identifier`);
      }
    }
    
    // Check for playlist tag
    const playlistTag = event.tags.find(([key, value]) => key === 't' && value === 'playlist');
    if (!playlistTag) {
      errors.push('Missing required "t" tag with value "playlist"');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Parse track reference string into TrackReference object
   */
  public parseTrackReference(refString: string): TrackReference | null {
    const parts = refString.split(':');
    if (parts.length !== 3) return null;
    
    const [kind, pubkey, identifier] = parts;
    if (kind !== MUSIC_KINDS.MUSIC_TRACK.toString()) return null;
    if (!/^[0-9a-f]{64}$/i.test(pubkey)) return null;
    if (!identifier.trim()) return null;
    
    return {
      kind: MUSIC_KINDS.MUSIC_TRACK,
      pubkey,
      identifier
    };
  }

  /**
   * Create track reference string from TrackReference object
   */
  public createTrackReference(track: TrackReference): string {
    return `${track.kind}:${track.pubkey}:${track.identifier}`;
  }
}

/**
 * Default instance for use throughout the application
 */
export const musicPlaylistPublisher = new MusicPlaylistPublisher();