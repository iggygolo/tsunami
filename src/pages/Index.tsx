import { useSeoMeta } from '@unhead/react';
import { Link } from 'react-router-dom';
import { Headphones, Rss, Zap, Users, Play, Pause, ChevronRight, Sparkles, Music, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/useToast';
import { Layout } from '@/components/Layout';
import { BlurredBackground } from '@/components/BlurredBackground';
import { ReleaseList } from '@/components/music/ReleaseList';
import { TrendingTracksSection } from '@/components/music/TrendingTracksSection';
import { FeaturedArtistsSection } from '@/components/community/FeaturedArtists';
import { TsunamiStats } from '@/components/community/TsunamiStats';
import { useLatestReleaseCache } from '@/hooks/useStaticReleaseCache';

const Index = () => {
  const { data: latestRelease } = useLatestReleaseCache();

  useSeoMeta({
    title: 'Tsunami - Decentralized Music Discovery',
    description: 'Discover music from artists on Nostr - the decentralized music platform connecting artists and fans worldwide',
  });

  return (
    <Layout>
      <div className="container mx-auto px-4 py-4">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="relative -mx-4 px-4">
            <BlurredBackground image={latestRelease?.imageUrl} />

            {/* Section Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Latest Tracks</h2>
              <Button variant="ghost" asChild>
                <Link to="/releases" className="group text-muted-foreground hover:text-foreground">
                  View All
                  <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
            </div>

            {/* Trending Tracks Section - Positioned between hero and recent releases (Requirement 8.1) */}
            <TrendingTracksSection
              useCache={true}
            />
          </div>

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
              showArtistFilter={false}
              limit={5}
              useCache={true}
              excludeLatest={true}
              cacheType="recent"
            />
          </section>

          {/* Featured Artists */}
          <section>
            <FeaturedArtistsSection />
          </section>

          {/* Tsunami Stats */}
          <section>
            <TsunamiStats />
          </section>
        </div>
      </div>
    </Layout>
  );
};

export default Index;