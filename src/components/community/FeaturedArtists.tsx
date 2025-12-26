import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, ChevronRight } from 'lucide-react';
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

  // Get all tracks for each artist
  const artistTracks = React.useMemo(() => {
    if (!releases) return new Map<string, ReleaseTrack[]>();
    
    const tracks = new Map<string, ReleaseTrack[]>();
    releases.forEach(release => {
      if (release.artistPubkey) {
        // Only include tracks where the track's artistPubkey matches the release artist
        const artistCreatedTracks = release.tracks?.filter(track => 
          track.artistPubkey === release.artistPubkey
        ) || [];
        
        const currentTracks = tracks.get(release.artistPubkey) || [];
        tracks.set(release.artistPubkey, [...currentTracks, ...artistCreatedTracks]);
      }
    });
    
    return tracks;
  }, [releases]);

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
        const trackCount = artistTrackCounts.get(artist.pubkey) || 0;
        const tracks = artistTracks.get(artist.pubkey) || [];
        const npub = artist.npub || pubkeyToNpub(artist.pubkey);
        const profileUrl = `/${npub}`;

        return (
          <ArtistCard
            key={artist.pubkey}
            artist={artist}
            trackCount={trackCount}
            tracks={tracks}
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
  tracks: ReleaseTrack[];
  profileUrl: string;
}

function ArtistCard({ artist, trackCount, tracks, profileUrl }: ArtistCardProps) {
  // Create a virtual release for playback
  const artistRelease = React.useMemo(() => {
    if (!tracks.length) return null;
    
    const releaseId = `artist-${artist.pubkey}`;
    return {
      id: releaseId,
      title: `${artist.name || 'Artist'} - All Tracks`,
      tracks,
      artistPubkey: artist.pubkey,
      publishDate: new Date(),
      createdAt: new Date(),
      eventId: releaseId, // Use the same ID for eventId so the comparison works
      identifier: releaseId,
      tags: [],
      imageUrl: artist.image
    };
  }, [artist, tracks]);

  const trackPlayback = useUniversalTrackPlayback(artistRelease);

  const handleProfileClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (trackPlayback?.hasPlayableTracks) {
      trackPlayback.handleReleasePlay();
    }
  };

  return (
    <div className="flex flex-col items-center text-center group">
      {/* Circular Profile Image with Play Button */}
      <div className="relative mb-4">
        <Button
          variant="ghost"
          size="sm"
          className="p-0 h-auto hover:bg-transparent relative"
          onClick={handleProfileClick}
        >
          <div className="w-32 h-32 rounded-full overflow-hidden bg-muted/30 hover:scale-105 transition-transform duration-200">
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
          
          {/* Play Button Overlay */}
          {trackPlayback?.hasPlayableTracks && (
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center shadow-lg backdrop-blur-sm">
                <div className="w-0 h-0 border-l-[8px] border-l-black border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent ml-1" />
              </div>
            </div>
          )}
        </Button>
      </div>

      {/* Artist Info */}
      <Link to={profileUrl} className="group-link hover:text-primary transition-colors">
        <h3 className="text-lg font-semibold text-foreground mb-1">
          {artist.name || 'Unknown Artist'}
        </h3>
      </Link>
    </div>
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