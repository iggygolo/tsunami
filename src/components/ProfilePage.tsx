import { nip19 } from 'nostr-tools';
import { useAuthor } from '@/hooks/useAuthor';
import { useMusicTracks } from '@/hooks/useMusicTracks';
import { useMusicPlaylists } from '@/hooks/useMusicPlaylists';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useUniversalAudioPlayer, musicTrackToUniversal } from '@/contexts/UniversalAudioPlayerContext';
import { usePlaylistTrackResolution } from '@/hooks/usePlaylistTrackResolution';
import { Button } from '@/components/ui/button';
import { GlassTabs, GlassTabsList, GlassTabsTrigger, GlassTabsContent } from '@/components/ui/GlassTabs';
import { GlassListSkeleton } from '@/components/ui/GlassList';
import { Layout } from '@/components/Layout';
import { BlurredBackground } from '@/components/BlurredBackground';
import { EditProfileForm } from '@/components/EditProfileForm';
import { UniversalTrackList } from '@/components/music/UniversalTrackList';
import { GlassReleaseCard } from '@/components/music/GlassReleaseCard';
import { genUserName } from '@/lib/genUserName';
import { MUSIC_KINDS } from '@/lib/musicConfig';
import type { MusicPlaylistData } from '@/types/music';
import type { NostrEvent } from '@nostrify/nostrify';
import { 
  Edit, 
  ExternalLink, 
  Music, 
  Album,
  Users,
  Globe
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
  const { data: resolvedPlaylistTracks } = usePlaylistTrackResolution(allPlaylistTrackReferences);
  
  const isOwnProfile = currentUser?.pubkey === pubkey;
  const metadata = authorData?.metadata;
  const displayName = metadata?.name || genUserName(pubkey);
  
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
                  value="releases"
                  icon={<Album className="w-3 h-3" />}
                  count={playlists.length}
                  className="text-xs sm:text-sm px-3 sm:px-4"
                >
                  Releases
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

              <GlassTabsContent value="releases" className="w-full max-w-full">
                <div className="bg-black/30 border border-white/20 backdrop-blur-xl rounded-lg shadow-lg p-3 sm:p-4 w-full max-w-full overflow-hidden">
                  {isLoadingPlaylists ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                      {[...Array(4)].map((_, i) => (
                        <div key={i} className="rounded-xl bg-card/30 border border-border/50 backdrop-blur-xl overflow-hidden animate-pulse">
                          <div className="w-full aspect-square bg-muted" />
                          <div className="p-2 space-y-1">
                            <div className="h-3 bg-muted rounded w-3/4" />
                            <div className="h-2 bg-muted rounded w-1/2" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : playlists.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                      {playlists.map((playlist) => {
                        // Get resolved tracks for this playlist
                        const playlistTrackReferences = playlist.tracks;
                        const playlistResolvedTracks = resolvedPlaylistTracks?.filter(resolved => 
                          playlistTrackReferences.some(ref => 
                            resolved.trackData && 
                            resolved.reference.pubkey === ref.pubkey && 
                            resolved.reference.identifier === ref.identifier
                          )
                        ) || [];

                        // Convert playlist to release format for GlassReleaseCard with resolved track data
                        const releaseData = {
                          id: playlist.eventId || playlist.identifier,
                          eventId: playlist.eventId || '',
                          artistPubkey: playlist.authorPubkey || pubkey,
                          identifier: playlist.identifier,
                          title: playlist.title,
                          imageUrl: playlist.imageUrl,
                          description: playlist.description,
                          tracks: playlistTrackReferences.map((trackRef, index) => {
                            // Find the resolved track data
                            const resolvedTrack = playlistResolvedTracks.find(resolved => 
                              resolved.reference.pubkey === trackRef.pubkey && 
                              resolved.reference.identifier === trackRef.identifier
                            );

                            if (resolvedTrack?.trackData) {
                              // Use actual track data
                              return {
                                title: resolvedTrack.trackData.title,
                                audioUrl: resolvedTrack.trackData.audioUrl,
                                duration: resolvedTrack.trackData.duration || 0,
                                explicit: resolvedTrack.trackData.explicit || false,
                                language: resolvedTrack.trackData.language || null,
                                imageUrl: resolvedTrack.trackData.imageUrl,
                              };
                            } else {
                              // Create placeholder track
                              return {
                                title: trackRef.title || `Track ${index + 1}`,
                                audioUrl: '', // Empty indicates missing track
                                duration: 0,
                                explicit: false,
                                language: null,
                                imageUrl: undefined,
                              };
                            }
                          }),
                          publishDate: playlist.createdAt || new Date(),
                          createdAt: playlist.createdAt || new Date(),
                          tags: playlist.categories || [],
                          zapCount: playlist.zapCount,
                          totalSats: playlist.totalSats,
                          commentCount: playlist.commentCount,
                          repostCount: playlist.repostCount,
                        };

                        return (
                          <GlassReleaseCard
                            key={playlist.eventId || playlist.identifier}
                            release={releaseData}
                          />
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Album className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                      <h3 className="text-foreground font-medium mb-2">No releases yet</h3>
                      <p className="text-muted-foreground text-sm">
                        {isOwnProfile ? "Start creating releases to see them here." : "This artist hasn't published any releases yet."}
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