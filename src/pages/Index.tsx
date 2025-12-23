import { useSeoMeta } from '@unhead/react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Headphones, Rss, Zap, Users, MessageSquare, Play, ChevronRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Layout } from '@/components/Layout';
import { ReleaseList } from '@/components/music/ReleaseList';
import { ZapLeaderboard } from '@/components/music/ZapLeaderboard';
import { RecentActivity } from '@/components/music/RecentActivity';
import { PostCard } from '@/components/social/PostCard';
import { ZapDialog } from '@/components/ZapDialog';
import type { PodcastRelease } from '@/types/podcast';
import { useLatestRelease, useReleases } from '@/hooks/usePodcastReleases';
import { usePodcastConfig } from '@/hooks/usePodcastConfig';
import { useAuthor } from '@/hooks/useAuthor';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import { useArtistPosts, useArtistPostCount } from '@/hooks/useArtistPosts';
import { useZapLeaderboard } from '@/hooks/useZapLeaderboard';
import { getArtistPubkeyHex } from '@/lib/podcastConfig';

const Index = () => {
  const { data: latestRelease } = useLatestRelease();
  const { data: allReleases } = useReleases({ limit: 100 });
  const { data: leaderboard } = useZapLeaderboard(100);
  const { data: postCount } = useArtistPostCount();
  const podcastConfig = usePodcastConfig();
  const { data: artist } = useAuthor(getArtistPubkeyHex());
  const { user } = useCurrentUser();
  const { playRelease } = useAudioPlayer();
  const _currentRelease = useState<PodcastRelease | null>(null);
  const { data: postsData, isLoading: postsLoading } = useArtistPosts(3);
  
  // Flatten the first page of posts for preview
  const recentPosts = postsData?.pages.flat().slice(0, 3) || [];
  
  // Stats for Explore cards
  const releaseCount = allReleases?.length || 0;
  const supporterCount = leaderboard?.length || 0;
  const totalPostCount = postCount || 0;

  const handlePlayLatestRelease = () => {
    if (latestRelease) {
      playRelease(latestRelease);
    }
  };

  useSeoMeta({
    title: podcastConfig.podcast.artistName,
    description: podcastConfig.podcast.description,
  });

  return (
    <Layout>
      {/* Hero Section with Latest Release */}
      {latestRelease && (
        <div className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-secondary/10">
          <div className="absolute inset-0 bg-grid-pattern opacity-5" />
          <div className="container mx-auto px-4 py-12 relative">
            <div className="max-w-6xl mx-auto">
              <div className="flex flex-col lg:flex-row items-center gap-8">
                {/* Album Art */}
                {latestRelease.imageUrl && (
                  <div className="relative group flex-shrink-0">
                    <div className="absolute -inset-2 bg-gradient-to-r from-primary to-secondary rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-500" />
                    <img
                      src={latestRelease.imageUrl}
                      alt={latestRelease.title}
                      className="relative w-64 h-64 lg:w-72 lg:h-72 rounded-2xl object-cover shadow-2xl"
                    />
                    <button
                      onClick={handlePlayLatestRelease}
                      className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    >
                      <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg">
                        <Play className="w-8 h-8 text-primary ml-1" fill="currentColor" />
                      </div>
                    </button>
                  </div>
                )}

                {/* Release Info */}
                <div className="flex-1 text-center lg:text-left space-y-4">
                  <div className="space-y-2">
                    <Badge variant="primary" className="mb-2">
                      <Sparkles className="w-3 h-3 mr-1" />
                      Latest Release
                    </Badge>
                    <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight">
                      {latestRelease.title}
                    </h1>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                      <Link to="/about" className="inline-flex items-center gap-2 text-lg text-muted-foreground hover:text-foreground transition-colors">
                        {podcastConfig.podcast.image && (
                          <img
                            src={podcastConfig.podcast.image}
                            alt={podcastConfig.podcast.artistName}
                            className="w-6 h-6 rounded-full object-cover"
                          />
                        )}
                        <span className="font-medium">{podcastConfig.podcast.artistName}</span>
                      </Link>
                      {latestRelease.tags && latestRelease.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 justify-center lg:justify-start">
                          {latestRelease.tags.slice(0, 3).map((tag) => (
                            <Badge key={tag} variant="outline" className="text-xs bg-background/50">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {latestRelease.description && (
                    <p className="text-muted-foreground leading-relaxed max-w-xl line-clamp-2">
                      {latestRelease.description}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-3 justify-center lg:justify-start pt-2">
                    <Button onClick={handlePlayLatestRelease} size="lg" className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white border-0">
                      <Play className="w-5 h-5 mr-2" fill="currentColor" />
                      Play
                    </Button>

                    <Button variant="outline" size="lg" asChild>
                      <Link to="/about">
                        About Artist
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Link>
                    </Button>

                    {user && latestRelease.totalSats && latestRelease.totalSats > 0 && (
                      <Badge variant="outline" className="h-11 px-4 text-sm bg-yellow-500/10 border-yellow-500/30 text-yellow-600 dark:text-yellow-400">
                        <Zap className="w-4 h-4 mr-1" />
                        {latestRelease.totalSats.toLocaleString()} sats
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 py-4">
        <div className="max-w-6xl mx-auto space-y-12">
          {/* Recent Releases */}
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Recent Releases</h2>
              <Button variant="ghost" asChild>
                <Link to="/releases" className="group text-muted-foreground hover:text-foreground">
                  View All
                  <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
            </div>

            <ReleaseList
              showSearch={false}
              _showPlayer={false}
              limit={6}
              onPlayRelease={(release) => {
                playRelease(release);
              }}
            />
          </section>

          {/* Community Section */}
          <section>
            <h2 className="text-2xl font-bold mb-6">Community</h2>
            <div className="space-y-6">
              {/* Support CTA Banner */}
              <Card className="relative overflow-hidden bg-gradient-to-r from-yellow-500/10 via-yellow-500/5 to-transparent border-yellow-500/20">
                <CardContent className="p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center">
                      <Zap className="w-6 h-6 text-yellow-500" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">Support the Artist</h3>
                      <p className="text-sm text-muted-foreground">
                        Zap releases, share with friends, and engage with the community
                      </p>
                    </div>
                  </div>
                  {artist?.event && user && (artist.metadata?.lud16 || artist.metadata?.lud06) ? (
                    <ZapDialog target={artist.event}>
                      <Button className="bg-yellow-500 hover:bg-yellow-600 text-yellow-950 shrink-0">
                        <Zap className="w-4 h-4 mr-2" />
                        Zap the Show
                      </Button>
                    </ZapDialog>
                  ) : (
                    <Button variant="outline" className="shrink-0" disabled>
                      <Zap className="w-4 h-4 mr-2" />
                      {!user ? "Login to Zap" : "Artist has no Lightning address"}
                    </Button>
                  )}
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Supporters */}
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold flex items-center gap-2">
                        <Zap className="w-4 h-4 text-yellow-500" />
                        Top Supporters
                      </h3>
                      <Link to="/community" className="text-sm text-muted-foreground hover:text-foreground">
                        See all
                      </Link>
                    </div>
                    <ZapLeaderboard limit={5} showTitle={false} />
                  </CardContent>
                </Card>

                {/* Recent Activity */}
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold">Recent Activity</h3>
                      <Link to="/community" className="text-sm text-muted-foreground hover:text-foreground">
                        See all
                      </Link>
                    </div>
                    <RecentActivity limit={5} showTitle={false} />
                  </CardContent>
                </Card>
              </div>
            </div>
          </section>

          {/* Social Feed Preview */}
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Social Feed</h2>
              <Button variant="ghost" asChild>
                <Link to="/social" className="group text-muted-foreground hover:text-foreground">
                  View All
                  <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
            </div>

            {postsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[...Array(3)].map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-4">
                      <div className="flex items-start space-x-3">
                        <Skeleton className="w-9 h-9 rounded-full" />
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center space-x-2">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-3 w-16" />
                          </div>
                          <Skeleton className="h-4 w-full" />
                          <Skeleton className="h-4 w-3/4" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : recentPosts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {recentPosts.map((post) => (
                  <PostCard key={post.id} event={post} previewMode className="h-44" />
                ))}
              </div>
            ) : (
              <Card className="border-dashed">
                <CardContent className="py-8 text-center">
                  <MessageSquare className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">No posts yet</p>
                </CardContent>
              </Card>
            )}
          </section>

          {/* Quick Navigation Cards */}
          <section>
            <h2 className="text-2xl font-bold mb-6">Explore</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Link to="/releases" className="group">
                <Card className="h-full hover:border-cyan-500/50 transition-colors">
                  <CardContent className="p-5 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center group-hover:bg-cyan-500/20 transition-colors">
                      <Headphones className="w-6 h-6 text-cyan-500" />
                    </div>
                    <div>
                      <h3 className="font-semibold group-hover:text-cyan-500 transition-colors">All Releases</h3>
                      <p className="text-sm text-muted-foreground">
                        {releaseCount > 0 ? `${releaseCount} tracks` : 'Browse catalog'}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </Link>

              <Link to="/community" className="group">
                <Card className="h-full hover:border-yellow-500/50 transition-colors">
                  <CardContent className="p-5 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-yellow-500/10 flex items-center justify-center group-hover:bg-yellow-500/20 transition-colors">
                      <Users className="w-6 h-6 text-yellow-500" />
                    </div>
                    <div>
                      <h3 className="font-semibold group-hover:text-yellow-500 transition-colors">Community</h3>
                      <p className="text-sm text-muted-foreground">
                        {supporterCount > 0 ? `${supporterCount} supporters` : 'Join discussions'}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </Link>

              <Link to="/social" className="group">
                <Card className="h-full hover:border-purple-500/50 transition-colors">
                  <CardContent className="p-5 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center group-hover:bg-purple-500/20 transition-colors">
                      <MessageSquare className="w-6 h-6 text-purple-500" />
                    </div>
                    <div>
                      <h3 className="font-semibold group-hover:text-purple-500 transition-colors">Social Feed</h3>
                      <p className="text-sm text-muted-foreground">
                        {totalPostCount > 0 ? `${totalPostCount} posts` : 'Latest updates'}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </Link>

              <a href="/rss.xml" target="_blank" rel="noopener noreferrer" className="group">
                <Card className="h-full hover:border-orange-500/50 transition-colors">
                  <CardContent className="p-5 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center group-hover:bg-orange-500/20 transition-colors">
                      <Rss className="w-6 h-6 text-orange-500" />
                    </div>
                    <div>
                      <h3 className="font-semibold group-hover:text-orange-500 transition-colors">RSS Feed</h3>
                      <p className="text-sm text-muted-foreground">Subscribe</p>
                    </div>
                  </CardContent>
                </Card>
              </a>
            </div>
          </section>
        </div>
      </div>
    </Layout>
  );
};

export default Index;