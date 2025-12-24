import { useState } from 'react';
import { useSeoMeta } from '@unhead/react';
import { ArrowLeft, Play, Pause, Heart, Share, MessageCircle, Music, Zap, ListMusic, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { GlassTabs, GlassTabsList, GlassTabsTrigger, GlassTabsContent } from '@/components/ui/GlassTabs';
import { ZapLeaderboard } from './ZapLeaderboard';
import { ZapDialog } from '@/components/ZapDialog';
import { CommentsSection } from '@/components/comments/CommentsSection';
import { ReactionsSection } from './ReactionsSection';
import { TrackList } from './TrackList';
import { Layout } from '@/components/Layout';
import { BlurredBackground } from '@/components/BlurredBackground';
import { Link, useNavigate } from 'react-router-dom';
import { useMusicConfig } from '@/hooks/useMusicConfig';
import { useReleaseData } from '@/hooks/useReleaseData';
import { useReleaseInteractions } from '@/hooks/useReleaseInteractions';
import { useFormatDuration } from '@/hooks/useFormatDuration';
import { useTrackPlayback } from '@/hooks/useTrackPlayback';
import { MUSIC_KINDS } from '@/lib/musicConfig';
import { cn } from '@/lib/utils';
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
  const navigate = useNavigate();
  const podcastConfig = useMusicConfig();
  const { formatDuration } = useFormatDuration();
  const [activeTab, setActiveTab] = useState('tracks');

  // Use custom hook for release data
  const { 
    release, 
    event, 
    commentEvent, 
    totalDuration, 
    isLoading 
  } = useReleaseData({ eventId, addressableEvent });

  // Use custom hook for track playback
  const trackPlayback = useTrackPlayback(release);

  // Use custom hook for interactions
  const {
    commentCount,
    interactionCounts,
    hasUserLiked,
    handleLike,
    handleShare
  } = useReleaseInteractions({ 
    release: release, 
    event, 
    commentEvent 
  });

  // Create NostrEvent for zap functionality
  const releaseEvent: NostrEvent | null = release ? {
    id: release.eventId,
    pubkey: release.artistPubkey,
    created_at: Math.floor(release.createdAt.getTime() / 1000),
    kind: MUSIC_KINDS.MUSIC_PLAYLIST,
    tags: [
      ['d', release.identifier || release.eventId],
      ['title', release.title],
      ...(release.description ? [['description', release.description]] : []),
      ...(release.imageUrl ? [['image', release.imageUrl]] : []),
      ...release.tags.map(tag => ['t', tag])
    ],
    content: JSON.stringify(release.tracks),
    sig: ''
  } : null;

  // Update document title when release loads
  useSeoMeta({
    title: release 
      ? `${release.title} | ${podcastConfig.music.artistName}`
      : `Release | ${podcastConfig.music.artistName}`,
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="relative -mx-4 px-4">
          <BlurredBackground image={undefined} />
          
          <div className="relative py-8">
            <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6 text-white/70 hover:text-white">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>

            {/* Loading skeleton matching ProfilePage style */}
            <div className="flex flex-col lg:flex-row items-start gap-4 mb-6">
              <div className="flex-shrink-0">
                <Skeleton className="w-48 h-48 rounded-2xl bg-white/10" />
              </div>
              <div className="flex-1 space-y-3 relative z-10 max-w-lg">
                <div className="space-y-3">
                  <Skeleton className="h-8 w-3/4 bg-white/10" />
                  <Skeleton className="h-5 w-32 bg-white/10" />
                </div>
                <div className="flex gap-2">
                  <Skeleton className="h-6 w-20 rounded-full bg-white/10" />
                  <Skeleton className="h-6 w-16 rounded-full bg-white/10" />
                </div>
                <div className="flex gap-3">
                  {[...Array(4)].map((_, i) => (
                    <Skeleton key={i} className="w-10 h-10 rounded-full bg-white/10" />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!release) {
    return (
      <Layout>
        <div className="relative -mx-4 px-4">
          <BlurredBackground image={undefined} />
          
          <div className="relative py-8">
            <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6 text-white/70 hover:text-white">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>

            <div className="text-center py-16">
              <h2 className="text-2xl font-semibold mb-2 text-white drop-shadow-lg">Release Not Found</h2>
              <p className="text-white/60 mb-6 drop-shadow-md">
                This release doesn't exist or hasn't been published yet.
              </p>
              <Button asChild className="bg-black/30 border border-white/20 text-white backdrop-blur-xl hover:bg-black/40 hover:border-white/30 transition-all duration-200 shadow-lg">
                <Link to="/releases">Browse All Releases</Link>
              </Button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="relative -mx-4 px-4">
        <BlurredBackground image={release.imageUrl} />
        
        <div className="relative py-8">
          {/* Back Button */}
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6 text-white/70 hover:text-white">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>

          {/* Release Header - ProfilePage Style */}
          <div className="flex flex-col lg:flex-row items-start gap-4 mb-6">
            {/* Large Release Artwork */}
            <div className="flex-shrink-0">
              <div className="w-48 h-48 rounded-2xl overflow-hidden shadow-2xl relative group">
                {release.imageUrl ? (
                  <img 
                    src={release.imageUrl} 
                    alt={release.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                    <Music className="text-6xl text-white" />
                  </div>
                )}
                
                {/* Play/Pause Overlay */}
                {trackPlayback?.hasPlayableTracks && (
                  <button
                    onClick={() => trackPlayback?.handleReleasePlay()}
                    disabled={trackPlayback?.isReleaseLoading}
                    className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 disabled:cursor-not-allowed"
                  >
                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg">
                      {trackPlayback?.isReleasePlaying ? (
                        <Pause className="w-8 h-8 text-black" fill="currentColor" />
                      ) : (
                        <Play className="w-8 h-8 text-black ml-1" fill="currentColor" />
                      )}
                    </div>
                  </button>
                )}
              </div>
            </div>

            {/* Release Info */}
            <div className="flex-1 space-y-3 relative z-10 max-w-lg">
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-white drop-shadow-lg mb-2">{release.title}</h1>
                <p className="text-white/90 text-sm drop-shadow-md mb-2">{podcastConfig.music.artistName}</p>
                {release.description && (
                  <p className="text-white/80 drop-shadow-md text-xs mb-2">{release.description}</p>
                )}
              </div>

              {/* Genre, Duration, and Track Count */}
              <div className="flex items-center gap-4 flex-wrap">
                {release.genre && (
                  <Badge className="bg-white/20 text-white border-white/30 hover:bg-white/30 text-xs">
                    {release.genre}
                  </Badge>
                )}
                {release.tracks && release.tracks.length > 0 && (
                  <span className="text-white/70 flex items-center gap-1 text-xs">
                    <Music className="w-3 h-3" />
                    {release.tracks.length} track{release.tracks.length !== 1 ? 's' : ''}
                  </span>
                )}
                {totalDuration > 0 && (
                  <span className="text-white/70 text-xs">
                    {formatDuration(totalDuration)}
                  </span>
                )}
              </div>

              {/* Stats */}
              <div className="flex items-center gap-4">
                <div className="text-white">
                  <div className="text-xl font-bold drop-shadow-lg">{interactionCounts?.totalSats || 0}</div>
                  <div className="text-white/80 text-xs drop-shadow-md">sats</div>
                </div>
                <div className="text-white/60 text-xs drop-shadow-md">
                  {interactionCounts?.zaps || 0} zaps
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                {/* Play/Pause Button */}
                <Button
                  size="sm"
                  onClick={() => trackPlayback?.handleReleasePlay()}
                  disabled={!trackPlayback?.hasPlayableTracks || trackPlayback?.isReleaseLoading}
                  className="bg-white text-black hover:bg-white/90 rounded-full w-10 h-10 p-0"
                >
                  {trackPlayback?.isReleasePlaying ? (
                    <Pause className="w-4 h-4" fill="currentColor" />
                  ) : (
                    <Play className="w-4 h-4 ml-0.5" fill="currentColor" />
                  )}
                </Button>

                {/* Like Button */}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleLike}
                  className={cn(
                    "w-10 h-10 p-0 rounded-full bg-black/30 border border-white/20 text-white backdrop-blur-xl hover:bg-black/40 hover:border-white/30 transition-all duration-200 shadow-lg",
                    hasUserLiked && "text-red-500"
                  )}
                >
                  <Heart className={cn("w-4 h-4", hasUserLiked && "fill-current")} />
                </Button>

                {/* Zap Button */}
                {releaseEvent && (
                  <ZapDialog target={releaseEvent}>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="w-10 h-10 p-0 rounded-full bg-black/30 border border-white/20 text-white backdrop-blur-xl hover:bg-black/40 hover:border-white/30 hover:text-yellow-400 transition-all duration-200 shadow-lg"
                      title="Zap this release"
                    >
                      <Zap className="w-4 h-4" />
                    </Button>
                  </ZapDialog>
                )}

                {/* Share Button */}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleShare}
                  className="w-10 h-10 p-0 rounded-full bg-black/30 border border-white/20 text-white backdrop-blur-xl hover:bg-black/40 hover:border-white/30 transition-all duration-200 shadow-lg"
                >
                  <Share className="w-4 h-4" />
                </Button>
              </div>

              {/* Tab Pills */}
              <div className="flex gap-2">
                <GlassTabs defaultValue="tracks" value={activeTab} onValueChange={setActiveTab}>
                  <GlassTabsList>
                    <GlassTabsTrigger 
                      value="tracks"
                      icon={<Music className="w-3 h-3" />}
                      count={release.tracks?.length || 0}
                    >
                      Tracks
                    </GlassTabsTrigger>
                    <GlassTabsTrigger 
                      value="zappers"
                      icon={<Zap className="w-3 h-3" />}
                    >
                      Zappers
                    </GlassTabsTrigger>
                    <GlassTabsTrigger 
                      value="comments"
                      icon={<MessageCircle className="w-3 h-3" />}
                      count={commentCount}
                    >
                      Comments
                    </GlassTabsTrigger>
                    <GlassTabsTrigger 
                      value="reactions"
                      icon={<Heart className="w-3 h-3" />}
                      count={interactionCounts?.likes || 0}
                    >
                      Reactions
                    </GlassTabsTrigger>
                  </GlassTabsList>

                  <GlassTabsContent value="tracks">
                    <div className="bg-black/30 border border-white/20 backdrop-blur-xl rounded-lg shadow-lg p-4 max-w-2xl">
                      <TrackList release={release} className="text-white" />
                    </div>
                  </GlassTabsContent>

                  <GlassTabsContent value="zappers">
                    <div className="bg-black/30 border border-white/20 backdrop-blur-xl rounded-lg shadow-lg p-4 max-w-2xl">
                      <ZapLeaderboard 
                        eventId={release.eventId}
                        showTitle={false}
                        className="text-white"
                        limit={10}
                      />
                    </div>
                  </GlassTabsContent>

                  <GlassTabsContent value="comments">
                    <div className="bg-black/30 border border-white/20 backdrop-blur-xl rounded-lg shadow-lg max-w-2xl">
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
                  </GlassTabsContent>

                  <GlassTabsContent value="reactions">
                    <div className="bg-black/30 border border-white/20 backdrop-blur-xl rounded-lg shadow-lg p-4 max-w-2xl">
                      <ReactionsSection 
                        eventId={release.eventId}
                        className="text-white"
                      />
                    </div>
                  </GlassTabsContent>
                </GlassTabs>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}