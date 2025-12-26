import { useSeoMeta } from '@unhead/react';
import { MessageCircle, Users, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Layout } from '@/components/Layout';
import { PostCard } from '@/components/social/PostCard';
import { NoteComposer } from '@/components/social/NoteComposer';
import { InfiniteScroll } from '@/components/ui/InfiniteScroll';
import { CommunityZapLeaderboard } from '@/components/community/CommunityZapLeaderboard';
import { CommunityRecentActivity } from '@/components/community/CommunityRecentActivity';
import { 
  useCommunityPosts, 
  useCommunityStats
} from '@/hooks/useCommunityPosts';
import { FeaturedArtistsSection } from '@/components/community/FeaturedArtists';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useQueryClient } from '@tanstack/react-query';
import type { NostrEvent } from '@nostrify/nostrify';

const Community = () => {
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
  } = useCommunityPosts(20);

  const { data: communityStats } = useCommunityStats();

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
        <div className="mb-4">
          <h1 className="text-3xl font-bold mb-2 text-foreground">
            Community
          </h1>
          
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
        <div className="mb-4">
          <FeaturedArtistsSection />
        </div>

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
                        queryClient.setQueryData(['community-posts', 20], (oldData: unknown) => {
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
                <CommunityZapLeaderboard limit={5} />
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
                <CommunityRecentActivity limit={15} />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Community;