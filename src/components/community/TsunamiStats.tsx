import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Music, Users, Activity, Globe, Headphones, Rss } from 'lucide-react';
import { useStaticReleaseCache } from '@/hooks/useStaticReleaseCache';
import { useCommunityStats } from '@/hooks/useCommunityPosts';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { cn } from '@/lib/utils';

interface TsunamiStatsProps {
  className?: string;
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  description?: string;
  isLoading?: boolean;
  color?: string;
}

function StatCard({ icon, label, value, description, isLoading, color = 'primary' }: StatCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-3">
            <Skeleton className="w-10 h-10 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-6 w-12" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const colorClasses = {
    primary: 'bg-primary/10 text-primary',
    cyan: 'bg-cyan-500/10 text-cyan-500',
    yellow: 'bg-yellow-500/10 text-yellow-500',
    red: 'bg-red-500/10 text-red-500',
    green: 'bg-green-500/10 text-green-500',
    purple: 'bg-purple-500/10 text-purple-500',
  };

  return (
    <Card className="hover:border-primary/30 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-center space-x-3">
          <div className={cn(
            'w-10 h-10 rounded-lg flex items-center justify-center',
            colorClasses[color as keyof typeof colorClasses] || colorClasses.primary
          )}>
            {icon}
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold">{typeof value === 'number' ? value.toLocaleString() : value}</p>
            {description && (
              <p className="text-xs text-muted-foreground mt-1">{description}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * TsunamiStats component displays platform-wide statistics and navigation
 */
export function TsunamiStats({ className }: TsunamiStatsProps) {
  const { data: releases, isLoading: isLoadingReleases } = useStaticReleaseCache();
  const { data: communityStats, isLoading: isLoadingCommunity } = useCommunityStats();
  const { user } = useCurrentUser();

  // Calculate statistics
  const stats = React.useMemo(() => {
    if (!releases) return null;

    // Calculate total tracks across all releases
    const totalTracks = releases.reduce((sum, release) => {
      return sum + (release.tracks?.length || 0);
    }, 0);

    // Calculate unique artists
    const uniqueArtists = new Set(
      releases.map(release => release.artistPubkey).filter(Boolean)
    ).size;

    return {
      totalReleases: releases.length,
      totalTracks,
      totalArtists: uniqueArtists,
      activeArtists: communityStats?.activeArtists || 0,
    };
  }, [releases, communityStats]);

  const isLoading = isLoadingReleases || isLoadingCommunity;

  return (
    <section className={className}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Nostr Music</h2>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Globe className="w-4 h-4" />
          <span>Global Platform</span>
        </div>
      </div>

      {/* Platform Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={<Music className="w-5 h-5" />}
          label="Tracks"
          value={stats?.totalTracks || 0}
          description="Individual songs"
          isLoading={isLoading}
          color="purple"
        />

        <StatCard
          icon={<Users className="w-5 h-5" />}
          label="Artists"
          value={stats?.totalArtists || 0}
          description="Unique creators"
          isLoading={isLoading}
          color="green"
        />

        <StatCard
          icon={<Activity className="w-5 h-5" />}
          label="Active Artists"
          value={stats?.activeArtists || 0}
          description="This week"
          isLoading={isLoading}
          color="primary"
        />

        <StatCard
          icon={<Globe className="w-5 h-5" />}
          label="Decentralized"
          value="100%"
          description="On Nostr protocol"
          isLoading={false}
          color="primary"
        />
      </div>

      {/* Navigation Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link to="/releases" className="group">
          <Card className="h-full hover:border-cyan-500/50 transition-colors">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center group-hover:bg-cyan-500/20 transition-colors">
                <Headphones className="w-6 h-6 text-cyan-500" />
              </div>
              <div>
                <h3 className="font-semibold group-hover:text-cyan-500 transition-colors">Music Library</h3>
                <p className="text-sm text-muted-foreground">
                  {(stats?.totalReleases || 0) > 0 ? `${stats?.totalReleases || 0} releases` : 'Browse catalog'}
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
                <p className="text-sm text-muted-foreground">Join discussions</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link to="/studio" className="group">
          <Card className="h-full hover:border-purple-500/50 transition-colors">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center group-hover:bg-purple-500/20 transition-colors">
                <Music className="w-6 h-6 text-purple-500" />
              </div>
              <div>
                <h3 className="font-semibold group-hover:text-purple-500 transition-colors">Artist Studio</h3>
                <p className="text-sm text-muted-foreground">
                  {user ? 'Create & publish' : 'Login to create'}
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
  );
}