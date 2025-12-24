import { nip19 } from 'nostr-tools';
import { useAuthor } from '@/hooks/useAuthor';
import { useMusicTracks } from '@/hooks/useMusicTracks';
import { useMusicPlaylists } from '@/hooks/useMusicPlaylists';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Layout } from '@/components/Layout';
import { BlurredBackground } from '@/components/BlurredBackground';
import { EditProfileForm } from '@/components/EditProfileForm';
import { ZapDialog } from '@/components/ZapDialog';
import { RepostDialog } from '@/components/RepostDialog';
import { genUserName } from '@/lib/genUserName';
import { playlistToRelease } from '@/lib/eventConversions';
import { formatToAudioType } from '@/lib/audioUtils';
import { MUSIC_KINDS } from '@/lib/musicConfig';
import type { MusicRelease, MusicTrackData, MusicPlaylistData } from '@/types/music';
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

// Helper function to convert a single track to MusicRelease format
function trackToRelease(track: MusicTrackData): MusicRelease {
  return {
    id: track.eventId || '',
    title: track.title,
    description: track.album || track.title,
    content: track.lyrics || track.credits,
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
    }],
    ...(track.zapCount && { zapCount: track.zapCount }),
    ...(track.totalSats && { totalSats: track.totalSats }),
    ...(track.commentCount && { commentCount: track.commentCount }),
    ...(track.repostCount && { repostCount: track.repostCount }),
  };
}

