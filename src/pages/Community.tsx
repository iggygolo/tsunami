import { useState } from 'react';
import { useSeoMeta } from '@unhead/react';
import { MessageCircle, Users, TrendingUp, Music, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Layout } from '@/components/Layout';
import { PostCard } from '@/components/social/PostCard';
import { NoteComposer } from '@/components/social/NoteComposer';
import { InfiniteScroll } from '@/components/ui/InfiniteScroll';
import { ArtistLinkWithImage } from '@/components/music/ArtistLink';
import { ZapLeaderboard } from '@/components/music/ZapLeaderboard';
import { RecentActivity } from '@/components/music/RecentActivity';
import { ReleaseDiscussions } from '@/components/music/ReleaseDiscussions';
import { 
  useCommunityPosts, 
  useCommunityStats, 
  useFeaturedArtists 
} from '@/hooks/useCommunityPosts';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import type { NostrEvent } from '@nostrify/nostrify';

const Community = () => {
  const [selectedArtistFilter, setSelectedArtistFilter] = useState<string | undefined>(undefined);
  const { user } = useCurrentUser();
  const queryClient = useQueryClient();

  // Community data
  const {
    data: postsData,
    fetchNextPage: fetchNextPosts,
    hasNextPage: hasNextPosts,
    isFetching: isFetchingPosts,
    isLoading: postsLoading,
    error: postsError,
  } = useCommunityPosts(20, selectedArtistFilter);

  const { data: communityStats } = useCommunityStats();
  const { data: featuredArtists } = useFeaturedArtists(6);

  // Flatten infinite query data for rendering
  const communityPostsData = postsData?.pages.flat() || [];

  useSeoMeta({
    title: 'Community - Tsunami',
    description: 'Discover and engage with the Nostr music community on Tsunami',
  });

  const PostSkeleton = () => (
    <Card>
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
            <div className="flex items-center space-x-4 pt-1">
              <Skeleton className="h-5 w-14" />
              <Skeleton className="h-5 w-14" />
              <Skeleton className="h-5 w-14" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const EmptyState = ({ message, subtitle }: { message: string; subtitle: string }) => (
    <div className="col-span-full">
      <Card className="border-dashed">
        <CardContent className="py-12 px-8 text-center">
          <div className="max-w-sm mx-auto space-y-6">
            <MessageCircle className="w-12 h-12 mx-auto text-muted-foreground" />
            <div className="space-y-2">
              <p className="text-muted-foreground">{message}</p>
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const ErrorState = () => (
    <div className="col-span-full">
      <Card className="border-dashed border-red-200">
        <CardContent className="py-12 px-8 text-center">
          <div className="max-w-sm mx-auto space-y-6">
            <p className="text-muted-foreground">
              Failed to load community feed. Please try refreshing the page.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <Layout>
      <div className="py-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-purple-600 to-violet-600 bg-clip-text text-transparent">
            Community
          </h1>
          <p className="text-muted-foreground">
            Discover and engage with the Nostr music community
          </p>
          
          {/* Community Stats */}
          {communityStats && (
            <div className="flex items-center gap-6 mt-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                {communityStats.totalArtists} artists
              </span>
              <span className="flex items-center gap-1">
                <MessageCircle className="w-4 h-4" />
                {communityStats.totalPosts} posts
              </span>
              <span className="flex items-center gap-1">
                <TrendingUp className="w-4 h-4" />
                {communityStats.activeArtists} active this week
              </span>
            </div>
          )}
        </div>

        {/* Featured Artists Section */}
        {featuredArtists && featuredArtists.length > 0 && (
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Sparkles className="w-5 h-5 text-primary" />
                Featured Artists
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {featuredArtists.map((artist) => (
                  <div
                    key={artist.pubkey}
                    className={cn(
                      "p-3 rounded-lg border transition-colors cursor-pointer",
                      selectedArtistFilter === artist.pubkey
                        ? "bg-primary/10 border-primary/30"
                        : "hover:bg-muted/50"
                    )}
                    onClick={() => {
                      setSelectedArtistFilter(
                        selectedArtistFilter === artist.pubkey ? undefined : artist.pubkey
                      );
                    }}
                  >
                    <ArtistLinkWithImage
                      pubkey={artist.pubkey}
                      artistInfo={artist}
                      disabled={true}
                      className="flex flex-col items-center text-center gap-2"
                      textSize="text-xs"
                      imageSize="w-12 h-12"
                    />
                    {artist.activityScore > 0 && (
                      <div className="text-xs text-muted-foreground text-center mt-1">
                        {artist.activityScore} activity
                      </div>
                    )}
                  </div>
                ))}
              </div>
              
              {selectedArtistFilter && (
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Showing posts from selected artist
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedArtistFilter(undefined)}
                  >
                    Show All Artists
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Main Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column - Community Timeline */}
          <div className="lg:col-span-2">
            <Card className="h-fit">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <MessageCircle className="w-5 h-5 text-primary" />
                  Community Timeline
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Note Composer - Show for any authenticated user */}
                {user && (
                  <div className="mb-6">
                    <NoteComposer 
                      placeholder="Share something with the community..."
                      onSuccess={(newEvent) => {
                        // Optimistically add the new note to the community feed
                        queryClient.setQueryData(['community-posts', selectedArtistFilter, 20], (oldData: unknown) => {
                          if (!oldData || typeof oldData !== 'object' || !('pages' in oldData)) return oldData;
                          
                          const typedOldData = oldData as { pages: NostrEvent[][] };
                          
                          // Create the optimistic note
                          const optimisticNote: NostrEvent = {
                            id: newEvent?.id || `temp-${Date.now()}`,
                            kind: 1,
                            pubkey: user.pubkey,
                            created_at: Math.floor(Date.now() / 1000),
                            content: newEvent?.content || '',
                            tags: newEvent?.tags || [],
                            sig: newEvent?.sig || ''
                          };

                          // Add to the first page
                          const updatedPages = [...typedOldData.pages];
                          if (updatedPages[0]) {
                            updatedPages[0] = [optimisticNote, ...updatedPages[0]];
                          } else {
                            updatedPages[0] = [optimisticNote];
                          }

                          return {
                            ...typedOldData,
                            pages: updatedPages
                          };
                        });

                        // Then refresh from network to get the confirmed version
                        setTimeout(() => {
                          queryClient.invalidateQueries({ 
                            queryKey: ['community-posts'] 
                          });
                        }, 1000);
                      }}
                    />
                  </div>
                )}

                {/* Community Posts */}
                {postsError && <ErrorState />}

                {postsLoading ? (
                  <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <PostSkeleton key={i} />
                    ))}
                  </div>
                ) : communityPostsData.length > 0 ? (
                  <InfiniteScroll
                    hasMore={!!hasNextPosts}
                    isLoading={isFetchingPosts}
                    onLoadMore={fetchNextPosts}
                  >
                    {communityPostsData.map((event) => (
                      <PostCard key={event.id} event={event} />
                    ))}
                  </InfiniteScroll>
                ) : (
                  <EmptyState
                    message="No community posts found"
                    subtitle="Be the first to share something with the community!"
                  />
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right column - Community Stats & Activity */}
          <div className="lg:col-span-1 space-y-6">
            {/* Top Supporters */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Users className="w-5 h-5 text-primary" />
                  Top Supporters
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ZapLeaderboard limit={5} showTitle={false} />
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <RecentActivity limit={15} showTitle={false} />
              </CardContent>
            </Card>

            {/* Release Discussions */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Music className="w-5 h-5 text-primary" />
                  Release Discussions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ReleaseDiscussions limit={10} />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Community;