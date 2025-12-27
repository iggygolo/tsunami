import { nip19 } from 'nostr-tools';
import type { NostrEvent } from '@nostrify/nostrify';
import { MUSIC_KINDS } from '@/lib/musicConfig';

/**
 * Default relays to include in nevent encodings for better discoverability
 */
const DEFAULT_RELAYS = [
  'wss://nos.lol',
  'wss://relay.damus.io'
];

/**
 * Encode a Nostr event as nevent with relay hints for better discoverability
 * @param event The Nostr event to encode
 * @param customRelays Optional custom relays to include
 * @returns nevent string
 */
export function encodeNevent(event: NostrEvent, customRelays?: string[]): string {
  const relays = customRelays || DEFAULT_RELAYS;
  
  return nip19.neventEncode({
    id: event.id,
    relays,
    author: event.pubkey
  });
}

/**
 * Encode an event ID as nevent with relay hints
 * @param eventId The event ID to encode
 * @param artistPubkey The artist's pubkey
 * @param customRelays Optional custom relays to include
 * @returns nevent string
 */
export function encodeEventIdAsNevent(
  eventId: string, 
  artistPubkey: string, 
  customRelays?: string[]
): string {
  const relays = customRelays || DEFAULT_RELAYS;
  
  return nip19.neventEncode({
    id: eventId,
    relays,
    author: artistPubkey
  });
}

/**
 * Encode a Nostr addressable event as naddr with relay hints
 * @param event The addressable Nostr event to encode (kind 30000-39999)
 * @param customRelays Optional custom relays to include
 * @returns naddr string
 */
export function encodeNaddr(event: NostrEvent, customRelays?: string[]): string {
  const relays = customRelays || DEFAULT_RELAYS;
  
  // Find the 'd' tag for the identifier
  const dTag = event.tags.find(([name]) => name === 'd');
  const identifier = dTag?.[1] || '';
  
  return nip19.naddrEncode({
    identifier,
    pubkey: event.pubkey,
    kind: event.kind,
    relays
  });
}

/**
 * Encode addressable event parameters as naddr with relay hints
 * @param pubkey The author's pubkey
 * @param kind The event kind (30000-39999)
 * @param identifier The 'd' tag identifier
 * @param customRelays Optional custom relays to include
 * @returns naddr string
 */
export function encodeAddressableEvent(
  pubkey: string,
  kind: number,
  identifier: string,
  customRelays?: string[]
): string {
  const relays = customRelays || DEFAULT_RELAYS;
  
  return nip19.naddrEncode({
    identifier,
    pubkey,
    kind,
    relays
  });
}

/**
 * Encode a music track as naddr (for addressable music track events)
 * @param pubkey The track author's pubkey
 * @param identifier The track 'd' tag identifier
 * @param customRelays Optional custom relays to include
 * @returns naddr string for the music track
 */
export function encodeMusicTrackAsNaddr(
  pubkey: string,
  identifier: string,
  customRelays?: string[]
): string {
  const relays = customRelays || DEFAULT_RELAYS;
  
  return nip19.naddrEncode({
    identifier,
    pubkey,
    kind: MUSIC_KINDS.MUSIC_TRACK,
    relays
  });
}

/**
 * Encode a music playlist as naddr (for addressable music playlist events)
 * @param pubkey The playlist author's pubkey
 * @param identifier The playlist 'd' tag identifier
 * @param customRelays Optional custom relays to include
 * @returns naddr string for the music playlist
 */
export function encodeMusicPlaylistAsNaddr(
  pubkey: string,
  identifier: string,
  customRelays?: string[]
): string {
  const relays = customRelays || DEFAULT_RELAYS;
  
  return nip19.naddrEncode({
    identifier,
    pubkey,
    kind: MUSIC_KINDS.MUSIC_PLAYLIST,
    relays
  });
}

/**
 * Generate a track link using naddr format
 * @param pubkey The track author's pubkey
 * @param identifier The track 'd' tag identifier
 * @returns Track URL path
 */
export function generateTrackLink(pubkey: string, identifier: string): string {
  const naddr = encodeMusicTrackAsNaddr(pubkey, identifier);
  return `/track/${naddr}`;
}

/**
 * Generate a release link using naddr format
 * @param pubkey The release author's pubkey
 * @param identifier The release 'd' tag identifier
 * @returns Release URL path
 */
export function generateReleaseLink(pubkey: string, identifier: string): string {
  const naddr = encodeMusicPlaylistAsNaddr(pubkey, identifier);
  return `/release/${naddr}`;
}



/**
 * Get the default relays used for nevent encoding
 * @returns Array of default relay URLs
 */
export function getDefaultRelays(): string[] {
  return [...DEFAULT_RELAYS];
}