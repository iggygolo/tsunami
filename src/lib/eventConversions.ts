import type { NostrEvent } from '@nostrify/nostrify';
import type { MusicTrackData, MusicPlaylistData, TrackReference, MusicRelease, ReleaseTrack } from '@/types/music';
import { MUSIC_KINDS } from '@/lib/musicConfig';
import { formatToAudioType } from '@/lib/audioUtils';

/**
 * Modern music event validation and conversion utilities
 * This module provides validation and conversion logic for modern Nostr music events:
 * - Kind 36787: Music Track events
 * - Kind 34139: Music Playlist events
 */

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validates if a Nostr event is a valid music track (Kind 36787)
 * Improved with better error handling and optional field validation
 */
export function validateMusicTrack(event: NostrEvent): boolean {
  if (event.kind !== MUSIC_KINDS.MUSIC_TRACK) return false;

  // Check for required tags
  const tags = new Map(event.tags.map(([key, ...values]) => [key, values]));
  
  // Required fields
  if (!tags.get('d')?.[0]) return false; // identifier required
  if (!tags.get('title')?.[0]) return false; // title required
  if (!tags.get('artist')?.[0]) return false; // artist required
  if (!tags.get('url')?.[0]) return false; // audio URL required

  // Check for required music tag
  const hasMusicTag = event.tags.some(([key, value]) => key === 't' && value === 'music');
  if (!hasMusicTag) return false;

  // Validate audio URL format
  const audioUrl = tags.get('url')?.[0];
  if (audioUrl && !isValidUrl(audioUrl)) return false;

  // Validate optional numeric fields
  const duration = tags.get('duration')?.[0];
  if (duration && (isNaN(parseInt(duration)) || parseInt(duration) < 0)) return false;

  const trackNumber = tags.get('track_number')?.[0];
  if (trackNumber && (isNaN(parseInt(trackNumber)) || parseInt(trackNumber) < 1)) return false;

  // Verify it's from the music artist (relaxed - allow any pubkey for flexibility)
  // This allows for collaborative releases and guest tracks
  
  return true;
}

/**
 * Validates if a Nostr event is a valid music playlist (Kind 34139)
 * Improved with better track reference validation
 */
export function validateMusicPlaylist(event: NostrEvent): boolean {
  if (event.kind !== MUSIC_KINDS.MUSIC_PLAYLIST) return false;

  // Check for required tags
  const tags = new Map(event.tags.map(([key, ...values]) => [key, values]));
  
  if (!tags.get('d')?.[0]) return false; // identifier required
  if (!tags.get('title')?.[0]) return false; // title required

  // Must have at least one track reference
  const trackRefs = event.tags.filter(([key]) => key === 'a');
  if (trackRefs.length === 0) return false;

  // Validate track references format
  for (const [, ref] of trackRefs) {
    if (!ref) continue;
    const parts = ref.split(':');
    if (parts.length !== 3) return false;
    
    const [kind, pubkey, identifier] = parts;
    if (kind !== MUSIC_KINDS.MUSIC_TRACK.toString()) return false;
    if (!pubkey || pubkey.length !== 64) return false; // Valid hex pubkey
    if (!identifier) return false;
  }

  // Verify it's from the music artist (relaxed - allow any pubkey for flexibility)
  // This allows for curated playlists and collaborative releases
  
  return true;
}

/**
 * Validates if a URL is properly formatted
 */
function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

// ============================================================================
// EVENT CONVERSION FUNCTIONS
// ============================================================================

/**
 * Converts a music track event to MusicTrackData
 */
