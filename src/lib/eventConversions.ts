import type { NostrEvent } from '@nostrify/nostrify';
import type { MusicTrackData, MusicPlaylistData, TrackReference, PodcastRelease, ReleaseTrack } from '@/types/podcast';
import { getArtistPubkeyHex, PODCAST_KINDS } from '@/lib/podcastConfig';

/**
 * Centralized event validation and conversion utilities
 * This module provides consistent validation and conversion logic for Nostr events
 */

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validates if a Nostr event is a valid music track (Kind 36787)
 */
export function validateMusicTrack(event: NostrEvent): boolean {
  if (event.kind !== PODCAST_KINDS.MUSIC_TRACK) return false;

  // Check for required tags
  const tags = new Map(event.tags.map(([key, ...values]) => [key, values]));
  
  if (!tags.get('d')?.[0]) return false; // identifier required
  if (!tags.get('title')?.[0]) return false; // title required
  if (!tags.get('artist')?.[0]) return false; // artist required
  if (!tags.get('url')?.[0]) return false; // audio URL required

  // Verify it's from the music artist
  if (event.pubkey !== getArtistPubkeyHex()) return false;

  return true;
}

/**
 * Validates if a Nostr event is a valid music playlist (Kind 34139)
 */
export function validateMusicPlaylist(event: NostrEvent): boolean {
  if (event.kind !== PODCAST_KINDS.MUSIC_PLAYLIST) return false;

  // Check for required tags
  const tags = new Map(event.tags.map(([key, ...values]) => [key, values]));
  
  if (!tags.get('d')?.[0]) return false; // identifier required
  if (!tags.get('title')?.[0]) return false; // title required

  // Must have at least one track reference
  const trackRefs = event.tags.filter(([key]) => key === 'a');
  if (trackRefs.length === 0) return false;

  // Verify it's from the music artist
  if (event.pubkey !== getArtistPubkeyHex()) return false;

  return true;
}

// ============================================================================
// EVENT CONVERSION FUNCTIONS
// ============================================================================

/**
 * Converts a music track event to MusicTrackData
 */
export function eventToMusicTrack(event: NostrEvent): MusicTrackData {
  const tags = new Map(event.tags.map(([key, ...values]) => [key, values]));

  return {
    identifier: tags.get('d')?.[0] || '',
    title: tags.get('title')?.[0] || '',
    artist: tags.get('artist')?.[0] || '',
    audioUrl: tags.get('url')?.[0] || '',
    album: tags.get('album')?.[0],
    trackNumber: tags.get('track_number')?.[0] ? parseInt(tags.get('track_number')![0]) : undefined,
    releaseDate: tags.get('released')?.[0],
    duration: tags.get('duration')?.[0] ? parseInt(tags.get('duration')![0]) : undefined,
    format: tags.get('format')?.[0],
    bitrate: tags.get('bitrate')?.[0],
    sampleRate: tags.get('sample_rate')?.[0],
    imageUrl: tags.get('image')?.[0],
    videoUrl: tags.get('video')?.[0],
    language: tags.get('language')?.[0],
    explicit: tags.get('explicit')?.[0] === 'true',
    genres: event.tags.filter(([key, value]) => key === 't' && value !== 'music').map(([, value]) => value),
    eventId: event.id,
    artistPubkey: event.pubkey,
    createdAt: new Date(event.created_at * 1000),
    lyrics: event.content.includes('Lyrics:') ? event.content.split('Lyrics:\n')[1]?.split('\n\nCredits:')[0] : undefined,
    credits: event.content.includes('Credits:') ? event.content.split('Credits:\n')[1] : undefined,
  };
}

/**
 * Converts a music playlist event to MusicPlaylistData
 */
export function eventToMusicPlaylist(event: NostrEvent): MusicPlaylistData {
  const tags = new Map(event.tags.map(([key, ...values]) => [key, values]));

  // Extract track references
  const trackRefs: TrackReference[] = event.tags
    .filter(([key]) => key === 'a')
    .map(([, ref]) => {
      const parts = ref.split(':');
      if (parts.length !== 3) return null;
      
      const [kind, pubkey, identifier] = parts;
      return {
        kind: parseInt(kind) as 36787,
        pubkey,
        identifier
      };
    })
    .filter((ref): ref is TrackReference => ref !== null);

  return {
    identifier: tags.get('d')?.[0] || '',
    title: tags.get('title')?.[0] || '',
    tracks: trackRefs,
    description: tags.get('description')?.[0] || event.content || undefined,
    imageUrl: tags.get('image')?.[0],
    categories: event.tags.filter(([key, value]) => key === 't' && value !== 'playlist').map(([, value]) => value),
    isPublic: tags.get('public')?.[0] === 'true',
    isPrivate: tags.get('private')?.[0] === 'true',
    isCollaborative: tags.get('collaborative')?.[0] === 'true',
    eventId: event.id,
    authorPubkey: event.pubkey,
    createdAt: new Date(event.created_at * 1000),
  };
}

// ============================================================================
// LEGACY COMPATIBILITY FUNCTIONS
// ============================================================================

/**
 * Converts playlist and track data to legacy PodcastRelease format for backward compatibility
 */
