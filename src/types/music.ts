import type { NostrEvent } from '@nostrify/nostrify';

/**
 * Music release metadata
 */
export interface MusicRelease {
  id: string;
  title: string;
  imageUrl?: string;
  description?: string;
  content?: string;
  tracks: ReleaseTrack[];
  publishDate: Date;
  tags: string[];
  // Transcript as URL references
  transcriptUrl?: string;
  genre?: string | null; // Custom genre string (e.g., "punk", "alternative", "EDM")

  // Nostr-specific fields
  eventId: string;
  artistPubkey: string;
  identifier: string; // 'd' tag identifier for addressable events
  createdAt: Date;
  zapCount?: number;
  totalSats?: number;
  commentCount?: number;
  repostCount?: number;
}

export interface ReleaseTrack {
  title: string;
  audioUrl: string;
  audioType?: string;
  duration?: number;
  explicit?: boolean;
  language?: string | null; // ISO 639-1 two-letter code (e.g., "en", "es") or null for instrumental
  imageUrl?: string; // Individual track artwork URL
}

/**
 * Music Track Event data structure (Kind 36787)
 * Individual addressable music track with comprehensive metadata
 */
export interface MusicTrackData {
  // Required fields
  identifier: string;           // 'd' tag - unique identifier
  title: string;               // Track title
  artist: string;              // Artist name
  audioUrl: string;            // Direct URL to audio file
  
  // Optional metadata
  description?: string;        // Track description
  album?: string;              // Album name
  trackNumber?: number;        // Position in album
  releaseDate?: string;        // ISO 8601 date (YYYY-MM-DD)
  duration?: number;           // Track length in seconds
  format?: string;             // Audio format (mp3, flac, m4a, ogg)
  bitrate?: string;            // Audio bitrate (e.g., "320kbps")
  sampleRate?: string;         // Sample rate in Hz
  
  // Media files
  imageUrl?: string;           // Album artwork URL
  videoUrl?: string;           // Music video URL
  
  // Content and metadata
  lyrics?: string;             // Track lyrics
  credits?: string;            // Production credits
  language?: string;           // ISO 639-1 language code
  explicit?: boolean;          // Explicit content flag
  genres?: string[];           // Genre/category tags
  
  // Lightning Network
  zapSplits?: ZapSplit[];      // Payment distribution
  
  // Nostr-specific fields
  eventId?: string;            // Event ID (set after publishing)
  artistPubkey?: string;       // Artist's pubkey
  createdAt?: Date;            // Creation timestamp
  zapCount?: number;           // Number of zaps received
  totalSats?: number;          // Total sats received
  commentCount?: number;       // Number of comments
  repostCount?: number;        // Number of reposts
}

/**
 * Lightning Network payment split configuration
 */
export interface ZapSplit {
  address: string;             // Lightning address or node ID
  percentage: number;          // Split percentage (0-100)
  name?: string;               // Recipient name
  type: 'lnaddress' | 'node';  // Address type
}

/**
 * Music Track reference for playlists
 */
export interface TrackReference {
  kind: 36787;                 // Music Track event kind
  pubkey: string;              // Track author's pubkey (hex)
  identifier: string;          // Track's 'd' tag identifier
  title?: string;              // Cached track title (for display)
  artist?: string;             // Cached artist name (for display)
}

/**
 * Music Playlist data structure (Kind 34139)
 * Addressable event containing ordered list of music tracks
 */
export interface MusicPlaylistData {
  // Required fields
  identifier: string;          // 'd' tag - unique identifier
  title: string;               // Playlist title
  
  // Track references (ordered)
  tracks: TrackReference[];    // Ordered list of track references
  
  // Optional metadata
  description?: string;        // Short description
  imageUrl?: string;           // Playlist artwork URL
  categories?: string[];       // Category tags for discovery
  
  // Nostr-specific fields
  eventId?: string;            // Event ID (set after publishing)
  authorPubkey?: string;       // Playlist creator's pubkey
  createdAt?: Date;            // Creation timestamp
  zapCount?: number;           // Number of zaps received
  totalSats?: number;          // Total sats received
  commentCount?: number;       // Number of comments
  repostCount?: number;        // Number of reposts
}

/**
 * Music Playlist form data for UI
 */
export interface MusicPlaylistFormData {
  // Required fields
  title: string;
  
  // Track selection
  trackReferences: TrackReference[];
  
  // Optional metadata
  description?: string;
  imageFile?: File;            // Playlist artwork file
  imageUrl?: string;           // Playlist artwork URL
  categories?: string[];       // Category tags
}

/**
 * Music Track form data for publishing individual tracks
 */
export interface MusicTrackFormData {
  // Required fields
  title: string;
  artist: string;
  
  // Audio file (required - either file or URL)
  audioFile?: File;
  audioUrl?: string;
  audioType?: string;
  
  // Optional metadata
  description?: string;        // Track description
  album?: string;
  trackNumber?: number;
  releaseDate?: string;        // ISO 8601 date (YYYY-MM-DD)
  duration?: number;
  format?: string;             // Audio format (mp3, flac, m4a, ogg)
  bitrate?: string;            // Audio bitrate (e.g., "320kbps")
  sampleRate?: string;         // Sample rate in Hz
  
