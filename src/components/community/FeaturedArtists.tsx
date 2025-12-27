import React from 'react';
import { Link } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, ChevronRight } from 'lucide-react';
import { useStaticFeaturedArtistsCache } from '@/hooks/useStaticFeaturedArtistsCache';
import { pubkeyToNpub } from '@/lib/artistUtils';
import { cn } from '@/lib/utils';

interface FeaturedArtistsProps {
  limit?: number;
  className?: string;
}

/**
 * FeaturedArtists component that displays active artists
 * Clicking on an artist navigates to their profile page
 */
export function FeaturedArtists({ limit = 6, className }: FeaturedArtistsProps) {
  const { data: featuredArtistsResults, isLoading: isLoadingFeatured } = useStaticFeaturedArtistsCache();

  // Extract artists from the cache results
  const featuredArtists = React.useMemo(() => {
    if (!featuredArtistsResults) return [];
    return featuredArtistsResults.slice(0, limit).map(result => ({
      ...result.artist,
      // Add metrics for display
      metrics: result.metrics
    }));
  }, [featuredArtistsResults, limit]);

  if (isLoadingFeatured) {
    return (
      <div className={cn('grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6', className)}>
        {[...Array(limit)].map((_, i) => (
          <div key={i} className="flex flex-col items-center text-center space-y-3">
            <Skeleton className="w-32 h-32 rounded-full" />
            <div className="space-y-2 w-full">
              <Skeleton className="h-5 w-24 mx-auto" />
              <Skeleton className="h-3 w-16 mx-auto" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!featuredArtists || featuredArtists.length === 0) {
    return (
      <div className={cn('grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6', className)}>
        <div className="flex flex-col items-center text-center">
          <div className="w-32 h-32 rounded-full bg-muted/30 flex items-center justify-center mb-4">
            <Users className="w-12 h-12 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-1">Discover Artists</h3>
          <p className="text-sm text-muted-foreground">
            Explore musicians on Nostr
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6', className)}>
      {featuredArtists.map((artist) => {
        const trackCount = artist.metrics?.trackCount || 0;
        const npub = artist.npub || pubkeyToNpub(artist.pubkey);
        const profileUrl = `/${npub}`;

        return (
          <ArtistCard
            key={artist.pubkey}
            artist={artist}
            trackCount={trackCount}
            profileUrl={profileUrl}
          />
        );
      })}
    </div>
  );
}

interface ArtistCardProps {
  artist: any;
  trackCount: number;
  profileUrl: string;
}

function ArtistCard({ artist, trackCount, profileUrl }: ArtistCardProps) {
  return (
    <Link 
      to={profileUrl} 
      className="flex flex-col items-center text-center group hover:scale-105 transition-transform duration-200"
    >
      {/* Circular Profile Image */}
      <div className="relative mb-4">
        <div className="w-32 h-32 rounded-full overflow-hidden bg-muted/30 group-hover:shadow-lg transition-shadow duration-200">
          {artist.image ? (
            <img 
              src={artist.image} 
              alt={artist.name || 'Artist'} 
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Users className="w-12 h-12 text-muted-foreground" />
            </div>
          )}
        </div>
      </div>

      {/* Artist Info */}
      <h3 className="text-lg font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">
        {artist.name || 'Unknown Artist'}
      </h3>
      
      {/* Track Count Display */}
      {trackCount > 0 && (
        <div className="text-sm text-muted-foreground">
          <p>{trackCount} track{trackCount !== 1 ? 's' : ''}</p>
        </div>
      )}
    </Link>
  );
}

interface FeaturedArtistsSectionProps {
  className?: string;
}

/**
 * Complete featured artists section with header and view all link
 */
export function FeaturedArtistsSection({ className }: FeaturedArtistsSectionProps) {
  return (
    <section className={className}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Artists</h2>
        <Link 
          to="/community" 
          className="group text-muted-foreground hover:text-foreground transition-colors"
        >
          <span className="text-sm">View All</span>
          <ChevronRight className="w-4 h-4 ml-1 inline group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>

      <FeaturedArtists limit={6} />
    </section>
  );
}