import type { NostrEvent } from '@nostrify/nostrify';

/**
 * Podcast release metadata based on NIP-54
 */
export interface PodcastRelease {
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
  guests?: PodcastGuest[];
  externalRefs?: ExternalReference[];
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
}

/**
 * Podcast chapter information (Podcasting 2.0)
 */
export interface PodcastChapter {
  startTime: number; // seconds
  title: string;
  img?: string;
  url?: string;
}

/**
 * Podcast guest/person information
 */
export interface PodcastGuest {
  name: string;
  role?: string;
  group?: string;
  img?: string;
  href?: string;
  npub?: string; // Nostr pubkey if available
}

/**
 * External reference for RSS/podcast platform integration (NIP-73)
 */
export interface ExternalReference {
  type: 'podcast:guid' | 'podcast:item:guid' | 'podcast:publisher:guid' | 'apple:id' | 'spotify:id';
  value: string;
  url?: string;
}

/**
 * Podcast release form data for publishing
 */
export interface ReleaseFormData {
  title: string;
  description: string;
  tags: string[];
  imageFile?: File;
  imageUrl?: string;
  tracks: TrackFormData[];
  genre?: string | null; // Custom genre string
}

/**
 * Track information
 */
export interface TrackFormData {
  title: string;
  audioFile?: File;
  audioUrl?: string;
  audioType?: string;
  duration?: number;
  explicit?: boolean;
  language?: string | null; // ISO 639-1 two-letter code or null for instrumental
}

/**
 * Podcast statistics for dashboard/analytics
 */
export interface PodcastStats {
  totalReleases: number;
  totalZaps: number;
  totalComments: number;
  totalReposts: number;
  mostZappedRelease?: PodcastRelease;
  mostCommentedRelease?: PodcastRelease;
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
  // Transcript as URL references
  transcriptUrl?: string;
  funding?: Array<{
    url: string;
    message: string;
  }>;
  // Language metadata for tracks
  language?: string | null; // ISO 639-1 code or null for instrumental
}

/**
 * Utility type for Nostr event validation
 */
export interface ValidatedPodcastEvent extends NostrEvent {
  kind: 30023; // NIP-23 long-form content for podcast releases
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
  currentRelease?: PodcastRelease;
  playlist: PodcastRelease[];
  currentIndex: number;
}

/**
 * Comment with Nostr event data
 */
export interface PodcastComment {
  id: string;
  content: string;
  artistPubkey: string;
  authorName?: string;
  authorImage?: string;
  releaseId: string;
  parentCommentId?: string;
  createdAt: Date;
  zapCount?: number;
  replies: PodcastComment[];
  event: NostrEvent;
}

/**
 * Podcast trailer information (Podcasting 2.0)
 * Based on https://podcasting2.org/docs/podcast-namespace/tags/trailer
 */
export interface PodcastTrailer {
  id: string;
  title: string; // Node value (max 128 chars)
  url: string; // Audio/video file URL
  pubDate: Date; // RFC2822 format
  length?: number; // File size in bytes
  type?: string; // MIME type
  season?: number; // Optional season number
  
  // Nostr-specific fields
  eventId: string;
  artistPubkey: string;
  identifier: string; // 'd' tag identifier
  createdAt: Date;
}

/**
 * Trailer form data for publishing
 */
export interface TrailerFormData {
  title: string;
  url?: string;
  audioFile?: File;
  audioType?: string;
  length?: number;
  season?: number;
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