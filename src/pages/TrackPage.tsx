import { useParams, useNavigate } from 'react-router-dom';
import { nip19 } from 'nostr-tools';
import { ArrowLeft, Music, Clock, Album, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Layout } from '@/components/Layout';
import { BlurredBackground } from '@/components/BlurredBackground';
import { NostrNavigationError } from '@/components/NostrNavigationError';
import { MusicItemHeader } from '@/components/music/MusicItemHeader';
import { UnifiedMusicCard } from '@/components/music/UnifiedMusicCard';
import { useTrackResolver } from '@/hooks/useEventResolver';
import { usePlaylistResolution } from '@/hooks/usePlaylistResolution';
import { useReleaseData } from '@/hooks/useReleaseData';
import { useTrackInteractions } from '@/hooks/useTrackInteractions';
import { useFormatDuration } from '@/hooks/useFormatDuration';
import { useUniversalAudioPlayer, musicTrackToUniversal } from '@/contexts/UniversalAudioPlayerContext';
import { eventToMusicTrack, playlistToRelease } from '@/lib/eventConversions';
import { MUSIC_KINDS, isArtist } from '@/lib/musicConfig';
import NotFound from './NotFound';
import type { NostrEvent } from '@nostrify/nostrify';
import type { MusicPlaylistData } from '@/types/music';

// Simple wrapper component to fetch release data from cache/live
function ReleaseDataWrapper({ playlist }: { playlist: MusicPlaylistData }) {
  const { release, isLoading } = useReleaseData({
    addressableEvent: {
      pubkey: playlist.authorPubkey || '',
      kind: MUSIC_KINDS.MUSIC_PLAYLIST,
      identifier: playlist.identifier
    }
  });

  if (isLoading) {
    return (
      <div className="rounded-xl bg-card/30 border border-border/50 backdrop-blur-xl overflow-hidden animate-pulse">
        <div className="w-full aspect-square bg-muted" />
        <div className="p-2 space-y-1">
          <div className="h-3 bg-muted rounded w-3/4" />
          <div className="h-2 bg-muted rounded w-1/2" />
        </div>
      </div>
    );
  }

  if (!release) {
    // Fallback to basic playlist data if cache/live data unavailable
    const fallbackRelease = playlistToRelease(playlist, new Map());
    return (
      <UnifiedMusicCard
        content={fallbackRelease}
        className="w-full"
      />
    );
  }

  return (
    <UnifiedMusicCard
      content={release}
      className="w-full"
    />
  );
}

