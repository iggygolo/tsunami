import { useState } from 'react';
import { useSeoMeta } from '@unhead/react';
import { ArrowLeft, Play, Pause, Heart, Share, MessageCircle, Music, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ZapLeaderboard } from './ZapLeaderboard';
import { ZapDialog } from '@/components/ZapDialog';
import { CommentsSection } from '@/components/comments/CommentsSection';
import { ReactionsSection } from './ReactionsSection';
import { TrackList } from './TrackList';
import { Layout } from '@/components/Layout';
import { Link, useNavigate } from 'react-router-dom';
import { usePodcastConfig } from '@/hooks/usePodcastConfig';
import { useReleaseData } from '@/hooks/useReleaseData';
import { useReleaseInteractions } from '@/hooks/useReleaseInteractions';
import { useFormatDuration } from '@/hooks/useFormatDuration';
import { useTrackPlayback } from '@/hooks/useTrackPlayback';
import { PODCAST_KINDS } from '@/lib/podcastConfig';
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
  const podcastConfig = usePodcastConfig();
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

  // Use custom hook for track playback (always call hook, but pass null if no release)
  const trackPlayback = useTrackPlayback(release || null);

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
    kind: PODCAST_KINDS.MUSIC_PLAYLIST,
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
      ? `${release.title} | ${podcastConfig.podcast.artistName}`
      : `Release | ${podcastConfig.podcast.artistName}`,
  });

  if (isLoading) {
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

  if (!release) {
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
            {/* Back Button */}
            <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6 text-white/70 hover:text-white">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>

            {/* Hero Section - Music Player Style */}
            <div className="flex flex-col lg:flex-row gap-8 mb-8">
              {/* Album Artwork */}
              <div className="relative group">
                {release.imageUrl ? (
                  <img
                    src={release.imageUrl}
                    alt={release.title}
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

              {/* Release Info */}
              <div className="flex-1 text-white space-y-6">
                <div>
                  <h1 className="text-4xl lg:text-5xl font-bold mb-2">
                    {release.title}
                  </h1>
                  <p className="text-xl text-white/70">
                    {podcastConfig.podcast.artistName}
                  </p>
                </div>

                {/* Genre, Duration, and Track Count */}
                <div className="flex items-center gap-4 flex-wrap">
                  {release.genre && (
                    <Badge className="bg-white/10 text-white border-white/20 hover:bg-white/20">
                      {release.genre}
                    </Badge>
                  )}
                  {release.tracks && release.tracks.length > 0 && (
                    <span className="text-white/70 flex items-center gap-1">
                      <Music className="w-4 h-4" />
                      {release.tracks.length} track{release.tracks.length !== 1 ? 's' : ''}
                    </span>
                  )}
                  {totalDuration > 0 && (
                    <span className="text-white/70">
                      {formatDuration(totalDuration)}
                    </span>
                  )}
                </div>

                {/* Description */}
                {release.description && (
                  <p className="text-white/80 leading-relaxed max-w-2xl">
                    {release.description}
                  </p>
                )}

                {/* Action Buttons */}
                <div className="flex items-center gap-4">
                  {/* Play/Pause Button */}
                  <Button
                    size="icon"
                    onClick={() => trackPlayback?.handleReleasePlay()}
                    disabled={!trackPlayback?.hasPlayableTracks || trackPlayback?.isReleaseLoading}
                    className="w-12 h-12 rounded-full bg-white text-black hover:bg-white/90 disabled:opacity-50"
                  >
                    {trackPlayback?.isReleasePlaying ? (
                      <Pause className="w-6 h-6" fill="currentColor" />
                    ) : (
                      <Play className="w-6 h-6 ml-0.5" fill="currentColor" />
                    )}
                  </Button>

                  {/* Like Button */}
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={handleLike}
                    className={cn(
                      "w-12 h-12 rounded-full bg-white/10 text-white hover:bg-white/20",
                      hasUserLiked && "text-red-500"
                    )}
                  >
                    <Heart className={cn("w-5 h-5", hasUserLiked && "fill-current")} />
                  </Button>

                  {/* Zap Button */}
                  {releaseEvent && (
                    <ZapDialog target={releaseEvent}>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="w-12 h-12 rounded-full bg-white/10 text-white hover:bg-white/20 hover:text-yellow-400"
                        title="Zap this release"
                      >
                        <Zap className="w-5 h-5" />
                      </Button>
                    </ZapDialog>
                  )}

                  {/* Share Button */}
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={handleShare}
                    className="w-12 h-12 rounded-full bg-white/10 text-white hover:bg-white/20"
                  >
                    <Share className="w-5 h-5" />
                  </Button>

                  {/* Sats and Zaps Display */}
                  <div className="flex items-center gap-4 ml-4">
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col leading-tight">
                        <span className="text-xl font-bold text-white">
                          {interactionCounts?.totalSats || 0} sats
                        </span>
                        <span className="text-sm font-light text-white/60">
                          {interactionCounts?.zaps || 0} zaps
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Tab Navigation */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="bg-white/10 border-white/20 hover:bg-white/15 transition-colors">
                <TabsTrigger 
                  value="tracks" 
                  className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/70"
                >
                  Tracks
                  {release.tracks && release.tracks.length > 0 && (
                    <span className="ml-2 px-2 py-0.5 bg-white/20 text-white text-xs rounded-full">
                      {release.tracks.length}
                    </span>
                  )}
                </TabsTrigger>
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
                    <span className="ml-2 px-2 py-0.5 bg-white/20 text-white text-xs rounded-full">
                      {commentCount}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger 
                  value="reactions" 
                  className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/70"
                >
                  Reactions
                  {(interactionCounts?.likes || 0) > 0 && (
                    <span className="ml-2 px-2 py-0.5 bg-white/20 text-white text-xs rounded-full">
                      {interactionCounts?.likes}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="tracks" className="mt-6">
                <div className="bg-white/5 rounded-xl p-6 backdrop-blur-sm">
                  <TrackList release={release} className="text-white" />
                </div>
              </TabsContent>

              <TabsContent value="zappers" className="mt-6">
                <div className="bg-white/5 rounded-xl p-6 backdrop-blur-sm">
                  <ZapLeaderboard 
                    eventId={release.eventId}
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
                  <ReactionsSection 
                    eventId={release.eventId}
                    className="text-white"
                  />
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </Layout>
  );
}