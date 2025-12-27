import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useStaticFeaturedArtistsCache } from '@/hooks/useStaticFeaturedArtistsCache';
import { Music, Users, Zap, Calendar } from 'lucide-react';
import { nip19 } from 'nostr-tools';

interface FeaturedArtistsSectionProps {
  className?: string;
  limit?: number;
  showMetrics?: boolean;
}

export function FeaturedArtistsSection({ 
  className = '', 
  limit = 6,
  showMetrics = false 
}: FeaturedArtistsSectionProps) {
  const { data: featuredArtists, isLoading, isStale, error } = useStaticFeaturedArtistsCache();

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Featured Artists
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: limit }).map((_, i) => (
              <div key={i} className="flex items-center space-x-3 p-3 rounded-lg border border-border">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <Users className="w-5 h-5" />
            Featured Artists
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Failed to load featured artists</p>
        </CardContent>
      </Card>
    );
  }

  if (!featuredArtists || featuredArtists.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Featured Artists
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Music className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="text-foreground mb-2">No featured artists yet</h3>
            <p className="text-muted-foreground">Check back later for featured artists</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const displayedArtists = featuredArtists.slice(0, limit);

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Featured Artists
            {isStale && (
              <span className="text-xs text-muted-foreground">(updating...)</span>
            )}
          </CardTitle>
          {featuredArtists.length > limit && (
            <Button variant="ghost" size="sm">
              View All ({featuredArtists.length})
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayedArtists.map((result) => {
            const { artist, metrics, featuredScore } = result;
            const npub = nip19.npubEncode(artist.pubkey);
            
            return (
              <div
                key={artist.pubkey}
                className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors cursor-pointer"
                onClick={() => {
                  // Navigate to artist profile
                  window.location.href = `/${npub}`;
                }}
              >
                {/* Artist Avatar */}
                <div className="relative">
                  {artist.image ? (
                    <img
                      src={artist.image}
                      alt={artist.name || 'Artist'}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                      <Music className="w-6 h-6 text-muted-foreground" />
                    </div>
                  )}
                </div>

                {/* Artist Info */}
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-foreground truncate">
                    {artist.name || npub.slice(0, 12) + '...'}
                  </h4>
                  
                  {showMetrics ? (
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                      <span className="flex items-center gap-1">
                        <Music className="w-3 h-3" />
                        {metrics.releaseCount}
                      </span>
                      {metrics.totalZaps > 0 && (
                        <span className="flex items-center gap-1">
                          <Zap className="w-3 h-3" />
                          {metrics.totalZaps}
                        </span>
                      )}
                      {metrics.recentActivity > 0 && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {metrics.recentActivity}
                        </span>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      {metrics.releaseCount} release{metrics.releaseCount !== 1 ? 's' : ''}
                      {metrics.trackCount > 0 && `, ${metrics.trackCount} track${metrics.trackCount !== 1 ? 's' : ''}`}
                    </p>
                  )}
                  
                  {showMetrics && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Score: {featuredScore.toFixed(1)}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Cache Status (Debug) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Cache: {isStale ? 'Stale' : 'Fresh'} • 
              {featuredArtists.length} artists • 
              Algorithm: Shared
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Compact version for sidebars or smaller spaces
 */
export function FeaturedArtistsCompact({ 
  className = '', 
  limit = 4 
}: Pick<FeaturedArtistsSectionProps, 'className' | 'limit'>) {
  const { data: featuredArtists, isLoading } = useStaticFeaturedArtistsCache();

  if (isLoading) {
    return (
      <div className={className}>
        <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
          <Users className="w-4 h-4" />
          Featured Artists
        </h3>
        <div className="space-y-2">
          {Array.from({ length: limit }).map((_, i) => (
            <div key={i} className="flex items-center space-x-2">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-4 w-20 flex-1" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!featuredArtists || featuredArtists.length === 0) {
    return null;
  }

  const displayedArtists = featuredArtists.slice(0, limit);

  return (
    <div className={className}>
      <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
        <Users className="w-4 h-4" />
        Featured Artists
      </h3>
      <div className="space-y-2">
        {displayedArtists.map((result) => {
          const { artist } = result;
          const npub = nip19.npubEncode(artist.pubkey);
          
          return (
            <div
              key={artist.pubkey}
              className="flex items-center space-x-2 p-2 rounded hover:bg-muted/30 transition-colors cursor-pointer"
              onClick={() => {
                window.location.href = `/${npub}`;
              }}
            >
              {artist.image ? (
                <img
                  src={artist.image}
                  alt={artist.name || 'Artist'}
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                  <Music className="w-4 h-4 text-muted-foreground" />
                </div>
              )}
              <span className="text-sm text-foreground truncate flex-1">
                {artist.name || npub.slice(0, 12) + '...'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}