export function eventToMusicTrack(event: NostrEvent): MusicTrackData {
  const tags = new Map(event.tags.map(([key, ...values]) => [key, values]));

  // Parse zap splits from zap tags
  const zapSplits = event.tags
    .filter(([key]) => key === 'zap')
    .map(([, address, percentage]) => ({
      address,
      percentage: parseFloat(percentage || '0'),
      type: address.includes('@') ? 'lnaddress' as const : 'node' as const
    }))
    .filter(split => split.address && split.percentage > 0);

  // Parse content for description, lyrics and credits
  const content = event.content || '';
  let description: string | undefined;
  let lyrics: string | undefined;
  let credits: string | undefined;

  if (content.trim()) {
    const sections = content.split('\n\n');
    for (const section of sections) {
      const trimmed = section.trim();
      if (trimmed.startsWith('Lyrics:')) {
        lyrics = trimmed.replace(/^Lyrics:\s*/, '').trim();
      } else if (trimmed.startsWith('Credits:')) {
        credits = trimmed.replace(/^Credits:\s*/, '').trim();
      } else if (!lyrics && !credits && !description) {
        // First section without a label is treated as description
        description = trimmed;
      }
    }
  }

  return {
    // Required fields
    identifier: tags.get('d')?.[0] || '',
    title: tags.get('title')?.[0] || '',
    artist: tags.get('artist')?.[0] || '',
    audioUrl: tags.get('url')?.[0] || '',

    // Optional metadata
    description,
    album: tags.get('album')?.[0],
    trackNumber: tags.get('track_number')?.[0] ? parseInt(tags.get('track_number')![0]) : undefined,
    releaseDate: tags.get('released')?.[0],
    duration: tags.get('duration')?.[0] ? parseInt(tags.get('duration')![0]) : undefined,
    format: tags.get('format')?.[0],
    bitrate: tags.get('bitrate')?.[0],
    sampleRate: tags.get('sample_rate')?.[0],

    // Media files
    imageUrl: tags.get('image')?.[0],
    videoUrl: tags.get('video')?.[0],

    // Content and metadata
    lyrics,
    credits,
    language: tags.get('language')?.[0],
    explicit: tags.get('explicit')?.[0] === 'true',
    genres: event.tags.filter(([key, value]) => key === 't' && value !== 'music').map(([, value]) => value),

    // Lightning Network
    zapSplits: zapSplits.length > 0 ? zapSplits : undefined,

    // Nostr-specific fields
    eventId: event.id,
    artistPubkey: event.pubkey,
    createdAt: new Date(event.created_at * 1000),
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
 * Improved with better error handling and data validation
 */
export function playlistToRelease(
  playlist: MusicPlaylistData, 
  tracks: Map<string, MusicTrackData>
): MusicRelease {
  console.log('🔄 playlistToRelease - Converting playlist to release:', {
    playlistTitle: playlist.title,
    playlistIdentifier: playlist.identifier,
    trackReferences: playlist.tracks?.length || 0,
    availableTracks: tracks.size,
    trackMap: Array.from(tracks.keys())
  });

  // Convert tracks to legacy format with better error handling
  const releaseTracks: ReleaseTrack[] = [];
  
  playlist.tracks.forEach((trackRef, index) => {
    const trackKey = `${trackRef.pubkey}:${trackRef.identifier}`;
    const track = tracks.get(trackKey);
    
    console.log(`🎵 playlistToRelease - Processing track ${index + 1}:`, {
      trackRef: {
        pubkey: trackRef.pubkey?.slice(0, 8) + '...',
        identifier: trackRef.identifier,
        title: trackRef.title
      },
      trackKey,
      foundTrack: !!track,
      trackData: track ? {
        title: track.title,
        hasAudio: !!track.audioUrl,
        duration: track.duration
      } : null
    });
    
    if (track) {
      // Use actual track data
      const releaseTrack: ReleaseTrack = {
        title: track.title,
        audioUrl: track.audioUrl,
        audioType: formatToAudioType(track.format || 'mp3'),
        duration: track.duration,
        explicit: track.explicit || false,
        language: track.language || null,
        imageUrl: track.imageUrl, // Include individual track image
      };
      releaseTracks.push(releaseTrack);
      console.log(`✅ playlistToRelease - Track ${index + 1} added with full data`);
    } else {
      // Create placeholder track with reference data
      const releaseTrack: ReleaseTrack = {
        title: trackRef.title || `Track ${index + 1}`,
        audioUrl: '', // Empty URL indicates missing track
        audioType: 'mp3',
        duration: undefined,
        explicit: false,
        language: null,
        imageUrl: undefined, // No image for placeholder tracks
      };
      releaseTracks.push(releaseTrack);
      console.log(`⚠️ playlistToRelease - Track ${index + 1} added as placeholder (missing track data)`);
    }
  });

  // Calculate total duration from resolved tracks
  const totalDuration = releaseTracks
    .filter(track => track.duration)
    .reduce((sum, track) => sum + (track.duration || 0), 0);

  console.log('🎉 playlistToRelease - Conversion complete:', {
    title: playlist.title,
    totalTracks: releaseTracks.length,
    tracksWithAudio: releaseTracks.filter(t => t.audioUrl).length,
    tracksWithoutAudio: releaseTracks.filter(t => !t.audioUrl).length,
    totalDuration
  });

  return {
    id: playlist.eventId || '',
    title: playlist.title,
    description: playlist.description,
    content: playlist.description, // Use description as content for compatibility
    imageUrl: playlist.imageUrl,
    publishDate: playlist.createdAt || new Date(),
    tags: playlist.categories || [],
    transcriptUrl: undefined,
    genre: playlist.categories?.[0] || null,
    eventId: playlist.eventId || '',
    artistPubkey: playlist.authorPubkey || '',
    identifier: playlist.identifier,
    createdAt: playlist.createdAt || new Date(),
    tracks: releaseTracks,
    // Add computed fields
    ...(totalDuration > 0 && { totalDuration }),
    ...(playlist.zapCount && { zapCount: playlist.zapCount }),
    ...(playlist.totalSats && { totalSats: playlist.totalSats }),
    ...(playlist.commentCount && { commentCount: playlist.commentCount }),
    ...(playlist.repostCount && { repostCount: playlist.repostCount }),
  };
}

/**
 * Legacy function for backward compatibility - converts single track to release format
 * Improved with better metadata handling and validation
 */
export function trackToRelease(track: MusicTrackData): MusicRelease {
  // Create a comprehensive description from available metadata
  const descriptionParts: string[] = [];
  
  if (track.album) {
    descriptionParts.push(`Album: ${track.album}`);
  }
  
  if (track.releaseDate) {
    descriptionParts.push(`Released: ${track.releaseDate}`);
  }
  
  if (track.duration) {
    const minutes = Math.floor(track.duration / 60);
    const seconds = track.duration % 60;
    descriptionParts.push(`Duration: ${minutes}:${seconds.toString().padStart(2, '0')}`);
  }
  
  if (track.lyrics) {
    descriptionParts.push('', 'Lyrics:', track.lyrics);
  }
  
  if (track.credits) {
    descriptionParts.push('', 'Credits:', track.credits);
  }
  
  const description = descriptionParts.length > 0 ? descriptionParts.join('\n') : undefined;

  return {
    id: track.eventId || '',
    title: track.title,
    description,
    content: description,
    imageUrl: track.imageUrl,
    publishDate: track.createdAt || new Date(),
    tags: track.genres || [],
    transcriptUrl: undefined,
    genre: track.genres?.[0] || null,
    eventId: track.eventId || '',
    artistPubkey: track.artistPubkey || '',
    identifier: track.identifier,
    createdAt: track.createdAt || new Date(),
    tracks: [{
      title: track.title,
      audioUrl: track.audioUrl,
      audioType: formatToAudioType(track.format || 'mp3'),
      duration: track.duration,
      explicit: track.explicit || false,
      language: track.language || null,
      imageUrl: track.imageUrl, // Include individual track image
    }],
    // Add computed fields from track data
    ...(track.zapCount && { zapCount: track.zapCount }),
    ...(track.totalSats && { totalSats: track.totalSats }),
    ...(track.commentCount && { commentCount: track.commentCount }),
    ...(track.repostCount && { repostCount: track.repostCount }),
  };
}

/**
 * Reworked function for converting events to release format
 * Only handles modern music event kinds (36787 tracks, 34139 playlists)
 */
export function eventToPodcastRelease(event: NostrEvent): MusicRelease {
  // Handle music track events (Kind 36787)
  if (event.kind === MUSIC_KINDS.MUSIC_TRACK && validateMusicTrack(event)) {
    const track = eventToMusicTrack(event);
    return trackToRelease(track);
  }
  
  // Handle music playlist events (Kind 34139) - but without track resolution
  if (event.kind === MUSIC_KINDS.MUSIC_PLAYLIST && validateMusicPlaylist(event)) {
    const playlist = eventToMusicPlaylist(event);
    // Return playlist as release but with empty tracks (since we can't resolve them here)
    return {
      id: playlist.eventId || event.id,
      title: playlist.title,
      description: playlist.description,
      content: playlist.description,
      imageUrl: playlist.imageUrl,
      publishDate: playlist.createdAt || new Date(event.created_at * 1000),
      tags: playlist.categories || [],
      transcriptUrl: undefined,
      genre: playlist.categories?.[0] || null,
      eventId: playlist.eventId || event.id,
      artistPubkey: playlist.authorPubkey || event.pubkey,
      identifier: playlist.identifier,
      createdAt: playlist.createdAt || new Date(event.created_at * 1000),
      tracks: [], // Empty tracks - caller should use proper track resolution
    };
  }
  
  // For unsupported event types, return null or throw error
  throw new Error(`Unsupported event kind: ${event.kind}. Only music tracks (36787) and playlists (34139) are supported.`);
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
  return createAddressableEventRef(MUSIC_KINDS.MUSIC_PLAYLIST, pubkey, identifier);
}

/**
 * Creates a track addressable event reference
 */
export function createTrackRef(pubkey: string, identifier: string): string {
  return createAddressableEventRef(MUSIC_KINDS.MUSIC_TRACK, pubkey, identifier);
}