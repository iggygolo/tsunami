import { nip19 } from 'nostr-tools';
import type { NostrMetadata } from '@nostrify/nostrify';

/**
 * Simple artist information structure
 */
export interface SimpleArtistInfo {
  pubkey: string;
  name?: string; // From profile or fallback to npub
  npub: string; // Derived from pubkey
  image?: string; // Profile picture from metadata
}

/**
 * Simple Map-based cache for artist information
 */
class ArtistInfoCache {
  private artistInfoCache = new Map<string, SimpleArtistInfo>();
  private profileCache = new Map<string, NostrMetadata>();

  /**
   * Get artist info from cache
   */
  getArtistInfo(pubkey: string): SimpleArtistInfo | undefined {
    return this.artistInfoCache.get(pubkey);
  }

  /**
   * Set artist info in cache
   */
  setArtistInfo(pubkey: string, info: SimpleArtistInfo): void {
    this.artistInfoCache.set(pubkey, info);
  }

  /**
   * Get profile metadata from cache
   */
  getProfile(pubkey: string): NostrMetadata | undefined {
    return this.profileCache.get(pubkey);
  }

  /**
   * Set profile metadata in cache
   */
  setProfile(pubkey: string, profile: NostrMetadata): void {
    this.profileCache.set(pubkey, profile);
  }

  /**
   * Clear all cached data
   */
  clear(): void {
    this.artistInfoCache.clear();
    this.profileCache.clear();
  }

  /**
   * Get all cached artist info
   */
  getAllArtistInfo(): SimpleArtistInfo[] {
    return Array.from(this.artistInfoCache.values());
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      artistInfoCount: this.artistInfoCache.size,
      profileCount: this.profileCache.size,
    };
  }
}

// Global cache instance
const artistCache = new ArtistInfoCache();

/**
 * Convert pubkey to npub format
 */
export function pubkeyToNpub(pubkey: string): string {
  try {
    return nip19.npubEncode(pubkey);
  } catch (error) {
    console.warn('Failed to encode pubkey as npub:', error);
    return pubkey; // Fallback to original pubkey
  }
}

/**
 * Convert npub to pubkey format
 */
export function npubToPubkey(npub: string): string {
  try {
    const decoded = nip19.decode(npub);
    if (decoded.type === 'npub') {
      return decoded.data;
    }
    throw new Error('Invalid npub format');
  } catch (error) {
    console.warn('Failed to decode npub:', error);
    return npub; // Fallback to original value
  }
}

/**
 * Extract artist display name from profile metadata
 */
export function extractArtistName(profile: NostrMetadata): string | undefined {
  // Try different name fields in order of preference
  return profile.name || 
         profile.display_name || 
         (profile as any).displayName || 
         undefined;
}

/**
 * Extract artist image from profile metadata
 */
export function extractArtistImage(profile: NostrMetadata): string | undefined {
  return profile.picture || (profile as any).image || undefined;
}

/**
 * Get artist display name with fallback to npub
 */
export function getArtistDisplayName(pubkey: string): string {
  const cached = artistCache.getArtistInfo(pubkey);
  if (cached?.name) {
    return cached.name;
  }

  const profile = artistCache.getProfile(pubkey);
  if (profile) {
    const name = extractArtistName(profile);
    if (name) {
      // Update cache with extracted name
      const info = cached || { pubkey, npub: pubkeyToNpub(pubkey) };
      artistCache.setArtistInfo(pubkey, { ...info, name });
      return name;
    }
  }

  // Fallback to npub
  const npub = pubkeyToNpub(pubkey);
  return npub.slice(0, 12) + '...'; // Shortened npub for display
}

/**
 * Get artist display info (name and image) with caching
 */
export function getArtistDisplayInfo(pubkey: string): SimpleArtistInfo {
  // Check cache first
  const cached = artistCache.getArtistInfo(pubkey);
  if (cached) {
    return cached;
  }

  // Create basic info with npub
  const npub = pubkeyToNpub(pubkey);
  let info: SimpleArtistInfo = {
    pubkey,
    npub,
    name: npub.slice(0, 12) + '...', // Shortened npub as fallback
  };

  // Try to get from profile cache
  const profile = artistCache.getProfile(pubkey);
  if (profile) {
    const name = extractArtistName(profile);
    const image = extractArtistImage(profile);
    
    info = {
      ...info,
      name: name || info.name,
      image,
    };
  }

  // Cache the result
  artistCache.setArtistInfo(pubkey, info);
  return info;
}

/**
 * Update artist info cache with profile metadata
 */
export function updateArtistCache(pubkey: string, profile: NostrMetadata): SimpleArtistInfo {
  // Cache the profile
  artistCache.setProfile(pubkey, profile);

  // Extract and cache artist info
  const name = extractArtistName(profile);
  const image = extractArtistImage(profile);
  const npub = pubkeyToNpub(pubkey);

  const info: SimpleArtistInfo = {
    pubkey,
    npub,
    name: name || npub.slice(0, 12) + '...',
    image,
  };

  artistCache.setArtistInfo(pubkey, info);
  return info;
}

/**
 * Batch update artist cache with multiple profiles
 */
export function batchUpdateArtistCache(profiles: Array<{ pubkey: string; profile: NostrMetadata }>): SimpleArtistInfo[] {
  return profiles.map(({ pubkey, profile }) => updateArtistCache(pubkey, profile));
}

/**
 * Get all cached artist info
 */
export function getAllCachedArtists(): SimpleArtistInfo[] {
  return artistCache.getAllArtistInfo();
}

/**
 * Check if artist info is cached
 */
export function isArtistCached(pubkey: string): boolean {
  return artistCache.getArtistInfo(pubkey) !== undefined;
}

/**
 * Clear artist cache (useful for testing or memory management)
 */
export function clearArtistCache(): void {
  artistCache.clear();
}

/**
 * Get cache statistics for debugging
 */
export function getArtistCacheStats() {
  return artistCache.getStats();
}

/**
 * Extract unique artist pubkeys from music events
 */
export function extractArtistPubkeys(events: Array<{ pubkey: string }>): string[] {
  const pubkeys = new Set<string>();
  events.forEach(event => {
    if (event.pubkey) {
      pubkeys.add(event.pubkey);
    }
  });
  return Array.from(pubkeys);
}

/**
 * Validate pubkey format (basic hex validation)
 */
export function isValidPubkey(pubkey: string): boolean {
  return typeof pubkey === 'string' && 
         pubkey.length === 64 && 
         /^[0-9a-f]{64}$/i.test(pubkey);
}

/**
 * Validate npub format
 */
export function isValidNpub(npub: string): boolean {
  try {
    const decoded = nip19.decode(npub);
    return decoded.type === 'npub';
  } catch {
    return false;
  }
}