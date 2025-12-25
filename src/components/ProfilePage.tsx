import { nip19 } from 'nostr-tools';
import { useAuthor } from '@/hooks/useAuthor';
import { useMusicTracks } from '@/hooks/useMusicTracks';
import { useMusicPlaylists } from '@/hooks/useMusicPlaylists';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useUniversalAudioPlayer, musicTrackToUniversal } from '@/contexts/UniversalAudioPlayerContext';
import { usePlaylistTrackResolution } from '@/hooks/usePlaylistTrackResolution';
import { Button } from '@/components/ui/button';
import { GlassTabs, GlassTabsList, GlassTabsTrigger, GlassTabsContent } from '@/components/ui/GlassTabs';
import { GlassList, GlassListItem, GlassListSkeleton } from '@/components/ui/GlassList';
import { Layout } from '@/components/Layout';
import { BlurredBackground } from '@/components/BlurredBackground';
import { EditProfileForm } from '@/components/EditProfileForm';
import { ZapDialog } from '@/components/ZapDialog';
import { RepostDialog } from '@/components/RepostDialog';
import { UniversalTrackList } from '@/components/music/UniversalTrackList';
import { genUserName } from '@/lib/genUserName';
import { MUSIC_KINDS } from '@/lib/musicConfig';
import type { MusicPlaylistData } from '@/types/music';
import type { NostrEvent } from '@nostrify/nostrify';
import { 
  Edit, 
  ExternalLink, 
  Music, 
  ListMusic,
  Users,
  Globe,
  Play,
  Pause,
  Zap,
  Repeat2
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface ProfilePageProps {
  pubkey: string;
}

export function ProfilePage({ pubkey }: ProfilePageProps) {
  const { data: authorData, isLoading: isLoadingAuthor } = useAuthor(pubkey);
  const { data: tracks = [], isLoading: isLoadingTracks } = useMusicTracks();
  const { data: playlists = [], isLoading: isLoadingPlaylists } = useMusicPlaylists();
  const { user: currentUser } = useCurrentUser();
  const { state: playerState, pause, playQueue } = useUniversalAudioPlayer();
  
  // Get all track references from all playlists for batch resolution
  const allPlaylistTrackReferences = playlists?.flatMap(playlist => playlist.tracks) || [];
  
  // Resolve all track references at once for better performance
  const { data: resolvedPlaylistTracks, isLoading: isLoadingPlaylistTracks } = usePlaylistTrackResolution(allPlaylistTrackReferences);
  
  const isOwnProfile = currentUser?.pubkey === pubkey;
  const metadata = authorData?.metadata;
  const displayName = metadata?.name || genUserName(pubkey);

  // Helper function to create NostrEvent from playlist data
  const createPlaylistEvent = (playlist: MusicPlaylistData): NostrEvent => {
    return {
      id: playlist.eventId || '',
      pubkey: playlist.authorPubkey || pubkey,
      created_at: Math.floor((playlist.createdAt?.getTime() || Date.now()) / 1000),
      kind: MUSIC_KINDS.MUSIC_PLAYLIST,
      tags: [
        ['d', playlist.identifier],
        ['title', playlist.title],
        ...(playlist.description ? [['description', playlist.description]] : []),
        ...(playlist.imageUrl ? [['image', playlist.imageUrl]] : []),
        ...(playlist.categories ? playlist.categories.map(cat => ['t', cat]) : []),
        ...playlist.tracks.map(track => ['a', `${track.kind}:${track.pubkey}:${track.identifier}`]),
      ],
      content: playlist.description || '',
      sig: ''
    };
  };

  // Helper function to get playable tracks for a playlist
  const getPlaylistPlayableTracks = (playlist: MusicPlaylistData) => {
    if (!resolvedPlaylistTracks) return [];
    
    return playlist.tracks.map(trackRef => {
      return resolvedPlaylistTracks.find(resolved => 
        resolved.reference.pubkey === trackRef.pubkey && 
        resolved.reference.identifier === trackRef.identifier
      );
    }).filter(rt => rt?.trackData && rt.trackData.audioUrl)
      .map(rt => rt!.trackData!);
  };

  const handlePlayPlaylist = (playlist: MusicPlaylistData) => {
    if (isPlaylistPlaying(playlist)) {
      pause();
    } else {
      // Get playable tracks
      const playableTracks = getPlaylistPlayableTracks(playlist);
      
      if (playableTracks.length === 0) {
        console.log('No playable tracks found in playlist:', playlist.title);
        return;
      }

      // Convert tracks to universal format and play
      const universalTracks = playableTracks.map(track => 
        musicTrackToUniversal(track, {
          type: 'playlist',
          releaseId: playlist.eventId,
          releaseTitle: playlist.title,
          artistPubkey: playlist.authorPubkey
        })
      );

      // Play the playlist queue
      playQueue(universalTracks, 0, playlist.title);
    }
  };

  const isPlaylistPlaying = (playlist: MusicPlaylistData) => {
    return playerState.currentTrack?.source?.releaseId === playlist.eventId && playerState.isPlaying;
  };
  
  if (isLoadingAuthor) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-48 bg-muted rounded-lg mb-8"></div>
            <div className="flex items-start gap-6">
              <div className="w-32 h-32 bg-muted rounded-full"></div>
              <div className="flex-1 space-y-4">
                <div className="h-8 bg-muted rounded w-1/3"></div>
                <div className="h-4 bg-muted rounded w-2/3"></div>
                <div className="h-4 bg-muted rounded w-1/2"></div>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="relative -mx-4 px-4">
        <BlurredBackground image={metadata?.banner || metadata?.picture} />
        
        <div className="relative py-8">
          {/* Profile Header - Release Page Style */}
          <div className="flex flex-col lg:flex-row items-center lg:items-start gap-4 mb-6">
            {/* Large Profile Image */}
            <div className="flex-shrink-0">
              <div className="w-40 h-40 sm:w-48 sm:h-48 rounded-2xl overflow-hidden shadow-2xl">
                {metadata?.picture ? (
                  <img 
                    src={metadata.picture} 
                    alt={displayName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                    <span className="text-4xl sm:text-6xl font-bold text-white">{displayName.charAt(0)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Profile Info */}
            <div className="flex-1 space-y-3 relative z-10 w-full max-w-lg text-center lg:text-left">
              <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                <div className="flex-1">
                  <h1 className="text-2xl sm:text-3xl font-bold text-white drop-shadow-lg mb-2">{displayName}</h1>
                  {metadata?.about && (
                    <p className="text-white/90 text-sm drop-shadow-md mb-2">{metadata.about}</p>
                  )}
                  {metadata?.nip05 && (
                    <p className="text-white/80 drop-shadow-md text-xs mb-2">@{metadata.nip05}</p>
                  )}
                </div>
                
                {isOwnProfile && (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        className="flex items-center gap-2 bg-black/30 border-white/20 text-white backdrop-blur-xl hover:bg-black/40 hover:border-white/30 transition-all duration-200 shadow-lg px-4 py-2 rounded-full text-sm"
                      >
                        <Edit className="w-4 h-4" />
                        Edit Profile
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Edit Profile</DialogTitle>
                        <DialogDescription>
                          Update your profile information and settings.
                        </DialogDescription>
                      </DialogHeader>
                      <EditProfileForm />
                    </DialogContent>
                  </Dialog>
                )}
              </div>

              {/* Stats */}
              <div className="flex items-center gap-4 justify-center lg:justify-start">
                <div className="text-white">
                  <div className="text-xl font-bold drop-shadow-lg">0</div>
                  <div className="text-white/80 text-xs drop-shadow-md">sats</div>
                </div>
                <div className="text-white/60 text-xs drop-shadow-md">
                  0 zaps
                </div>
              </div>

              {/* Links */}
              <div className="flex flex-wrap gap-2 text-xs text-white/80 justify-center lg:justify-start">
                {metadata?.website && (
                  <a 
                    href={metadata.website} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 hover:text-white transition-colors drop-shadow-md"
                  >
                    <Globe className="w-3 h-3" />
                    Website
                    <ExternalLink className="w-2 h-2" />
                  </a>
                )}
                
                <div className="flex items-center gap-1 drop-shadow-md">
                  <Users className="w-3 h-3" />
                  {nip19.npubEncode(pubkey).slice(0, 12)}...
                </div>
              </div>
            </div>
          </div>

          {/* Tab Pills - Moved outside the header area */}
          <div className="w-full max-w-full">
            <GlassTabs defaultValue="tracks" className="w-full max-w-full">
              <GlassTabsList className="flex-wrap justify-center lg:justify-start">
                <GlassTabsTrigger 
                  value="tracks"
                  icon={<Music className="w-3 h-3" />}
                  count={tracks.length}
                  className="text-xs sm:text-sm px-3 sm:px-4"
                >
                  Tracks
                </GlassTabsTrigger>
                <GlassTabsTrigger 
                  value="playlists"
                  icon={<ListMusic className="w-3 h-3" />}
                  count={playlists.length}
                  className="text-xs sm:text-sm px-3 sm:px-4"
                >
                  Playlists
                </GlassTabsTrigger>
              </GlassTabsList>

              <GlassTabsContent value="tracks" className="w-full max-w-full">
                <div className="bg-black/30 border border-white/20 backdrop-blur-xl rounded-lg shadow-lg p-3 sm:p-4 w-full max-w-full overflow-hidden">
                  {isLoadingTracks ? (
                    <GlassListSkeleton count={3} />
                  ) : tracks.length > 0 ? (
                    <UniversalTrackList 
                      tracks={tracks}
                      className="text-white"
                      showTrackNumbers={true}
                    />
                  ) : (
                    <div className="text-center py-8">
                      <Music className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                      <h3 className="text-foreground font-medium mb-2">No tracks yet</h3>
                      <p className="text-muted-foreground text-sm">
                        {isOwnProfile ? "Start creating music to see your tracks here." : "This artist hasn't published any tracks yet."}
                      </p>
                    </div>
                  )}
                </div>
              </GlassTabsContent>

              <GlassTabsContent value="playlists" className="w-full max-w-full">
                <div className="bg-black/30 border border-white/20 backdrop-blur-xl rounded-lg shadow-lg p-3 sm:p-4 w-full max-w-full overflow-hidden">
                  {isLoadingPlaylists ? (
                    <GlassListSkeleton count={2} />
                  ) : playlists.length > 0 ? (
                    <GlassList>
                      {playlists.map((playlist) => (
                        <GlassListItem key={playlist.eventId}>
                          <div className="w-10 h-10 rounded-lg overflow-hidden bg-white/10 flex-shrink-0">
                            {playlist.imageUrl ? (
                              <img src={playlist.imageUrl} alt={playlist.title} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <ListMusic className="w-4 h-4 text-white/50" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-white font-medium truncate text-sm">{playlist.title}</h3>
                            <p className="text-white/70 text-xs truncate">
                              {playlist.tracks.length} tracks
                              {!isLoadingPlaylistTracks && resolvedPlaylistTracks && (
                                <> • {getPlaylistPlayableTracks(playlist).length} playable</>
                              )}
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            <ZapDialog target={createPlaylistEvent(playlist)}>
                              <Button size="sm" variant="ghost" className="text-white/70 hover:text-yellow-400 p-1.5 rounded-full">
                                <Zap className="w-3 h-3" />
                              </Button>
                            </ZapDialog>
                            <RepostDialog 
                              target={createPlaylistEvent(playlist)} 
                              item={playlist} 
                              type="playlist"
                            >
                              <Button size="sm" variant="ghost" className="text-white/70 hover:text-green-400 p-1.5 rounded-full">
                                <Repeat2 className="w-3 h-3" />
                              </Button>
                            </RepostDialog>
                            <Button 
                              size="sm" 
                              onClick={() => handlePlayPlaylist(playlist)}
                              className="bg-white text-black hover:bg-white/90 rounded-full w-8 h-8 p-0"
                            >
                              {isPlaylistPlaying(playlist) ? (
                                <Pause className="w-3 h-3" />
                              ) : (
                                <Play className="w-3 h-3 ml-0.5" />
                              )}
                            </Button>
                          </div>
                        </GlassListItem>
                      ))}
                    </GlassList>
                  ) : (
                    <div className="text-center py-8">
                      <ListMusic className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                      <h3 className="text-foreground font-medium mb-2">No playlists yet</h3>
                      <p className="text-muted-foreground text-sm">
                        {isOwnProfile ? "Create your first playlist to see it here." : "This artist hasn't created any playlists yet."}
                      </p>
                    </div>
                  )}
                </div>
              </GlassTabsContent>
            </GlassTabs>
          </div>
        </div>
      </div>
    </Layout>
  );
}