export function TrackPage() {
  const params = useParams<{ naddr: string }>();
  const navigate = useNavigate();
  const { formatDuration } = useFormatDuration();
  const { playQueue, state, play, pause } = useUniversalAudioPlayer();

  // Only handle naddr format
  if (!params.naddr) {
    return <NotFound />;
  }

  let pubkey: string;
  let identifier: string;

  try {
    const decoded = nip19.decode(params.naddr);
    if (decoded.type === 'naddr') {
      pubkey = decoded.data.pubkey;
      identifier = decoded.data.identifier;
    } else {
      return <NotFound />;
    }
  } catch (error) {
    return <NotFound />;
  }

  // Resolve the track event
  const { data: track, isLoading: isLoadingTrack, error: trackError, refetch } = useTrackResolver(
    pubkey,
    identifier,
    eventToMusicTrack
  );

  // Find playlists containing this track
  const { playlists, isLoading: isLoadingPlaylists } = usePlaylistResolution({
    trackPubkey: pubkey,
    trackIdentifier: identifier,
    enabled: !!track // Only search for playlists after track is loaded
  });

  const isLoading = isLoadingTrack || isLoadingPlaylists;

  // Create NostrEvent for interactions
  const trackEvent: NostrEvent | null = track ? {
    id: track.eventId || `track-${Date.now()}`,
    pubkey: track.artistPubkey || pubkey,
    created_at: Math.floor((track.createdAt?.getTime() || Date.now()) / 1000),
    kind: MUSIC_KINDS.MUSIC_TRACK,
    tags: [
      ['d', track.identifier],
      ['title', track.title],
      ['artist', track.artist],
      ['audio', track.audioUrl],
      ...(track.album ? [['album', track.album]] : []),
      ...(track.imageUrl ? [['image', track.imageUrl]] : []),
      ...(track.genres ? track.genres.map(genre => ['t', genre]) : []),
    ],
    content: track.lyrics || track.credits || '',
    sig: ''
  } : null;

  // Use track interactions hook for like/share functionality
  const {
    interactionCounts,
    hasUserLiked,
    handleLike,
    handleShare
  } = useTrackInteractions({ track, event: trackEvent });

  // Handle track playback
  const handleTrackPlay = () => {
    if (!track || !track.audioUrl) return;
    
    // Check if this track is currently playing
    const isCurrentTrack = state.currentTrack?.id === track.eventId || 
                          state.currentTrack?.id === `${track.artistPubkey}:${track.identifier}`;
    
    if (isCurrentTrack) {
      // If this track is currently loaded, just toggle play/pause
      if (state.isPlaying) {
        pause();
      } else {
        play();
      }
    } else {
      // If this is a different track, load and play it
      const universalTrack = musicTrackToUniversal(track, {
        type: 'profile',
        artistPubkey: track.artistPubkey
      });
      
      playQueue([universalTrack], 0, track.title);
    }
  };

  // Check if this track is currently playing
  const isCurrentTrack = state.currentTrack?.id === track?.eventId || 
                         state.currentTrack?.id === `${track?.artistPubkey}:${track?.identifier}`;
  const isTrackPlaying = isCurrentTrack && state.isPlaying;

  // Loading state
  if (isLoading) {
    return (
      <Layout>
        <div className="relative w-full max-w-full">
          <BlurredBackground image={undefined} />
          
          <div className="relative py-4 w-full max-w-full overflow-hidden">
            {/* Back Button */}
            <Button 
              variant="ghost" 
              onClick={() => navigate(-1)} 
              className="mb-2 text-white/70 hover:text-white"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>

            {/* Loading State */}
            <div className="text-center py-16">
              <div className="animate-pulse">
                <div className="w-48 h-48 bg-muted rounded-2xl mx-auto mb-6"></div>
                <div className="h-8 bg-muted rounded w-64 mx-auto mb-4"></div>
                <div className="h-5 bg-muted rounded w-32 mx-auto mb-2"></div>
                <div className="h-4 bg-muted rounded w-48 mx-auto"></div>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // Error state
  if (trackError || !track) {
    const getErrorType = (): 'not_found' | 'network_error' | 'timeout' => {
      if (!trackError) return 'not_found';
      if (trackError.includes('timeout') || trackError.includes('AbortError')) return 'timeout';
      if (trackError.includes('network') || trackError.includes('fetch')) return 'network_error';
      return 'not_found';
    };

    // Check if this looks like a playlist track identifier
    const isPlaylistTrack = identifier.includes('-track-');
    
    return (
      <Layout>
        <div className="relative w-full max-w-full">
          <BlurredBackground image={undefined} />
          
          <div className="relative py-4 w-full max-w-full overflow-hidden">
            {/* Back Button */}
            <Button 
              variant="ghost" 
              onClick={() => navigate(-1)} 
              className="mb-2 text-white/70 hover:text-white"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>

            {isPlaylistTrack ? (
              <div className="text-center py-16">
                <Music className="w-16 h-16 mx-auto mb-6 text-white/30" />
                <h2 className="text-2xl font-semibold mb-2 text-white drop-shadow-lg">Track Only Available in Playlist</h2>
                <p className="text-white/60 mb-6 drop-shadow-md max-w-md mx-auto">
                  This track exists only as part of a playlist and is not available as a standalone track. 
                  Please access it through the playlist view.
                </p>
                <div className="flex gap-3 justify-center">
                  <Button 
                    onClick={() => navigate(-1)}
                    className="bg-black/30 border border-white/20 text-white backdrop-blur-xl hover:bg-black/40 hover:border-white/30 transition-all duration-200 shadow-lg"
                  >
                    Go Back
                  </Button>
                  <Button 
                    onClick={() => navigate('/releases')}
                    variant="outline"
                    className="border-white/20 text-white hover:bg-white/10 backdrop-blur-xl"
                  >
                    Browse Releases
                  </Button>
                </div>
              </div>
            ) : (
              <NostrNavigationError
                type={getErrorType()}
                title="Track Not Found"
                message={trackError || "This track doesn't exist or hasn't been published yet."}
                onRetry={refetch}
                showBackButton={false}
              />
            )}
          </div>
        </div>
      </Layout>
    );
  }

  // Success state - track loaded
  return (
    <Layout>
      <div className="relative w-full max-w-full">
        <BlurredBackground image={track.imageUrl} />
        
        <div className="relative py-4 w-full max-w-full overflow-hidden">
          {/* Back Button */}
          <Button 
            variant="ghost" 
            onClick={() => navigate(-1)} 
            className="mb-2 text-white/70 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>

          {/* Track Header */}
          <MusicItemHeader
            title={track.title}
            artistName={track.artist}
            artistPubkey={track.artistPubkey}
            description={track.description}
            imageUrl={track.imageUrl}
            genres={track.genres}
            metadata={[
              ...(track.album ? [{ text: `Album: ${track.album}` }] : []),
              ...(track.duration ? [{ 
                icon: <Clock className="w-3 h-3" />, 
                text: formatDuration(track.duration) 
              }] : []),
              ...(playlists.length > 0 ? (() => {
                const releases = playlists.filter(playlist => playlist.authorPubkey && isArtist(playlist.authorPubkey));
                const userPlaylists = playlists.filter(playlist => playlist.authorPubkey && !isArtist(playlist.authorPubkey));
                const parts: string[] = [];
                
                if (releases.length > 0) {
                  parts.push(`${releases.length} release${releases.length !== 1 ? 's' : ''}`);
                }
                if (userPlaylists.length > 0) {
                  parts.push(`${userPlaylists.length} user playlist${userPlaylists.length !== 1 ? 's' : ''}`);
                }
                
                return [{ text: `Found in ${parts.join(' and ')}` }];
              })() : [])
            ]}
            stats={{
              sats: interactionCounts?.totalSats || 0,
              zaps: interactionCounts?.zaps || 0
            }}
            playback={track.audioUrl ? {
              isPlaying: isTrackPlaying,
              isLoading: state.isLoading,
              hasPlayableTracks: true,
              onPlay: handleTrackPlay
            } : undefined}
            interactions={trackEvent ? {
              event: trackEvent,
              hasUserLiked: hasUserLiked,
              onLike: handleLike,
              onShare: handleShare
            } : undefined}
          />

          {/* Playlists Section */}
          {playlists.length > 0 && (
            <div className="mb-6">
              {(() => {
                // Categorize playlists
                const releases = playlists.filter(playlist => playlist.authorPubkey && isArtist(playlist.authorPubkey));
                const userPlaylists = playlists.filter(playlist => playlist.authorPubkey && !isArtist(playlist.authorPubkey));

                return (
                  <>
                    {/* Releases Section */}
                    {releases.length > 0 && (
                      <div className="mb-8">
                        <div className="flex items-center gap-2 mb-4">
                          <Album className="w-5 h-5 text-white" />
                          <h3 className="text-white font-semibold text-lg">
                            Found in {releases.length} Release{releases.length !== 1 ? 's' : ''}
                          </h3>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                          {releases.map((playlist) => {
                            // Use ReleaseDataWrapper to fetch cached release data
                            return (
                              <ReleaseDataWrapper
                                key={playlist.eventId || playlist.identifier}
                                playlist={playlist}
                              />
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* User Playlists Section */}
                    {userPlaylists.length > 0 && (
                      <div className={releases.length > 0 ? 'border-t border-white/10 pt-8' : ''}>
                        <div className="flex items-center gap-2 mb-4">
                          <Users className="w-5 h-5 text-white" />
                          <h3 className="text-white font-semibold text-lg">
                            Added to {userPlaylists.length} User Playlist{userPlaylists.length !== 1 ? 's' : ''}
                          </h3>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                          {userPlaylists.map((playlist) => {
                            // Use ReleaseDataWrapper to fetch cached release data
                            return (
                              <ReleaseDataWrapper
                                key={playlist.eventId || playlist.identifier}
                                playlist={playlist}
                              />
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          )}

          {/* Lyrics Section */}
          {track.lyrics && (
            <div className="bg-black/30 border border-white/20 backdrop-blur-xl rounded-lg shadow-lg p-4 mb-6">
              <h3 className="text-white font-semibold mb-3">Lyrics</h3>
              <div className="text-white/80 text-sm whitespace-pre-line leading-relaxed">
                {track.lyrics}
              </div>
            </div>
          )}

          {/* Credits Section */}
          {track.credits && (
            <div className="bg-black/30 border border-white/20 backdrop-blur-xl rounded-lg shadow-lg p-4">
              <h3 className="text-white font-semibold mb-3">Credits</h3>
              <div className="text-white/80 text-sm whitespace-pre-line">
                {track.credits}
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}