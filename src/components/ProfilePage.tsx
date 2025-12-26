import { nip19 } from 'nostr-tools';
import { useAuthor } from '@/hooks/useAuthor';
import { useMusicTracks } from '@/hooks/useMusicTracks';
import { useMusicPlaylists } from '@/hooks/useMusicPlaylists';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { usePlaylistTrackResolution } from '@/hooks/usePlaylistTrackResolution';
import { useToast } from '@/hooks/useToast';
import { Button } from '@/components/ui/button';
import { GlassTabs, GlassTabsList, GlassTabsTrigger, GlassTabsContent } from '@/components/ui/GlassTabs';
import { GlassListSkeleton } from '@/components/ui/GlassList';
import { Layout } from '@/components/Layout';
import { BlurredBackground } from '@/components/BlurredBackground';
import { EditProfileForm } from '@/components/EditProfileForm';
import { UniversalTrackList } from '@/components/music/UniversalTrackList';
import { GlassReleaseCard } from '@/components/music/GlassReleaseCard';
import { ZapDialog } from '@/components/ZapDialog';
import { updateArtistCache } from '@/lib/artistUtils';
import { genUserName } from '@/lib/genUserName';
import { 
  Edit, 
  ExternalLink, 
  Music, 
  Album,
  Globe,
  Zap,
  Hash,
  Rss,
  Share2
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
  const { data: playlists = [], isLoading: isLoadingPlaylists } = useMusicPlaylists({ artistPubkey: pubkey });
  const { user: currentUser } = useCurrentUser();
  const { toast } = useToast();
  
  // Get all track references from all playlists for batch resolution
  const allPlaylistTrackReferences = playlists?.flatMap(playlist => playlist.tracks) || [];
  
  // Resolve all track references at once for better performance
  const { data: resolvedPlaylistTracks } = usePlaylistTrackResolution(allPlaylistTrackReferences);
  
  const isOwnProfile = currentUser?.pubkey === pubkey;
  const metadata = authorData?.metadata;
  const displayName = metadata?.name || genUserName(pubkey);
  
  // Update artist cache when profile data is loaded
  if (metadata && !isLoadingAuthor) {
    updateArtistCache(pubkey, metadata);
  }
  
  // Filter tracks to only show content from this specific artist
  // Playlists are already filtered by artistPubkey in the hook
  const artistTracks = tracks.filter(track => track.artistPubkey === pubkey);
  const artistPlaylists = playlists; // Already filtered by artistPubkey in useMusicPlaylists
  
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
            <div className="flex-1 space-y-4 relative z-10 w-full max-w-lg text-center lg:text-left">
              <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                <div className="flex-1">
                  <h1 className="text-2xl sm:text-3xl font-bold text-white drop-shadow-lg mb-2">{displayName}</h1>
                  {metadata?.about && (
                    <p className="text-white/90 text-sm drop-shadow-md mb-2 leading-relaxed">{metadata.about}</p>
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

              {/* Social Buttons */}
              <div className="flex flex-row gap-3">
                  <div className="flex justify-center">
                    {!isOwnProfile && authorData?.event && currentUser && (authorData.metadata?.lud16 || authorData.metadata?.lud06) ? (
                      <ZapDialog target={authorData.event}>
                        <Button className="w-12 h-12 rounded-full bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 border border-yellow-500/30 backdrop-blur-sm">
                          <Zap className="w-5 h-5" />
                        </Button>
                      </ZapDialog>
                    ) : (
                      <Button className="w-12 h-12 rounded-full bg-white/5 hover:bg-white/10 text-white/50 border border-white/10 backdrop-blur-sm" disabled>
                        <Zap className="w-5 h-5" />
                      </Button>
                    )}
                  </div>
                  <div className="flex justify-center">
                    <Button className="w-12 h-12 rounded-full bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 border border-orange-500/30 backdrop-blur-sm" asChild>
                      <a href="/rss.xml" target="_blank" rel="noopener noreferrer">
                        <Rss className="w-5 h-5" />
                      </a>
                    </Button>
                  </div>
                  <div className="flex justify-center">
                    <Button 
                      className="w-12 h-12 rounded-full bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/30 backdrop-blur-sm"
                      onClick={async () => {
                        const profileUrl = window.location.href;
                        try {
                          if (navigator.share) {
                            await navigator.share({
                              title: `${displayName} on Nostr`,
                              url: profileUrl
                            });
                          } else {
                            await navigator.clipboard.writeText(profileUrl);
                            toast({
                              title: "Link copied!",
                              description: "Profile link has been copied to clipboard.",
                            });
                          }
                        } catch (error) {
                          // Fallback if clipboard API fails
                          toast({
                            title: "Copy failed",
                            description: "Unable to copy link to clipboard.",
                            variant: "destructive",
                          });
                        }
                      }}
                    >
                      <Share2 className="w-5 h-5" />
                    </Button>
                  </div>
                </div>

              {/* Social Links */}
              <div className="flex flex-wrap gap-4 justify-center lg:justify-start text-sm">
                {metadata?.website && (
                  <a 
                    href={metadata.website} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-white/80 hover:text-white transition-colors drop-shadow-md"
                  >
                    <Globe className="w-4 h-4" />
                    Website
                    <ExternalLink className="w-3 h-3 opacity-30" />
                  </a>
                )}
                
                <a 
                  href={`https://njump.me/${nip19.npubEncode(pubkey)}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-white/80 hover:text-white transition-colors drop-shadow-md"
                >
                  <Hash className="w-4 h-4" />
                  {nip19.npubEncode(pubkey).slice(0, 12)}...
                  <ExternalLink className="w-3 h-3 opacity-30" />
                </a>
              </div>
            </div>
          </div>

          {/* Enhanced Profile Information Section */}
          <div className="mb-8">
            {/* This section is now integrated into the stats row above */}
          </div>

          {/* Tab Pills - Moved outside the header area */}
          <div className="w-full max-w-full">
            <GlassTabs defaultValue="tracks" className="w-full max-w-full">
              <GlassTabsList className="flex-wrap justify-center lg:justify-start">
                <GlassTabsTrigger 
                  value="tracks"
                  icon={<Music className="w-3 h-3" />}
                  count={artistTracks.length}
                  className="text-xs sm:text-sm px-3 sm:px-4"
                >
                  Tracks
                </GlassTabsTrigger>
                <GlassTabsTrigger 
                  value="releases"
                  icon={<Album className="w-3 h-3" />}
                  count={artistPlaylists.length}
                  className="text-xs sm:text-sm px-3 sm:px-4"
                >
                  Releases
                </GlassTabsTrigger>
              </GlassTabsList>

              <GlassTabsContent value="tracks" className="w-full max-w-full">
                <div className="bg-black/30 border border-white/20 backdrop-blur-xl rounded-lg shadow-lg p-3 sm:p-4 w-full max-w-full overflow-hidden">
                  {isLoadingTracks ? (
                    <GlassListSkeleton count={3} />
                  ) : artistTracks.length > 0 ? (
                    <UniversalTrackList 
                      tracks={artistTracks}
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
                  ) : artistPlaylists.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                      {artistPlaylists.map((playlist) => {
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
                          // Add artist information for multi-artist support
                          artistName: metadata?.name,
                          artistImage: metadata?.picture,
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