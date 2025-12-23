import { useState, useMemo } from 'react';
import { useSeoMeta } from '@unhead/react';
import { ArrowLeft, Play, Edit, Heart, Share, MessageCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ZapLeaderboard } from './ZapLeaderboard';
import { CommentsSection } from '@/components/comments/CommentsSection';
import { Layout } from '@/components/Layout';
import { Link, useNavigate } from 'react-router-dom';
import { useNostr } from '@nostrify/react';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import { usePodcastConfig } from '@/hooks/usePodcastConfig';
import { usePodcastRelease } from '@/hooks/usePodcastReleases';
import { 
  validateMusicTrack, 
  validateMusicPlaylist, 
  eventToMusicTrack, 
  eventToMusicPlaylist, 
  playlistToRelease, 
  trackToRelease,
  eventToPodcastRelease
} from '@/lib/eventConversions';
import { usePlaylistTrackResolution } from '@/hooks/usePlaylistTrackResolution';
import { PODCAST_KINDS } from '@/lib/podcastConfig';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useToast } from '@/hooks/useToast';
import { useComments } from '@/hooks/useComments';
import { encodeReleaseAsNaddr } from '@/lib/nip19Utils';
import { extractZapAmount, validateZapEvent } from '@/lib/zapUtils';
import { cn } from '@/lib/utils';
import type { PodcastRelease, MusicTrackData } from '@/types/podcast';
import type { NostrEvent } from '@nostrify/nostrify';

interface AddressableEventParams {
  pubkey: string;
  kind: number;
  identifier: string;
}

interface ReleasePageProps {
  eventId?: string; // For note1/nevent1
  addressableEvent?: AddressableEventParams; // For naddr1
}

