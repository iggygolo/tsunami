import { useQuery } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import { MUSIC_KINDS } from '@/lib/musicConfig';
import { genRSSFeed } from '@/lib/rssGenerator';
import { useArtistMetadata } from '@/hooks/useArtistMetadata';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import {
  validateMusicTrack,
  validateMusicPlaylist,
  eventToMusicTrack,
  eventToMusicPlaylist,
  deduplicateEventsByIdentifier,
  getEventIdentifier
} from '@/lib/eventConversions';

/**
 * Hook to fetch music tracks and playlists and generate RSS feed
 * Generates single RSS feed with multiple channels (one per release)
 */
export function useRSSFeedGenerator() {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const { data: artistMetadata } = useArtistMetadata(user?.pubkey);

  return useQuery({
    queryKey: ['rss-feed-generator', user?.pubkey],
    queryFn: async () => {
      if (!user?.pubkey) {
        throw new Error('User must be logged in to generate RSS feed');
      }

      try {
        // Fetch both music tracks (36787) and playlists (34139)
        const [trackEvents, playlistEvents] = await Promise.all([
          nostr.query([{
            kinds: [MUSIC_KINDS.MUSIC_TRACK],
            authors: [user.pubkey],
            limit: 1000,
          }]),
          nostr.query([{
            kinds: [MUSIC_KINDS.MUSIC_PLAYLIST],
            authors: [user.pubkey],
            limit: 100,
          }])
        ]);

        // Filter and validate events
        const validTracks = trackEvents.filter(validateMusicTrack);
        const validPlaylists = playlistEvents.filter(validateMusicPlaylist);

        // Deduplicate events using centralized utility
        const deduplicatedTracks = deduplicateEventsByIdentifier(validTracks, getEventIdentifier);
        const deduplicatedPlaylists = deduplicateEventsByIdentifier(validPlaylists, getEventIdentifier);

        // Convert to data structures using centralized conversions
        const tracks = deduplicatedTracks.map(eventToMusicTrack);
        const playlists = deduplicatedPlaylists.map(eventToMusicPlaylist);

        // Sort tracks by release date (newest first for RSS)
        tracks.sort((a, b) => {
          const dateA = a.releaseDate ? new Date(a.releaseDate).getTime() : a.createdAt?.getTime() || 0;
          const dateB = b.releaseDate ? new Date(b.releaseDate).getTime() : b.createdAt?.getTime() || 0;
          return dateB - dateA;
        });

        // Sort playlists by creation date (newest first for RSS)
        playlists.sort((a, b) => {
          const dateA = a.createdAt?.getTime() || 0;
          const dateB = b.createdAt?.getTime() || 0;
          return dateB - dateA;
        });

        // Prepare artist info for RSS generation
        const artistInfo = {
          pubkey: user.pubkey,
          npub: '', // We don't have npub here, but it's not critical for RSS generation
          name: artistMetadata?.artist,
          metadata: artistMetadata
        };

        // Generate RSS feed with multiple channels (one per release)
        await genRSSFeed(tracks, playlists, artistInfo);

        return {
          tracks,
          playlists,
          rssGenerated: true,
          lastGenerated: new Date(),
          channelCount: playlists.length, // Number of channels in the RSS feed
        };
      } catch (error) {
        console.error('Failed to generate RSS feed:', error);
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    enabled: !!user?.pubkey, // Only run if user is logged in
  });
}