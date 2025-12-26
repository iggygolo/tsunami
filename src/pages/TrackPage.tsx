import { useParams, useNavigate } from 'react-router-dom';
import { nip19 } from 'nostr-tools';
import { ArrowLeft, Music } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Layout } from '@/components/Layout';
import { BlurredBackground } from '@/components/BlurredBackground';
import { NostrNavigationError } from '@/components/NostrNavigationError';
import { useTrackResolver } from '@/hooks/useEventResolver';
import { usePlaylistResolution } from '@/hooks/usePlaylistResolution';
import { eventToMusicTrack } from '@/lib/eventConversions';
import NotFound from './NotFound';

export function TrackPage() {
  const params = useParams<{ naddr: string }>();
  const navigate = useNavigate();

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
          <div className="flex flex-col lg:flex-row items-center lg:items-start gap-4 mb-6">
            {/* Track Artwork */}
            <div className="flex-shrink-0">
              <div className="w-40 h-40 sm:w-48 sm:h-48 rounded-2xl overflow-hidden shadow-2xl">
                {track.imageUrl ? (
                  <img 
                    src={track.imageUrl} 
                    alt={track.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                    <Music className="text-4xl sm:text-6xl text-white" />
                  </div>
                )}
              </div>
            </div>

            {/* Track Info */}
            <div className="flex-1 space-y-3 relative z-10 w-full max-w-lg text-center lg:text-left">
              <div className="flex-1">
                <h1 className="text-2xl sm:text-3xl font-bold text-white drop-shadow-lg mb-2">
                  {track.title}
                </h1>
                <p className="text-white/90 text-sm drop-shadow-md mb-2">
                  {track.artist}
                </p>
                {track.description && (
                  <p className="text-white/80 drop-shadow-md text-xs mb-2">
                    {track.description}
                  </p>
                )}
              </div>

              {/* Track Metadata */}
              <div className="flex items-center gap-2 sm:gap-4 flex-wrap justify-center lg:justify-start">
                {track.album && (
                  <span className="text-white/70 text-xs">
                    Album: {track.album}
                  </span>
                )}
                {track.duration && (
                  <span className="text-white/70 text-xs">
                    {Math.floor(track.duration / 60)}:{(track.duration % 60).toString().padStart(2, '0')}
                  </span>
                )}
              </div>

              {/* Playlist Count */}
              {playlists.length > 0 && (
                <div className="text-white/60 text-xs">
                  Appears in {playlists.length} playlist{playlists.length !== 1 ? 's' : ''}
                </div>
              )}
            </div>
          </div>

          {/* Playlists Section */}
          {playlists.length > 0 && (
            <div className="bg-black/30 border border-white/20 backdrop-blur-xl rounded-lg shadow-lg p-4 mb-6">
              <h3 className="text-white font-semibold mb-3">Found in Playlists</h3>
              <div className="space-y-2">
                {playlists.map((playlist) => (
                  <div 
                    key={playlist.identifier}
                    className="flex items-center gap-3 p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Music className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-white text-sm font-medium">{playlist.title}</p>
                      {playlist.description && (
                        <p className="text-white/60 text-xs">{playlist.description}</p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => navigate(`/release/${playlist.authorPubkey}/${playlist.identifier}`)}
                      className="text-white/70 hover:text-white text-xs"
                    >
                      View
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Track Details */}
          <div className="bg-black/30 border border-white/20 backdrop-blur-xl rounded-lg shadow-lg p-4 mb-6">
            <h3 className="text-white font-semibold mb-3">Track Details</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-white/60">Artist:</span>
                <span className="text-white">{track.artist}</span>
              </div>
              {track.album && (
                <div className="flex justify-between">
                  <span className="text-white/60">Album:</span>
                  <span className="text-white">{track.album}</span>
                </div>
              )}
              {track.releaseDate && (
                <div className="flex justify-between">
                  <span className="text-white/60">Released:</span>
                  <span className="text-white">{track.releaseDate}</span>
                </div>
              )}
              {track.genres && track.genres.length > 0 && (
                <div className="flex justify-between">
                  <span className="text-white/60">Genres:</span>
                  <span className="text-white">{track.genres.join(', ')}</span>
                </div>
              )}
              {track.format && (
                <div className="flex justify-between">
                  <span className="text-white/60">Format:</span>
                  <span className="text-white">{track.format.toUpperCase()}</span>
                </div>
              )}
              {track.bitrate && (
                <div className="flex justify-between">
                  <span className="text-white/60">Bitrate:</span>
                  <span className="text-white">{track.bitrate}</span>
                </div>
              )}
              {track.language && (
                <div className="flex justify-between">
                  <span className="text-white/60">Language:</span>
                  <span className="text-white">{track.language.toUpperCase()}</span>
                </div>
              )}
              {track.explicit && (
                <div className="flex justify-between">
                  <span className="text-white/60">Content:</span>
                  <span className="text-white">Explicit</span>
                </div>
              )}
            </div>
          </div>

          {/* Audio Player Section */}
          {track.audioUrl && (
            <div className="bg-black/30 border border-white/20 backdrop-blur-xl rounded-lg shadow-lg p-4 mb-6">
              <h3 className="text-white font-semibold mb-3">Audio Player</h3>
              <div className="bg-black/20 rounded-lg p-4">
                <audio 
                  controls 
                  className="w-full"
                  preload="metadata"
                >
                  <source src={track.audioUrl} type={`audio/${track.format || 'mp3'}`} />
                  Your browser does not support the audio element.
                </audio>
              </div>
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