  // Media files
  imageFile?: File;            // Album artwork file
  imageUrl?: string;           // Album artwork URL
  videoFile?: File;            // Music video file
  videoUrl?: string;           // Music video URL
  
  // Content and metadata
  lyrics?: string;
  credits?: string;
  language?: string;           // ISO 639-1 language code
  explicit?: boolean;
  genres?: string[];           // Genre/category tags
  
  // Lightning Network
  zapSplits?: ZapSplit[];
}

/**
 * Statistics for dashboard/analytics
 */
export interface MusicStats {
  totalReleases: number;
  totalZaps: number;
  totalComments: number;
  totalReposts: number;
  mostZappedRelease?: MusicRelease;
  mostCommentedRelease?: MusicRelease;
  recentEngagement: EngagementActivity[];
}

/**
 * User engagement activity
 */
export interface EngagementActivity {
  type: 'zap' | 'comment' | 'repost';
  releaseId: string;
  releaseTitle: string;
  userPubkey: string;
  amount?: number; // for zaps
  timestamp: Date;
}

/**
 * Zap leaderboard entry
 */
export interface ZapLeaderboardEntry {
  userPubkey: string;
  userName?: string;
  userImage?: string;
  totalAmount: number;
  zapCount: number;
  lastZapDate: Date;
}

/**
 * RSS feed item for XML generation
 */
export interface RSSItem {
  title: string;
  description: string;
  link: string;
  guid: string;
  pubDate: string;
  author: string;
  category?: string[];
  enclosure: {
    url: string;
    length: number;
    type: string;
  };
  videoEnclosure?: {
    url: string;
    length: number;
    type: string;
  };
  duration?: string; // HH:MM:SS format
  explicit?: boolean;
  image?: string;
  transcriptUrl?: string;
  language?: string | null; // ISO 639-1 code or null for instrumental
}

/**
 * Utility type for Nostr event validation
 */
export interface ValidatedMusicEvent extends NostrEvent {
  kind: 36787 | 34139; // Music Track or Music Playlist events
  tags: Array<[string, ...string[]]>;
}

/**
 * Search and filter options for releases
 */
export interface ReleaseSearchOptions {
  query?: string;
  tags?: string[];
  sortBy?: 'date' | 'zaps' | 'comments' | 'title';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

/**
 * Audio player state
 */
export interface AudioPlayerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  playbackRate: number;
  currentRelease?: MusicRelease;
  playlist: MusicRelease[];
  currentIndex: number;
}

/**
 * Comment with Nostr event data
 */
export interface SocialComment {
  id: string;
  content: string;
  artistPubkey: string;
  authorName?: string;
  authorImage?: string;
  releaseId: string;
  parentCommentId?: string;
  createdAt: Date;
  zapCount?: number;
  replies: SocialComment[];
  event: NostrEvent;
}

/**
 * Language support types for track metadata
 */
export interface LanguageOption {
  code: string | null; // ISO 639-1 code or null for instrumental
  name: string; // Display name in English
  isInstrumental?: boolean; // Special option for instrumental tracks
}

export interface LanguageSupport {
  getAvailableLanguages(): LanguageOption[];
  validateLanguageCode(code: string | null): boolean;
  getLanguageName(code: string): string;
}

/**
 * Genre management types for release metadata
 */
export interface GenreManager {
  getCommonGenres(): string[];
  getCustomGenres(): string[];
  addCustomGenre(genre: string): void;
  getAllGenres(): string[];
  validateGenre(genre: string | null): boolean;
}

export interface GenreStorage {
  saveCustomGenre(genre: string): Promise<void>;
  loadCustomGenres(): Promise<string[]>;
  removeCustomGenre(genre: string): Promise<void>;
}

/**
 * Language and genre configuration types
 */
export interface LanguageConfiguration {
  commonLanguages: LanguageOption[];
  allLanguages: LanguageOption[];
  instrumentalOption: LanguageOption;
}

export interface GenreConfiguration {
  popularGenres: string[];
  allGenres: string[];
  customGenres: string[];
}

/**
 * RSS enhancement data structures
 */
export interface RSSLanguageElement {
  trackIndex: number;
  languageCode: string;
  xmlElement: string;
}

export interface RSSGenreElement {
  genre: string;
  xmlElement: string;
}

export interface EnhancedRSSMetadata {
  languages: RSSLanguageElement[];
  genres: RSSGenreElement[];
  hasLanguageMetadata: boolean;
  hasGenreMetadata: boolean;
}

/**
 * Validation utility types
 */
export type LanguageCode = string | null;
export type GenreString = string | null;

/**
 * Type guards for validation
 */
export function isValidLanguageCode(code: unknown): code is LanguageCode {
  return code === null || code === undefined || (typeof code === 'string' && /^[a-z]{2}$/.test(code));
}

export function isValidGenre(genre: unknown): genre is GenreString {
  return genre === null || genre === undefined || (typeof genre === 'string' && genre.trim().length > 0);
}