export function ProfilePage({ pubkey }: ProfilePageProps) {
  const { data: authorData, isLoading: isLoadingAuthor } = useAuthor(pubkey);
  const { data: tracks = [], isLoading: isLoadingTracks } = useMusicTracks();
  const { data: playlists = [], isLoading: isLoadingPlaylists } = useMusicPlaylists();
  const { user: currentUser } = useCurrentUser();
  const { state: playerState, playRelease, pause } = useAudioPlayer();
  
  const isOwnProfile = currentUser?.pubkey === pubkey;
  const metadata = authorData?.metadata;
  const displayName = metadata?.name || genUserName(pubkey);

  // Helper function to create NostrEvent from track data
  const createTrackEvent = (track: MusicTrackData): NostrEvent => {
    return {
      id: track.eventId || '',
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
    };
  };

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

  // Helper functions for playing tracks and playlists
  const handlePlayTrack = (track: MusicTrackData) => {
    if (isTrackPlaying(track)) {
      pause();
    } else {
      const release = trackToRelease(track);
      playRelease(release, 0);
    }
  };

  const handlePlayPlaylist = (playlist: MusicPlaylistData) => {
    if (isPlaylistPlaying(playlist)) {
      pause();
    } else {
      // Create a map of available tracks for conversion
      const trackMap = new Map<string, MusicTrackData>();
      tracks.forEach(track => {
        if (track.artistPubkey && track.identifier) {
          trackMap.set(`${track.artistPubkey}:${track.identifier}`, track);
        }
      });
      
      const release = playlistToRelease(playlist, trackMap);
      playRelease(release, 0);
    }
  };

  const isTrackPlaying = (track: MusicTrackData) => {
    return playerState.isPlaying && 
           playerState.currentRelease?.eventId === track.eventId;
  };

  const isPlaylistPlaying = (playlist: MusicPlaylistData) => {
    return playerState.isPlaying && 
           playerState.currentRelease?.eventId === playlist.eventId;
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
          {/* Profile Header */}
          <div className="flex flex-col lg:flex-row items-start gap-4 mb-6">
            {/* Large Profile Image */}
            <div className="flex-shrink-0">
              <div className="w-48 h-48 rounded-2xl overflow-hidden shadow-2xl">
                {metadata?.picture ? (
                  <img 
                    src={metadata.picture} 
                    alt={displayName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                    <span className="text-6xl font-bold text-white">{displayName.charAt(0)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Profile Info */}
            <div className="flex-1 space-y-3 relative z-10 max-w-lg">
              <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                <div className="flex-1">
                  <h1 className="text-3xl font-bold text-white drop-shadow-lg mb-2">{displayName}</h1>
                  {metadata?.about && (
                    <p className="text-white/90 text-sm drop-shadow-md mb-2">{metadata.about}</p>
                  )}
                  {metadata?.nip05 && (
                    <p className="text-white/80 drop-shadow-md text-xs">@{metadata.nip05}</p>
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
              <div className="flex items-center gap-4">
                <div className="text-white">
                  <div className="text-xl font-bold drop-shadow-lg">0</div>
                  <div className="text-white/80 text-xs drop-shadow-md">sats</div>
                </div>
                <div className="text-white/60 text-xs drop-shadow-md">
                  0 zaps
                </div>
              </div>

              <div className="flex flex-wrap gap-2 text-xs text-white/80">
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

              {/* Tab Pills */}
              <div className="flex gap-2">
                <Tabs defaultValue="tracks" className="w-full">
                  <TabsList className="bg-transparent p-0 h-auto gap-2">
                    <TabsTrigger 
                      value="tracks" 
                      className="bg-black/30 border border-white/20 text-white/80 data-[state=active]:text-white data-[state=active]:bg-white/15 hover:text-white transition-all duration-200 rounded-full px-4 py-1.5 backdrop-blur-xl shadow-lg text-sm"
                    >
                      <Music className="w-3 h-3 mr-1.5" />
                      Tracks
                      <span className="ml-1.5 bg-white/20 px-1.5 py-0.5 rounded-full text-xs">{tracks.length}</span>
                    </TabsTrigger>
                    <TabsTrigger 
                      value="playlists" 
                      className="bg-black/30 border border-white/20 text-white/80 data-[state=active]:text-white data-[state=active]:bg-white/15 hover:text-white transition-all duration-200 rounded-full px-4 py-1.5 backdrop-blur-xl shadow-lg text-sm"
                    >
                      <ListMusic className="w-3 h-3 mr-1.5" />
                      Playlists
                      <span className="ml-1.5 bg-white/20 px-1.5 py-0.5 rounded-full text-xs">{playlists.length}</span>
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="tracks" className="mt-4">
                    {isLoadingTracks ? (
                      <div className="space-y-2 max-w-2xl">
                        {[...Array(3)].map((_, i) => (
                          <div key={i} className="flex items-center gap-3 p-3 bg-black/30 border border-white/20 backdrop-blur-xl rounded-lg shadow-lg animate-pulse">
                            <div className="w-10 h-10 bg-white/15 rounded-lg"></div>
                            <div className="flex-1 space-y-2">
                              <div className="h-3 bg-white/15 rounded w-1/3"></div>
                              <div className="h-2 bg-white/15 rounded w-1/4"></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : tracks.length > 0 ? (
                      <div className="space-y-2 max-w-2xl">
                        {tracks.map((track) => (
                          <div key={track.eventId} className="flex items-center gap-3 p-3 bg-black/30 border border-white/20 backdrop-blur-xl rounded-lg hover:bg-black/40 hover:border-white/30 transition-all duration-200 shadow-lg group">
                            <div className="w-10 h-10 rounded-lg overflow-hidden bg-white/10 flex-shrink-0">
                              {track.imageUrl ? (
                                <img src={track.imageUrl} alt={track.title} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Music className="w-4 h-4 text-white/50" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-white font-medium truncate text-sm">{track.title}</h3>
                              <p className="text-white/70 text-xs truncate">{track.artist}</p>
                            </div>
                            <div className="flex items-center gap-1">
                              <ZapDialog target={createTrackEvent(track)}>
                                <Button size="sm" variant="ghost" className="text-white/70 hover:text-yellow-400 p-1.5 rounded-full">
                                  <Zap className="w-3 h-3" />
                                </Button>
                              </ZapDialog>
                              <RepostDialog 
                                target={createTrackEvent(track)} 
                                item={track} 
                                type="track"
                              >
                                <Button size="sm" variant="ghost" className="text-white/70 hover:text-green-400 p-1.5 rounded-full">
                                  <Repeat2 className="w-3 h-3" />
                                </Button>
                              </RepostDialog>
                              <Button 
                                size="sm" 
                                onClick={() => handlePlayTrack(track)}
                                className="bg-white text-black hover:bg-white/90 rounded-full w-8 h-8 p-0"
                              >
                                {isTrackPlaying(track) ? (
                                  <Pause className="w-3 h-3" />
                                ) : (
                                  <Play className="w-3 h-3 ml-0.5" />
                                )}
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6 bg-black/30 border border-white/20 backdrop-blur-xl rounded-lg shadow-lg max-w-2xl">
                        <Music className="w-6 h-6 text-white/60 mx-auto mb-2" />
                        <h3 className="text-sm font-medium mb-1 text-white">No tracks yet</h3>
                        <p className="text-white/80 text-xs">
                          {isOwnProfile ? "Start creating music to see your tracks here." : "This artist hasn't published any tracks yet."}
                        </p>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="playlists" className="mt-4">
                    {isLoadingPlaylists ? (
                      <div className="space-y-2 max-w-2xl">
                        {[...Array(2)].map((_, i) => (
                          <div key={i} className="flex items-center gap-3 p-3 bg-black/30 border border-white/20 backdrop-blur-xl rounded-lg shadow-lg animate-pulse">
                            <div className="w-10 h-10 bg-white/15 rounded-lg"></div>
                            <div className="flex-1 space-y-2">
                              <div className="h-3 bg-white/15 rounded w-1/3"></div>
                              <div className="h-2 bg-white/15 rounded w-1/4"></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : playlists.length > 0 ? (
                      <div className="space-y-2 max-w-2xl">
                        {playlists.map((playlist) => (
                          <div key={playlist.eventId} className="flex items-center gap-3 p-3 bg-black/30 border border-white/20 backdrop-blur-xl rounded-lg hover:bg-black/40 hover:border-white/30 transition-all duration-200 shadow-lg group">
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
                              <p className="text-white/70 text-xs truncate">{playlist.tracks.length} tracks</p>
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
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6 bg-black/30 border border-white/20 backdrop-blur-xl rounded-lg shadow-lg max-w-2xl">
                        <ListMusic className="w-6 h-6 text-white/60 mx-auto mb-2" />
                        <h3 className="text-sm font-medium mb-1 text-white">No playlists yet</h3>
                        <p className="text-white/80 text-xs">
                          {isOwnProfile ? "Create your first playlist to see it here." : "This artist hasn't created any playlists yet."}
                        </p>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}