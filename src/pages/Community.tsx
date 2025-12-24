import { useSeoMeta } from '@unhead/react';
import { MessageCircle, Users, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Layout } from '@/components/Layout';
import { ZapLeaderboard } from '@/components/music/ZapLeaderboard';
import { RecentActivity } from '@/components/music/RecentActivity';
import { ReleaseDiscussions } from '@/components/music/ReleaseDiscussions';
import { MUSIC_CONFIG } from '@/lib/musicConfig';

const Community = () => {
  useSeoMeta({
    title: `Community - ${MUSIC_CONFIG.podcast.artistName}`,
    description: `Join the community discussion for ${MUSIC_CONFIG.podcast.artistName}`,
  });

  return (
    <Layout>
      <div className="container mx-auto px-4 py-4">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Community</h1>
            <p className="text-muted-foreground">
              Engage with the {MUSIC_CONFIG.podcast.artistName} community
            </p>
          </div>

          {/* Two-column layout for Discussions and Activity/Supporters */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left column - Discussions */}
            <div className="lg:col-span-2">
              <Card className="h-fit">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <MessageCircle className="w-5 h-5 text-primary" />
                    Release Discussions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ReleaseDiscussions limit={20} />
                </CardContent>
              </Card>
            </div>

            {/* Right column - Supporters & Activity */}
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
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Community;