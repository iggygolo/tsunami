import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Music, Users, Globe, Headphones } from 'lucide-react';
import { useStaticAllReleasesCache } from '@/hooks/useStaticReleaseCache';
import { useCommunityStats } from '@/hooks/useCommunityPosts';
import { useCurrentUser } from '@/hooks/useCurrentUser';

interface TsunamiStatsProps {
  className?: string;
}

/**
 * TsunamiStats component displays platform-wide statistics and navigation
 */
export function TsunamiStats({ className }: TsunamiStatsProps) {
  const { data: releases } = useStaticAllReleasesCache();
  const { data: communityStats } = useCommunityStats();
  const { user } = useCurrentUser();

  // Calculate statistics
  const stats = React.useMemo(() => {
    if (!releases) return null;

    // Calculate unique artists
    const uniqueArtists = new Set(
      releases.map(release => release.artistPubkey).filter(Boolean)
    ).size;

    return {
      totalReleases: releases.length,
      totalArtists: uniqueArtists,
    };
  }, [releases, communityStats]);

  return (
    <section className={className}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Nostr Music</h2>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Globe className="w-4 h-4" />
          <span>Global Platform</span>
        </div>
      </div>

      {/* Simplified Navigation Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link to="/releases" className="group">
          <Card className="h-full hover:border-cyan-500/50 transition-colors">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center group-hover:bg-cyan-500/20 transition-colors">
                <Headphones className="w-6 h-6 text-cyan-500" />
              </div>
              <div>
                <h3 className="font-semibold group-hover:text-cyan-500 transition-colors">Releases</h3>
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
                <h3 className="font-semibold group-hover:text-yellow-500 transition-colors">Artists</h3>
                <p className="text-sm text-muted-foreground">
                  {(stats?.totalArtists || 0) > 0 ? `${stats?.totalArtists || 0} artists` : 'Discover creators'}
                </p>
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
      </div>
    </section>
  );
}