export function playlistToRelease(
  playlist: MusicPlaylistData, 
  tracks: Map<string, MusicTrackData>
): PodcastRelease {
  // Convert tracks to legacy format
  const releaseTracks: ReleaseTrack[] = playlist.tracks
    .map(trackRef => {
      const track = tracks.get(`${trackRef.pubkey}:${trackRef.identifier}`);
      if (!track) return null;
      
      const releaseTrack: ReleaseTrack = {
        title: track.title,
        audioUrl: track.audioUrl,
        audioType: track.format === 'mp3' ? 'audio/mpeg' : 
                  track.format === 'wav' ? 'audio/wav' :
                  track.format === 'm4a' ? 'audio/mp4' :
                  track.format === 'ogg' ? 'audio/ogg' :
                  track.format === 'flac' ? 'audio/flac' : 'audio/mpeg',
        duration: track.duration,
        explicit: track.explicit || false,
        language: track.language || null,
      };
      return releaseTrack;
    })
    .filter((track): track is ReleaseTrack => track !== null);

  return {
    id: playlist.eventId || '',
    title: playlist.title,
    description: playlist.description,
    content: undefined,
    imageUrl: playlist.imageUrl,
    publishDate: playlist.createdAt || new Date(),
    tags: playlist.categories || [],
    transcriptUrl: undefined,
    genre: playlist.categories?.[0] || null,
    externalRefs: [],
    eventId: playlist.eventId || '',
    artistPubkey: playlist.authorPubkey || '',
    identifier: playlist.identifier,
    createdAt: playlist.createdAt || new Date(),
    tracks: releaseTracks,
  };
}

/**
 * Legacy function for backward compatibility - converts single track to release format
 */
export function trackToRelease(track: MusicTrackData): PodcastRelease {
  return {
    id: track.eventId || '',
    title: track.title,
    description: track.lyrics || track.credits,
    content: undefined,
    imageUrl: track.imageUrl,
    publishDate: track.createdAt || new Date(),
    tags: track.genres || [],
    transcriptUrl: undefined,
    genre: track.genres?.[0] || null,
    externalRefs: [],
    eventId: track.eventId || '',
    artistPubkey: track.artistPubkey || '',
    identifier: track.identifier,
    createdAt: track.createdAt || new Date(),
    tracks: [{
      title: track.title,
      audioUrl: track.audioUrl,
      audioType: track.format === 'mp3' ? 'audio/mpeg' : 
                track.format === 'wav' ? 'audio/wav' :
                track.format === 'm4a' ? 'audio/mp4' :
                track.format === 'ogg' ? 'audio/ogg' :
                track.format === 'flac' ? 'audio/flac' : 'audio/mpeg',
      duration: track.duration,
      explicit: track.explicit || false,
      language: track.language || null,
    }],
  };
}

/**
 * Legacy function for backward compatibility - converts any event to release format
 */
export function eventToPodcastRelease(event: NostrEvent): PodcastRelease {
  // This function is kept for backward compatibility with existing components
  // For new event types, it will return a minimal release structure
  if (event.kind === PODCAST_KINDS.MUSIC_TRACK && validateMusicTrack(event)) {
    const track = eventToMusicTrack(event);
    return trackToRelease(track);
  }
  
  // For other event types, return a minimal structure
  return {
    id: event.id,
    title: 'Unknown Release',
    description: undefined,
    content: undefined,
    imageUrl: undefined,
    publishDate: new Date(event.created_at * 1000),
    tags: [],
    transcriptUrl: undefined,
    genre: null,
    externalRefs: [],
    eventId: event.id,
    artistPubkey: event.pubkey,
    identifier: event.id,
    createdAt: new Date(event.created_at * 1000),
    tracks: [],
  };
}

// ============================================================================
// EVENT EDITING UTILITIES
// ============================================================================

/**
 * Checks if an event is an edit of another event
 */
export function isEditEvent(event: NostrEvent): boolean {
  return event.tags.some(([name]) => name === 'edit');
}

/**
 * Gets the original event ID from an edit event
 */
export function getOriginalEventId(event: NostrEvent): string | undefined {
  return event.tags.find(([name]) => name === 'edit')?.[1];
}

// ============================================================================
// EVENT DEDUPLICATION UTILITIES
// ============================================================================

/**
 * Deduplicates events by identifier, keeping the latest version
 * Handles edit events properly by excluding original events that have been edited
 */
export function deduplicateEventsByIdentifier<T extends NostrEvent>(
  events: T[],
  getIdentifier: (event: T) => string
): T[] {
  const eventsByIdentifier = new Map<string, T>();
  const originalEvents = new Set<string>(); // Track original events that have been edited

  // First pass: identify edited events and their originals
  events.forEach(event => {
    if (isEditEvent(event)) {
      const originalId = getOriginalEventId(event);
      if (originalId) {
        originalEvents.add(originalId);
      }
    }
  });

  // Second pass: select the best version for each identifier
  events.forEach(event => {
    const identifier = getIdentifier(event);
    if (!identifier) return;

    // Skip if this is an original event that has been edited
    if (originalEvents.has(event.id)) return;

    const existing = eventsByIdentifier.get(identifier);
    if (!existing || event.created_at > existing.created_at) {
      eventsByIdentifier.set(identifier, event);
    }
  });

  return Array.from(eventsByIdentifier.values());
}

/**
 * Helper function to get identifier from 'd' tag
 */
export function getEventIdentifier(event: NostrEvent): string {
  return event.tags.find(([name]) => name === 'd')?.[1] || '';
}

// ============================================================================
// ADDRESSABLE EVENT UTILITIES
// ============================================================================

/**
 * Creates an addressable event reference string
 */
export function createAddressableEventRef(kind: number, pubkey: string, identifier: string): string {
  return `${kind}:${pubkey}:${identifier}`;
}

/**
 * Creates a playlist addressable event reference
 */
export function createPlaylistRef(pubkey: string, identifier: string): string {
  return createAddressableEventRef(PODCAST_KINDS.MUSIC_PLAYLIST, pubkey, identifier);
}

/**
 * Creates a track addressable event reference
 */
export function createTrackRef(pubkey: string, identifier: string): string {
  return createAddressableEventRef(PODCAST_KINDS.MUSIC_TRACK, pubkey, identifier);
}