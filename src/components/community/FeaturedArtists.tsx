import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Music, Users, ChevronRight, Play, Pause } from 'lucide-react';
import { ArtistLinkWithImage } from '@/components/music/ArtistLink';
import { useFeaturedArtists } from '@/hooks/useCommunityPosts';
import { useReleases } from '@/hooks/useReleases';
import { useUniversalTrackPlayback } from '@/hooks/useUniversalTrackPlayback';
import { pubkeyToNpub } from '@/lib/artistUtils';
import { cn } from '@/lib/utils';
import type { ReleaseTrack } from '@/types/music';

interface FeaturedArtistsProps {
  limit?: number;
  className?: string;
}

/**
 * FeaturedArtists component that displays active artists with track counts
 * and clickable profile links
 */
export function FeaturedArtists({ limit = 6, className }: FeaturedArtistsProps) {
  const { data: featuredArtists, isLoading: isLoadingFeatured } = useFeaturedArtists(limit);
  const { data: releases } = useReleases();

  // Calculate track counts for each artist (only artist-created tracks)
  const artistTrackCounts = React.useMemo(() => {
    if (!releases) return new Map<string, number>();
    
    const counts = new Map<string, number>();
    releases.forEach(release => {
      if (release.artistPubkey) {
        // Only count tracks where the track's artistPubkey matches the release artist
        const artistCreatedTracks = release.tracks?.filter(track => 
          track.artistPubkey === release.artistPubkey
        ) || [];
        
        const currentCount = counts.get(release.artistPubkey) || 0;
        counts.set(release.artistPubkey, currentCount + artistCreatedTracks.length);
      }
    });
    
    return counts;
  }, [releases]);

  // Find latest track for each artist
  const artistLatestTracks = React.useMemo(() => {
    if (!releases) return new Map<string, ReleaseTrack>();
    
    const latestTracks = new Map<string, ReleaseTrack>();
    
    releases.forEach(release => {
      if (release.artistPubkey) {
        // Find artist-created tracks in this release
        const artistTracks = release.tracks?.filter(track => 
          track.artistPubkey === release.artistPubkey
        ) || [];
        
        artistTracks.forEach(track => {
          const existing = latestTracks.get(release.artistPubkey);
          
          // Compare by release date first, then by track creation if available
          const trackDate = release.publishDate;
          const existingDate = existing ? 
            releases.find(r => r.tracks?.some(t => t === existing))?.publishDate : 
            null;
          
          if (!existing || !existingDate || trackDate > existingDate) {
            latestTracks.set(release.artistPubkey, track);
          }
        });
      }
    });
    
    return latestTracks;
  }, [releases]);

  if (isLoadingFeatured) {
    return (
      <div className={cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4', className)}>
        {[...Array(limit)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <Skeleton className="w-12 h-12 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <Skeleton className="h-5 w-12" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!featuredArtists || featuredArtists.length === 0) {
    return (
      <div className={cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4', className)}>
        <Card className="border-dashed">
          <CardContent className="py-8 text-center">
            <Users className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Discover Artists</p>
            <p className="text-sm text-muted-foreground mt-1">
              Explore the growing community of musicians on Nostr
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4', className)}>
      {featuredArtists.map((artist) => {
        const trackCount = artistTrackCounts.get(artist.pubkey) || 0;
        const latestTrack = artistLatestTracks.get(artist.pubkey);
        const npub = artist.npub || pubkeyToNpub(artist.pubkey);
        const profileUrl = `/${npub}`;

        return (
          <ArtistCard
            key={artist.pubkey}
            artist={artist}
            trackCount={trackCount}
            latestTrack={latestTrack}
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
  latestTrack?: ReleaseTrack;
  profileUrl: string;
}

function ArtistCard({ artist, trackCount, latestTrack, profileUrl }: ArtistCardProps) {
  const trackPlayback = useUniversalTrackPlayback(
    latestTrack ? {
      id: `artist-${artist.pubkey}`,
      title: `${artist.name || 'Artist'} - Latest`,
      tracks: [latestTrack],
      artistPubkey: artist.pubkey,
      publishDate: new Date(),
      createdAt: new Date(),
      eventId: '',
      identifier: '',
      tags: [],
      imageUrl: latestTrack.imageUrl || artist.image
    } : null
  );

  const handleTrackPlay = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (trackPlayback?.hasPlayableTracks) {
      trackPlayback.handleReleasePlay();
    }
  };

  return (
    <Link to={profileUrl} className="group">
      <Card className="h-full hover:border-primary/50 transition-all duration-200 hover:shadow-md">
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            {/* Artist Image and Name */}
            <div className="flex-1">
              <ArtistLinkWithImage
                pubkey={artist.pubkey}
                artistInfo={artist}
                disabled={true} // Disable the internal link since the card is clickable
                className="group-hover:text-primary transition-colors"
                textSize="text-sm font-medium"
                imageSize="w-12 h-12"
              />
              
              {/* Track Count */}
              <div className="flex items-center gap-2 mt-2">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Music className="w-3 h-3" />
                  <span>{trackCount} track{trackCount !== 1 ? 's' : ''}</span>
                </div>
                
                {/* Activity Score Badge */}
                {artist.activityScore && artist.activityScore > 0 && (
                  <Badge variant="secondary" className="text-xs bg-primary/10 text-primary">
                    Active
                  </Badge>
                )}
              </div>

              {/* Latest Track Preview */}
              {latestTrack && latestTrack.audioUrl && (
                <div className="mt-3 p-2 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="w-6 h-6 p-0 rounded-full bg-primary/10 hover:bg-primary/20"
                      onClick={handleTrackPlay}
                    >
                      {trackPlayback?.isReleasePlaying ? (
                        <Pause className="w-3 h-3" fill="currentColor" />
                      ) : (
                        <Play className="w-3 h-3 ml-0.5" fill="currentColor" />
                      )}
                    </Button>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">
                        {latestTrack.title}
                      </p>
                      <p className="text-xs text-muted-foreground">Latest track</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Arrow indicator */}
            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all duration-200 flex-shrink-0 mt-1" />
          </div>
        </CardContent>
      </Card>
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
        <h2 className="text-2xl font-bold">Featured Artists</h2>
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