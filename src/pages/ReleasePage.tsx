import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSeoMeta } from '@unhead/react';
import { ArrowLeft, Music, Zap, Heart, MessageCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { GlassTabs, GlassTabsList, GlassTabsTrigger, GlassTabsContent } from '@/components/ui/GlassTabs';
import { Layout } from '@/components/Layout';
import { BlurredBackground } from '@/components/BlurredBackground';
import { NostrNavigationError } from '@/components/NostrNavigationError';
import { MusicItemHeader } from '@/components/music/MusicItemHeader';
import { ZapLeaderboard } from '@/components/music/ZapLeaderboard';
import { CommentsSection } from '@/components/comments/CommentsSection';
import { ReactionsSection } from '@/components/music/ReactionsSection';
import { UniversalTrackList } from '@/components/music/UniversalTrackList';
import { useReleaseResolver } from '@/hooks/useEventResolver';
import { usePlaylistTrackResolution } from '@/hooks/usePlaylistTrackResolution';
import { useReleaseInteractions } from '@/hooks/useReleaseInteractions';
import { useFormatDuration } from '@/hooks/useFormatDuration';
import { useUniversalTrackPlayback } from '@/hooks/useUniversalTrackPlayback';
import { useMusicConfig } from '@/hooks/useMusicConfig';
import { eventToMusicPlaylist, playlistToRelease } from '@/lib/eventConversions';
import { MUSIC_KINDS } from '@/lib/musicConfig';
import NotFound from './NotFound';
import type { NostrEvent } from '@nostrify/nostrify';

export function ReleasePage() {
  const params = useParams<{ pubkey: string; identifier: string }>();
  const navigate = useNavigate();
  const musicConfig = useMusicConfig();
  const { formatDuration } = useFormatDuration();
  const [activeTab, setActiveTab] = useState('tracks');

  // Extract and validate URL parameters
  if (!params.pubkey || !params.identifier) {
    return <NotFound />;
  }

  const { pubkey, identifier } = params;

  // Resolve the release event
  const { data: playlistData, isLoading: isLoadingRelease, error: releaseError, refetch } = useReleaseResolver(
    pubkey,
    identifier,
    eventToMusicPlaylist
  );

  // Resolve tracks in the release
  const { data: resolvedTracks, isLoading: isLoadingTracks } = usePlaylistTrackResolution(
    playlistData?.tracks || []
  );

  // Convert playlist data to release format for compatibility with existing components
  const release = playlistData && resolvedTracks ? playlistToRelease(playlistData, new Map(
    resolvedTracks.map(rt => [
      `${rt.reference.pubkey}:${rt.reference.identifier}`,
      rt.trackData
    ]).filter(([, trackData]) => trackData !== undefined) as [string, any][]
  )) : null;

  // Use custom hook for track playback
  const trackPlayback = useUniversalTrackPlayback(release);

  // Create NostrEvent for interactions
  const releaseEvent: NostrEvent | null = playlistData ? {
    id: playlistData.eventId || `${pubkey}:${identifier}`,
    pubkey: playlistData.authorPubkey || pubkey,
    created_at: Math.floor((playlistData.createdAt?.getTime() || Date.now()) / 1000),
    kind: MUSIC_KINDS.MUSIC_PLAYLIST,
    tags: [
      ['d', playlistData.identifier || identifier],
      ['title', playlistData.title],
      ...(playlistData.description ? [['description', playlistData.description]] : []),
      ...(playlistData.imageUrl ? [['image', playlistData.imageUrl]] : []),
      ...playlistData.categories?.map(tag => ['t', tag]) || []
    ],
    content: playlistData.description || '',
    sig: ''
  } : null;

  // Use custom hook for interactions
  const {
    commentCount,
    interactionCounts,
    hasUserLiked,
    handleLike,
    handleShare
  } = useReleaseInteractions({ 
    release: release, 
    event: releaseEvent, 
    commentEvent: releaseEvent 
  });

  // Calculate total duration from resolved tracks
  const totalDuration = resolvedTracks?.reduce((sum, resolved) => {
    return sum + (resolved.trackData?.duration || 0);
  }, 0) || 0;

  const isLoading = isLoadingRelease || isLoadingTracks;

  // Update document title when release loads
  useSeoMeta({
    title: release 
      ? `${release.title} | ${release.artistName || musicConfig.music.artistName}`
      : `Release | ${musicConfig.music.artistName}`,
  });

  // Loading state
  if (isLoading) {
    return (
      <Layout>
        <div className="relative w-full max-w-full">
          {/* Blurred background skeleton */}
          <div className="absolute inset-0 bg-muted/20 animate-pulse"></div>
          
          <div className="relative py-4 w-full max-w-full overflow-hidden">
            <div className="animate-pulse">
              {/* Back Button Skeleton */}
              <div className="h-10 w-20 bg-muted rounded mb-2"></div>

              {/* Release Header Skeleton */}
              <div className="flex flex-col lg:flex-row items-center lg:items-start gap-4 mb-6">
                {/* Large Release Artwork Skeleton */}
                <div className="flex-shrink-0">
                  <div className="w-40 h-40 sm:w-48 sm:h-48 rounded-2xl bg-muted shadow-2xl"></div>
                </div>

                {/* Release Info Skeleton */}
                <div className="flex-1 space-y-3 w-full max-w-lg text-center lg:text-left">
                  <div className="flex-1 space-y-3">
                    {/* Title */}
                    <div className="h-8 bg-muted rounded w-3/4 mx-auto lg:mx-0"></div>
                    {/* Artist */}
                    <div className="h-5 bg-muted rounded w-32 mx-auto lg:mx-0"></div>
                    {/* Description */}
                    <div className="space-y-2">
                      <div className="h-3 bg-muted rounded w-full"></div>
                      <div className="h-3 bg-muted rounded w-2/3 mx-auto lg:mx-0"></div>
                    </div>
                  </div>

                  {/* Genre, Duration, Track Count Skeleton */}
                  <div className="flex items-center gap-2 sm:gap-4 flex-wrap justify-center lg:justify-start">
                    <div className="h-6 w-16 bg-muted rounded-full"></div>
                    <div className="h-4 w-20 bg-muted rounded"></div>
                    <div className="h-4 w-12 bg-muted rounded"></div>
                  </div>

                  {/* Stats Skeleton */}
                  <div className="flex items-center gap-4 justify-center lg:justify-start">
                    <div className="space-y-1">
                      <div className="h-6 w-12 bg-muted rounded"></div>
                      <div className="h-3 w-8 bg-muted rounded"></div>
                    </div>
                    <div className="h-3 w-16 bg-muted rounded"></div>
                  </div>

                  {/* Action Buttons Skeleton */}
                  <div className="flex items-center gap-2 justify-center lg:justify-start">
                    <div className="w-10 h-10 bg-muted rounded-full"></div>
                    <div className="w-10 h-10 bg-muted rounded-full"></div>
                    <div className="w-10 h-10 bg-muted rounded-full"></div>
                    <div className="w-10 h-10 bg-muted rounded-full"></div>
                  </div>
                </div>
              </div>

              {/* Tabs Skeleton */}
              <div className="w-full max-w-full mb-6">
                <div className="flex gap-2 justify-center lg:justify-start mb-4 flex-wrap">
                  <div className="h-10 bg-muted rounded-full w-20"></div>
                  <div className="h-10 bg-muted rounded-full w-16"></div>
                  <div className="h-10 bg-muted rounded-full w-18"></div>
                  <div className="h-10 bg-muted rounded-full w-24"></div>
                </div>

                {/* Content Area Skeleton */}
                <div className="bg-muted/30 border border-muted-foreground/20 backdrop-blur-xl rounded-lg shadow-lg p-3 sm:p-4">
                  {/* Track list skeleton */}
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/20">
                        {/* Track number */}
                        <div className="w-6 h-6 bg-muted rounded flex-shrink-0"></div>
                        {/* Track artwork */}
                        <div className="w-12 h-12 bg-muted rounded-lg flex-shrink-0"></div>
                        {/* Track info */}
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-muted rounded w-3/4"></div>
                          <div className="h-3 bg-muted rounded w-1/2"></div>
                        </div>
                        {/* Duration */}
                        <div className="w-12 h-4 bg-muted rounded flex-shrink-0"></div>
                        {/* Play button */}
                        <div className="w-8 h-8 bg-muted rounded-full flex-shrink-0"></div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // Error state
  if (releaseError || !release) {
    const getErrorType = (): 'not_found' | 'network_error' | 'timeout' => {
      if (!releaseError) return 'not_found';
      if (releaseError.includes('timeout') || releaseError.includes('AbortError')) return 'timeout';
      if (releaseError.includes('network') || releaseError.includes('fetch')) return 'network_error';
      return 'not_found';
    };

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

            <NostrNavigationError
              type={getErrorType()}
              title="Release Not Found"
              message={releaseError || "This release doesn't exist or hasn't been published yet."}
              onRetry={refetch}
              showBackButton={false}
            />
          </div>
        </div>
      </Layout>
    );
  }

  // Success state - release loaded
  return (
    <Layout>
      <div className="relative w-full max-w-full">
        <BlurredBackground image={release.imageUrl} />
        
        <div className="relative py-4 w-full max-w-full overflow-hidden">
          {/* Back Button */}
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-2 text-white/70 hover:text-white">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>

          {/* Release Header */}
          <MusicItemHeader
            title={release.title}
            artistPubkey={release.artistPubkey}
            artistName={musicConfig.music.artistName}
            description={release.description}
            imageUrl={release.imageUrl}
            genres={release.tags}
            metadata={[
              ...(release.tracks && release.tracks.length > 0 ? [{
                icon: <Music className="w-3 h-3" />,
                text: `${release.tracks.length} track${release.tracks.length !== 1 ? 's' : ''}`
              }] : []),
              ...(totalDuration > 0 ? [{
                text: formatDuration(totalDuration)
              }] : [])
            ]}
            stats={{
              sats: interactionCounts?.totalSats || 0,
              zaps: interactionCounts?.zaps || 0
            }}
            playback={trackPlayback?.hasPlayableTracks ? {
              isPlaying: trackPlayback.isReleasePlaying,
              isLoading: trackPlayback.isReleaseLoading,
              hasPlayableTracks: trackPlayback.hasPlayableTracks,
              onPlay: trackPlayback.handleReleasePlay
            } : undefined}
            interactions={releaseEvent ? {
              event: releaseEvent,
              hasUserLiked: hasUserLiked,
              onLike: handleLike,
              onShare: handleShare
            } : undefined}
          />

          {/* Tab Pills - Moved outside the flex container */}
          <div className="w-full max-w-full">
            <GlassTabs defaultValue="tracks" value={activeTab} onValueChange={setActiveTab} className="w-full max-w-full">
              <GlassTabsList className="flex-wrap justify-center lg:justify-start">
                <GlassTabsTrigger 
                  value="tracks"
                  icon={<Music className="w-3 h-3" />}
                  count={release.tracks?.length || 0}
                  className="text-xs sm:text-sm px-3 sm:px-4"
                >
                  Tracks
                </GlassTabsTrigger>
                <GlassTabsTrigger 
                  value="zappers"
                  icon={<Zap className="w-3 h-3" />}
                  count={interactionCounts?.zaps || 0}
                  className="text-xs sm:text-sm px-3 sm:px-4"
                >
                  Zaps
                </GlassTabsTrigger>
                <GlassTabsTrigger 
                  value="reactions"
                  icon={<Heart className="w-3 h-3" />}
                  count={interactionCounts?.likes || 0}
                  className="text-xs sm:text-sm px-3 sm:px-4"
                >
                  Likes
                </GlassTabsTrigger>
                <GlassTabsTrigger 
                  value="comments"
                  icon={<MessageCircle className="w-3 h-3" />}
                  count={commentCount}
                  className="text-xs sm:text-sm px-3 sm:px-4"
                >
                  Comments
                </GlassTabsTrigger>
              </GlassTabsList>

              <GlassTabsContent value="tracks" className="w-full max-w-full">
                <div className="bg-black/30 border border-white/20 backdrop-blur-xl rounded-lg shadow-lg p-3 sm:p-4 w-full max-w-full overflow-hidden">
                  <UniversalTrackList release={release} className="text-white" />
                </div>
              </GlassTabsContent>

              <GlassTabsContent value="zappers" className="w-full max-w-full">
                <div className="bg-black/30 border border-white/20 backdrop-blur-xl rounded-lg shadow-lg p-3 sm:p-4 w-full max-w-full overflow-hidden">
                  <ZapLeaderboard 
                    eventId={release?.eventId || playlistData?.eventId || ''}
                    showTitle={false}
                    className="text-white"
                    limit={10}
                  />
                </div>
              </GlassTabsContent>

              <GlassTabsContent value="comments" className="w-full max-w-full">
                <div className="bg-black/30 border border-white/20 backdrop-blur-xl rounded-lg shadow-lg w-full max-w-full overflow-hidden">
                  {releaseEvent && (
                    <CommentsSection
                      root={releaseEvent}
                      title=""
                      emptyStateMessage="No comments yet"
                      emptyStateSubtitle="Be the first to share your thoughts!"
                      className="bg-transparent border-none"
                    />
                  )}
                  {!releaseEvent && (
                    <div className="p-6 text-center text-white/70">
                      <MessageCircle className="w-12 h-12 mx-auto mb-4 text-white/30" />
                      <p>Comments unavailable</p>
                    </div>
                  )}
                </div>
              </GlassTabsContent>

              <GlassTabsContent value="reactions" className="w-full max-w-full">
                <div className="bg-black/30 border border-white/20 backdrop-blur-xl rounded-lg shadow-lg p-3 sm:p-4 w-full max-w-full overflow-hidden">
                  <div className="w-full max-w-full overflow-hidden">
                    <ReactionsSection 
                      eventId={release?.eventId || playlistData?.eventId || ''}
                      className="text-white w-full max-w-full overflow-hidden"
                    />
                  </div>
                </div>
              </GlassTabsContent>
            </GlassTabs>
          </div>
        </div>
      </div>
    </Layout>
  );
}