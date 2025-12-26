import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Music, Users, Zap, MessageCircle } from 'lucide-react';
import { ArtistLinkWithImage } from '@/components/music/ArtistLink';
import { useReleases } from '@/hooks/useReleases';
import { useCommunityActivity } from '@/hooks/useCommunityPosts';
import type { SimpleArtistInfo } from '@/types/music';

interface ArtistSpotlightProps {
  artist: SimpleArtistInfo & { activityScore?: number };
  className?: string;
}

/**
 * ArtistSpotlight component for highlighting individual artists
 * Shows artist info, recent activity, and quick stats
 */
export function ArtistSpotlight({ artist, className }: ArtistSpotlightProps) {
  const { data: releases } = useReleases();
  const { data: communityActivity } = useCommunityActivity(50, artist.pubkey);

  // Calculate artist stats
  const artistReleases = releases?.filter(r => r.artistPubkey === artist.pubkey) || [];
  const recentPosts = communityActivity?.filter(e => e.kind === 1) || [];
  const recentReposts = communityActivity?.filter(e => e.kind === 6 || e.kind === 16) || [];

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Artist Spotlight</CardTitle>
          {artist.activityScore && artist.activityScore > 0 && (
            <Badge variant="secondary" className="bg-primary/10 text-primary">
              Active
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Artist Info */}
        <div className="flex items-center space-x-4">
          <ArtistLinkWithImage
            pubkey={artist.pubkey}
            artistInfo={artist}
            className="flex-1"
            textSize="text-base"
            imageSize="w-12 h-12"
          />
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <Music className="w-4 h-4" />
            <span>{artistReleases.length} releases</span>
          </div>
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <MessageCircle className="w-4 h-4" />
            <span>{recentPosts.length} posts</span>
          </div>
        </div>

        {/* Recent Activity Summary */}
        {(recentPosts.length > 0 || recentReposts.length > 0) && (
          <div className="text-sm text-muted-foreground">
            <p>
              Recent activity: {recentPosts.length} posts
              {recentReposts.length > 0 && `, ${recentReposts.length} reposts`}
            </p>
          </div>
        )}

        {/* Action Button */}
        <Button variant="outline" size="sm" className="w-full" asChild>
          <a href={`/${artist.npub || artist.pubkey}`}>
            View Profile
          </a>
        </Button>
      </CardContent>
    </Card>
  );
}

interface ArtistDiscoveryGridProps {
  artists: Array<SimpleArtistInfo & { activityScore?: number }>;
  title?: string;
  limit?: number;
  className?: string;
}

/**
 * ArtistDiscoveryGrid component for displaying multiple artists in a grid
 */
export function ArtistDiscoveryGrid({ 
  artists, 
  title = "Discover Artists", 
  limit = 6,
  className 
}: ArtistDiscoveryGridProps) {
  const displayArtists = artists.slice(0, limit);

  if (displayArtists.length === 0) {
    return null;
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Users className="w-5 h-5 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayArtists.map((artist) => (
            <div
              key={artist.pubkey}
              className="p-4 rounded-lg border hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <ArtistLinkWithImage
                  pubkey={artist.pubkey}
                  artistInfo={artist}
                  className="flex-1"
                  textSize="text-sm"
                  imageSize="w-10 h-10"
                />
                {artist.activityScore && artist.activityScore > 0 && (
                  <Badge variant="outline" className="text-xs">
                    {artist.activityScore}
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

interface TrendingArtistsProps {
  className?: string;
  limit?: number;
}

/**
 * TrendingArtists component showing artists with recent activity
 */
export function TrendingArtists({ className, limit = 5 }: TrendingArtistsProps) {
  const { data: communityActivity } = useCommunityActivity(100);
  const { data: releases } = useReleases();

  // Calculate trending artists based on recent activity
  const trendingArtists = React.useMemo(() => {
    if (!communityActivity || !releases) return [];

    const artistScores = new Map<string, number>();
    const weekAgo = Math.floor(Date.now() / 1000) - (7 * 24 * 60 * 60);

    // Score based on recent activity
    communityActivity.forEach(event => {
      if (event.created_at > weekAgo) {
        const currentScore = artistScores.get(event.pubkey) || 0;
        let points = 0;
        switch (event.kind) {
          case 1: points = 3; break; // Posts worth 3 points
          case 6:
          case 16: points = 2; break; // Reposts worth 2 points
          case 7: points = 1; break; // Reactions worth 1 point
        }
        artistScores.set(event.pubkey, currentScore + points);
      }
    });

    // Get unique artists from releases and add activity scores
    const uniqueArtists = Array.from(new Set(releases.map(r => r.artistPubkey)))
      .map(pubkey => ({
        pubkey,
        npub: '', // Will be filled by ArtistLink
        name: undefined,
        image: undefined,
        activityScore: artistScores.get(pubkey) || 0
      }))
      .filter(artist => artist.activityScore > 0)
      .sort((a, b) => b.activityScore - a.activityScore)
      .slice(0, limit);

    return uniqueArtists;
  }, [communityActivity, releases, limit]);

  if (trendingArtists.length === 0) {
    return null;
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Zap className="w-5 h-5 text-primary" />
          Trending Artists
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {trendingArtists.map((artist, index) => (
            <div
              key={artist.pubkey}
              className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                {index + 1}
              </div>
              <ArtistLinkWithImage
                pubkey={artist.pubkey}
                artistInfo={artist}
                className="flex-1"
                textSize="text-sm"
                imageSize="w-8 h-8"
              />
              <Badge variant="outline" className="text-xs">
                {artist.activityScore}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}