export function ReleasePage({ eventId, addressableEvent }: ReleasePageProps) {
  const { nostr } = useNostr();
  const navigate = useNavigate();
  const { playRelease } = useAudioPlayer();
  const podcastConfig = usePodcastConfig();
  const { user } = useCurrentUser();
  const { mutate: createEvent } = useNostrPublish();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('comments');

  // Determine the release ID for the usePodcastRelease hook
  const releaseId = eventId || addressableEvent?.identifier;

  // Try to use the existing usePodcastRelease hook first
  const { data: hookRelease, isLoading: isLoadingHook } = usePodcastRelease(releaseId || '');

  // If the hook works, use it; otherwise fall back to manual querying
  const shouldUseManualQuery = !hookRelease && !isLoadingHook && releaseId;

  // Manual query for the release event (fallback when usePodcastRelease doesn't work)
  const { data: releaseEvent, isLoading: isLoadingManual } = useQuery<NostrEvent | null>({
    queryKey: ['release-manual', eventId || `${addressableEvent?.pubkey}:${addressableEvent?.kind}:${addressableEvent?.identifier}`],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(5000)]);

      if (eventId) {
        // Query by event ID (for note1/nevent1)
        const events = await nostr.query([{
          ids: [eventId],
          limit: 1
        }], { signal });
        return events[0] || null;
      } else if (addressableEvent) {
        // Query by addressable event coordinates (for naddr1)
        const events = await nostr.query([{
          kinds: [addressableEvent.kind],
          authors: [addressableEvent.pubkey],
          '#d': [addressableEvent.identifier],
          limit: 1
        }], { signal });
        
        // If we found the addressable event, return it
        if (events.length > 0) {
          return events[0];
        }
        
        // Fallback: For legacy releases that don't have 'd' tags,
        // try to find by event ID if the identifier looks like an event ID (64 hex chars)
        if (/^[0-9a-f]{64}$/.test(addressableEvent.identifier)) {
          const legacyEvents = await nostr.query([{
            ids: [addressableEvent.identifier],
            kinds: [addressableEvent.kind],
            authors: [addressableEvent.pubkey],
            limit: 1
          }], { signal });
          return legacyEvents[0] || null;
        }
        
        return null;
      }

      return null;
    },
    staleTime: 60000, // 1 minute
    enabled: !!shouldUseManualQuery
  });

  // Convert NostrEvent to PodcastRelease format with proper track resolution
  const release: PodcastRelease | null = useMemo(() => {
    if (!releaseEvent) return null;

    // Handle new music playlist events (Kind 34139)
    if (releaseEvent.kind === PODCAST_KINDS.MUSIC_PLAYLIST && validateMusicPlaylist(releaseEvent)) {
      // For playlists, we need to resolve tracks separately
      // This will be handled by the track resolution hook below
      return null; // Will be set by the playlist resolution logic
    }

    // Handle new music track events (Kind 36787)
    if (releaseEvent.kind === PODCAST_KINDS.MUSIC_TRACK && validateMusicTrack(releaseEvent)) {
      const track = eventToMusicTrack(releaseEvent);
      return trackToRelease(track);
    }

    // Handle legacy events or other event types - try the old conversion function
    try {
      const legacyRelease = eventToPodcastRelease(releaseEvent);
      return legacyRelease;
    } catch (error) {
      console.error('ReleasePage - Legacy conversion failed:', error);
      return null;
    }
  }, [releaseEvent]);

  // For playlist events, resolve tracks and create release
  const playlistData = useMemo(() => {
    if (!releaseEvent || releaseEvent.kind !== PODCAST_KINDS.MUSIC_PLAYLIST || !validateMusicPlaylist(releaseEvent)) {
      return null;
    }
    return eventToMusicPlaylist(releaseEvent);
  }, [releaseEvent]);

  // Resolve playlist tracks if this is a playlist
  const { data: resolvedTracks, isLoading: isLoadingTracks } = usePlaylistTrackResolution(
    playlistData?.tracks || []
  );

  // Create final release object for playlists
  const playlistRelease: PodcastRelease | null = useMemo(() => {
    if (!playlistData || !resolvedTracks) {
      return null;
    }

    // Create tracks map from resolved tracks
    const tracksMap = new Map<string, MusicTrackData>();
    resolvedTracks.forEach(resolved => {
      if (resolved.trackData) {
        const key = `${resolved.trackData.artistPubkey}:${resolved.trackData.identifier}`;
        tracksMap.set(key, resolved.trackData);
      }
    });

    return playlistToRelease(playlistData, tracksMap);
  }, [playlistData, resolvedTracks]);

  // Create event object for comments (needed for CommentsSection)
  const commentEvent: NostrEvent | null = useMemo(() => {
    if (releaseEvent) {
      return releaseEvent;
    }
    
    // If we're using hookRelease, create a minimal event object for comments
    if (hookRelease && releaseId) {
      return {
        id: hookRelease.eventId,
        pubkey: hookRelease.artistPubkey,
        created_at: Math.floor(hookRelease.createdAt.getTime() / 1000),
        kind: PODCAST_KINDS.MUSIC_PLAYLIST, // Assume playlist for now
        tags: [
          ['d', hookRelease.identifier],
          ['title', hookRelease.title],
          ...(hookRelease.description ? [['description', hookRelease.description]] : []),
          ...(hookRelease.imageUrl ? [['image', hookRelease.imageUrl]] : []),
          ...hookRelease.tags.map(tag => ['t', tag])
        ],
        content: JSON.stringify(hookRelease.tracks || []),
        sig: ''
      };
    }
    
    return null;
  }, [releaseEvent, hookRelease, releaseId]);

  // Final release object (use hook result first, then manual conversion, then playlist conversion)
  const finalRelease = hookRelease || release || playlistRelease;

  // Create event object for interactions
  const event = useMemo(() => {
    if (!finalRelease) return null;
    return {
      id: finalRelease.eventId,
      kind: PODCAST_KINDS.MUSIC_PLAYLIST,
      pubkey: finalRelease.artistPubkey,
      created_at: Math.floor(finalRelease.createdAt.getTime() / 1000),
      tags: [
        ['d', finalRelease.identifier],
        ['title', finalRelease.title],
        ['t', 'playlist'],
      ],
      content: finalRelease.content || finalRelease.description || '',
      sig: ''
    } as NostrEvent;
  }, [finalRelease]);

  // Query for release comments (only when we have a valid event)
  const { data: commentsData } = useComments(
    event || commentEvent || new URL('about:blank'), // Fallback to dummy URL
    100
  );
  const commentCount = commentsData?.topLevelComments?.length || 0;

  // Query for user interactions
  const { data: userInteractions } = useQuery({
    queryKey: ['release-user-interactions', finalRelease?.eventId, user?.pubkey],
    queryFn: async () => {
      if (!user?.pubkey || !finalRelease) return { hasLiked: false };

      const interactions = await nostr.query([{
        kinds: [7],
        authors: [user.pubkey],
        '#e': [finalRelease.eventId],
        limit: 10
      }]);

      return { hasLiked: interactions.some(e => e.kind === 7) };
    },
    enabled: !!user?.pubkey && !!finalRelease,
    staleTime: 30000,
  });

  // Query for interaction counts
  const { data: interactionCounts } = useQuery({
    queryKey: ['release-interaction-counts', finalRelease?.eventId],
    queryFn: async () => {
      if (!finalRelease) return { likes: 0, zaps: 0, totalSats: 0 };

      const interactions = await nostr.query([{
        kinds: [7, 9735],
        '#e': [finalRelease.eventId],
        limit: 500
      }]);

      const likes = interactions.filter(e => e.kind === 7).length;
      const zaps = interactions.filter(e => e.kind === 9735).filter(validateZapEvent);
      const zapCount = zaps.length;
      const totalSats = zaps.reduce((total, zap) => total + extractZapAmount(zap), 0);

      return { likes, zaps: zapCount, totalSats };
    },
    enabled: !!finalRelease,
    staleTime: 60000,
  });

  // Calculate total duration
  const totalDuration = useMemo(() => {
    if (!finalRelease?.tracks) return 0;
    return finalRelease.tracks.reduce((sum, track) => sum + (track.duration || 0), 0);
  }, [finalRelease?.tracks]);

  // Action handlers
  const handleLike = async () => {
    if (!user || !finalRelease) {
      toast({
        title: "Login required",
        description: "Please log in to like.",
        variant: "destructive",
      });
      return;
    }

    if (userInteractions?.hasLiked) {
      toast({
        title: "Already liked",
        description: "You have already liked this release.",
      });
      return;
    }

    try {
      createEvent({
        kind: 7,
        content: '+',
        tags: [
          ['e', finalRelease.eventId],
          ['p', finalRelease.artistPubkey],
          ['k', '30023']
        ]
      });

      toast({
        title: "Liked!",
        description: "Your like has been published.",
      });
    } catch {
      toast({
        title: "Failed to like",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleShare = async () => {
    if (!finalRelease) return;
    
    try {
      const naddr = encodeReleaseAsNaddr(finalRelease.artistPubkey, finalRelease.identifier);
      const url = `${window.location.origin}/${naddr}`;
      await navigator.clipboard.writeText(url);
      
      toast({
        title: "Link copied!",
        description: "The release link has been copied to your clipboard.",
      });
    } catch {
      toast({
        title: "Failed to copy link",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  // Update document title when release loads
  useSeoMeta({
    title: finalRelease 
      ? `${finalRelease.title} | ${podcastConfig.podcast.artistName}`
      : `Release | ${podcastConfig.podcast.artistName}`,
  });

  const formatDuration = (seconds?: number): string => {
    if (!seconds) return '';

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  if (isLoadingHook || isLoadingManual || isLoadingTracks) {
    return (
      <Layout>
        <div className="min-h-screen">
          <div className="container mx-auto px-4 py-8">
            <div className="max-w-5xl mx-auto">
              <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6 text-white/70 hover:text-white">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>

              {/* Loading skeleton for new design */}
              <div className="flex flex-col lg:flex-row gap-8 mb-8">
                <Skeleton className="w-full lg:w-80 h-80 rounded-2xl bg-white/10" />
                <div className="flex-1 space-y-6">
                  <div className="space-y-3">
                    <Skeleton className="h-12 w-3/4 bg-white/10" />
                    <Skeleton className="h-5 w-32 bg-white/10" />
                  </div>
                  <div className="flex gap-2">
                    <Skeleton className="h-6 w-20 rounded-full bg-white/10" />
                    <Skeleton className="h-6 w-16 rounded-full bg-white/10" />
                  </div>
                  <div className="flex gap-3">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="w-12 h-12 rounded-full bg-white/10" />
                    ))}
                  </div>
                  <div className="flex gap-6">
                    <Skeleton className="h-16 w-24 rounded-lg bg-white/10" />
                    <Skeleton className="h-16 w-24 rounded-lg bg-white/10" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!finalRelease) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900">
          <div className="container mx-auto px-4 py-8">
            <div className="max-w-5xl mx-auto">
              <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6 text-white/70 hover:text-white">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>

              <div className="text-center py-16">
                <h2 className="text-2xl font-semibold mb-2 text-white">Release Not Found</h2>
                <p className="text-white/60 mb-6">
                  This release doesn't exist or hasn't been published yet.
                </p>
                <Button asChild className="bg-white/10 hover:bg-white/20 text-white border-white/20">
                  <Link to="/releases">Browse All Releases</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-5xl mx-auto">
            {/* Hero Section - Music Player Style */}
            <div className="flex flex-col lg:flex-row gap-8 mb-8">
              {/* Album Artwork */}
              <div className="relative">
                {finalRelease.imageUrl ? (
                  <img
                    src={finalRelease.imageUrl}
                    alt={finalRelease.title}
                    className="w-full lg:w-80 h-80 rounded-2xl object-cover shadow-2xl"
                  />
                ) : (
                  <div className="w-full lg:w-80 h-80 rounded-2xl bg-gradient-to-br from-purple-600/20 to-blue-600/20 shadow-2xl flex items-center justify-center">
                    <div className="text-center text-white/50">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/10 flex items-center justify-center">
                        <Play className="w-8 h-8" />
                      </div>
                      <p className="text-sm">No Cover Art</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Release Info */}
              <div className="flex-1 text-white space-y-6">
                <div>
                  <h1 className="text-4xl lg:text-5xl font-bold mb-2">
                    {finalRelease.title}
                  </h1>
                  <p className="text-xl text-white/70">
                    {podcastConfig.podcast.artistName}
                  </p>
                </div>

                {/* Genre and Duration */}
                <div className="flex items-center gap-4">
                  {finalRelease.genre && (
                    <Badge className="bg-white/10 text-white border-white/20 hover:bg-white/20">
                      {finalRelease.genre}
                    </Badge>
                  )}
                  <span className="text-white/70">
                    {formatDuration(totalDuration)}
                  </span>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-4">
                  {/* Play Button */}
                  <Button
                    size="icon"
                    onClick={() => {
                      if (finalRelease.tracks && finalRelease.tracks.length > 0) {
                        playRelease(finalRelease);
                      }
                    }}
                    className="w-12 h-12 rounded-full bg-white text-black hover:bg-white/90"
                  >
                    <Play className="w-6 h-6 ml-0.5" fill="currentColor" />
                  </Button>

                  {/* Like Button */}
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={handleLike}
                    className={cn(
                      "w-12 h-12 rounded-full bg-white/10 text-white hover:bg-white/20",
                      userInteractions?.hasLiked && "text-red-500"
                    )}
                  >
                    <Heart className={cn("w-5 h-5", userInteractions?.hasLiked && "fill-current")} />
                  </Button>

                  {/* Share Button */}
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={handleShare}
                    className="w-12 h-12 rounded-full bg-white/10 text-white hover:bg-white/20"
                  >
                    <Share className="w-5 h-5" />
                  </Button>

                </div>

                {/* Stats */}
                <div className="flex items-center gap-8">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-white">
                      {interactionCounts?.totalSats || 0} <span className="text-lg text-white/70">sats</span>
                    </div>
                    <div className="text-sm text-white/60">
                      {interactionCounts?.zaps || 0} zaps
                    </div>
                  </div>
                  
                  {(interactionCounts?.likes || 0) > 0 && (
                    <div className="text-center">
                      <div className="text-3xl font-bold text-white">
                        {interactionCounts?.likes}
                      </div>
                      <div className="text-sm text-white/60">
                        likes
                      </div>
                    </div>
                  )}
                  
                  {commentCount > 0 && (
                    <div className="text-center">
                      <div className="text-3xl font-bold text-white">
                        {commentCount}
                      </div>
                      <div className="text-sm text-white/60">
                        comments
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Tab Navigation */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="bg-white/10 border-white/20">
                <TabsTrigger 
                  value="zappers" 
                  className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/70"
                >
                  Top Zappers
                </TabsTrigger>
                <TabsTrigger 
                  value="comments" 
                  className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/70"
                >
                  Comments
                  {commentCount > 0 && (
                    <Badge className="ml-2 bg-white/20 text-white text-xs">
                      {commentCount}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger 
                  value="reactions" 
                  className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/70"
                >
                  Reactions
                  {(interactionCounts?.likes || 0) > 0 && (
                    <Badge className="ml-2 bg-white/20 text-white text-xs">
                      {interactionCounts?.likes}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="zappers" className="mt-6">
                <div className="bg-white/5 rounded-xl p-6 backdrop-blur-sm">
                  <ZapLeaderboard 
                    eventId={finalRelease.eventId}
                    showTitle={false}
                    className="text-white"
                    limit={10}
                  />
                </div>
              </TabsContent>

              <TabsContent value="comments" className="mt-6">
                <div className="bg-white/5 rounded-xl backdrop-blur-sm">
                  {event && (
                    <CommentsSection
                      root={event}
                      title=""
                      emptyStateMessage="No comments yet"
                      emptyStateSubtitle="Be the first to share your thoughts!"
                      className="bg-transparent border-none"
                    />
                  )}
                  {!event && (
                    <div className="p-6 text-center text-white/70">
                      <MessageCircle className="w-12 h-12 mx-auto mb-4 text-white/30" />
                      <p>Comments unavailable</p>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="reactions" className="mt-6">
                <div className="bg-white/5 rounded-xl p-6 backdrop-blur-sm">
                  <div className="text-center text-white/70">
                    <Heart className="w-12 h-12 mx-auto mb-4 text-white/30" />
                    <p className="text-lg font-medium text-white mb-2">
                      {interactionCounts?.likes || 0} likes
                    </p>
                    <p className="text-sm">
                      {interactionCounts?.likes === 0 
                        ? "No reactions yet" 
                        : "Thank you for the support!"
                      }
                    </p>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </Layout>
  );
}