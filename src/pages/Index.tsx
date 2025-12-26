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
import { FeaturedArtistsSection } from '@/components/community/FeaturedArtists';
import { TsunamiStats } from '@/components/community/TsunamiStats';
import { useLatestReleaseCache, useStaticReleaseCache } from '@/hooks/useStaticReleaseCache';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useUniversalTrackPlayback } from '@/hooks/useUniversalTrackPlayback';
import { generateReleaseLink } from '@/lib/nip19Utils';
import { ArtistLinkWithImage } from '@/components/music/ArtistLink';

const Index = () => {
  const { data: latestRelease, isLoading: isLoadingLatest } = useLatestReleaseCache();
  const { data: allReleases } = useStaticReleaseCache();
  const { user } = useCurrentUser();
  const { toast } = useToast();

  // Overall loading state
  const isLoading = isLoadingLatest;
  
  // Stats for Explore cards
  const releaseCount = allReleases?.length || 0;

  // Use track playback hook for latest release (always call hook, but pass null if no release)
  const trackPlayback = useUniversalTrackPlayback(latestRelease || null);

  // Debug logging to understand the release data
  console.log('Index.tsx - Latest release debug:', {
    hasLatestRelease: !!latestRelease,
    releaseTitle: latestRelease?.title,
    tracksCount: latestRelease?.tracks?.length || 0,
    tracksWithAudio: latestRelease?.tracks?.filter(t => t.audioUrl).length || 0,
    isPlayable: trackPlayback?.hasPlayableTracks,
    isLoading: isLoading
  });

  const handlePlayLatestRelease = () => {
    if (trackPlayback?.hasPlayableTracks) {
      trackPlayback.handleReleasePlay();
    } else if (latestRelease) {
      toast({
        title: "Cannot play release",
        description: "This release has no playable tracks available.",
        variant: "destructive",
      });
    }
  };

  // Check if the latest release is playable
  const isLatestReleasePlayable = trackPlayback?.hasPlayableTracks || false;

  useSeoMeta({
    title: 'Tsunami - Decentralized Music Discovery',
    description: 'Discover music from artists on Nostr - the decentralized music platform connecting artists and fans worldwide',
  });

  return (
    <Layout>
      {/* Hero Section with Latest Release */}
      {isLoading ? (
        /* Loading skeleton for latest release */
        <div className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-secondary/10">
          <div className="absolute inset-0 bg-grid-pattern opacity-5" />
          <div className="container mx-auto px-4 py-12 relative">
            <div className="max-w-6xl mx-auto">
              <div className="flex flex-col lg:flex-row items-center gap-8">
                {/* Album Art Skeleton */}
                <div className="relative group flex-shrink-0">
                  <Skeleton className="w-64 h-64 lg:w-72 lg:h-72 rounded-2xl" />
                </div>

                {/* Release Info Skeleton */}
                <div className="flex-1 text-center lg:text-left space-y-4">
                  <div className="space-y-2">
                    <Skeleton className="h-6 w-32 mx-auto lg:mx-0" />
                    <Skeleton className="h-12 w-3/4 mx-auto lg:mx-0" />
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 justify-center lg:justify-start">
                      <Skeleton className="h-6 w-48" />
                    </div>
                  </div>
                  <Skeleton className="h-16 w-full max-w-xl mx-auto lg:mx-0" />
                  <div className="flex flex-wrap gap-3 justify-center lg:justify-start">
                    <Skeleton className="h-12 w-24" />
                    <Skeleton className="h-12 w-32" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : latestRelease ? (
        <div className="relative -mx-4 px-4 py-12">
          <BlurredBackground image={latestRelease.imageUrl} />
          <div className="absolute inset-0 bg-grid-pattern opacity-5" />
          <div className="relative">
            <div className="flex flex-col lg:flex-row justify-center items-center gap-8">
                {/* Album Art */}
                {latestRelease.imageUrl && (
                  <div className="relative group flex-shrink-0">
                    <div className="absolute -inset-2 bg-gradient-to-r from-primary to-secondary rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-500" />
                    <img
                      src={latestRelease.imageUrl}
                      alt={latestRelease.title}
                      className="relative w-64 h-64 lg:w-72 lg:h-72 rounded-2xl object-cover shadow-2xl"
                    />
                    <button
                      onClick={handlePlayLatestRelease}
                      disabled={!isLatestReleasePlayable || trackPlayback?.isReleaseLoading}
                      className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg">
                        {trackPlayback?.isReleasePlaying ? (
                          <Pause className="w-8 h-8 text-black" fill="currentColor" />
                        ) : (
                          <Play className="w-8 h-8 text-black ml-1" fill="currentColor" />
                        )}
                      </div>
                    </button>
                  </div>
                )}

                {/* Release Info */}
                <div className="flex-shrink-0 text-center lg:text-left space-y-4">
                  <div className="space-y-2">
                    <Badge variant="primary" className="mb-2">
                      <Sparkles className="w-3 h-3 mr-1" />
                      Latest Release
                    </Badge>
                    <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight break-words hyphens-auto max-w-64 lg:max-w-72 mx-auto lg:mx-0">
                      <Link 
                        to={generateReleaseLink(latestRelease.artistPubkey, latestRelease.identifier)}
                        className="text-white drop-shadow-lg hover:text-white/90 transition-colors"
                      >
                        {latestRelease.title}
                      </Link>
                    </h1>
                    <div className="flex flex-col lg:flex-row items-center gap-2 sm:gap-4">
                      {/* Artist Attribution with multi-artist support */}
                      {latestRelease.artistPubkey && (
                        <ArtistLinkWithImage 
                          pubkey={latestRelease.artistPubkey}
                          className="text-lg text-white/90 hover:text-white transition-colors drop-shadow-md"
                        />
                      )}

                      {latestRelease.tags && latestRelease.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 justify-center lg:justify-start">
                          {latestRelease.tags.slice(0, 3).map((tag) => (
                            <Badge key={tag} variant="outline" className="text-xs bg-white/10 border-white/20 text-white/90">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {latestRelease.description && (
                    <p className="text-white/90 leading-relaxed max-w-xl line-clamp-2 drop-shadow-md">
                      {latestRelease.description}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-3 justify-center lg:justify-start pt-2">
                    <Button 
                      onClick={handlePlayLatestRelease} 
                      disabled={!isLatestReleasePlayable || trackPlayback?.isReleaseLoading}
                      size="lg" 
                      className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white border-0 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                    >
                      {trackPlayback?.isReleasePlaying ? (
                        <>
                          <Pause className="w-5 h-5 mr-2" fill="currentColor" />
                          Pause
                        </>
                      ) : (
                        <>
                          <Play className="w-5 h-5 mr-2" fill="currentColor" />
                          {isLatestReleasePlayable ? 'Play' : 'No Audio Available'}
                        </>
                      )}
                    </Button>

                    {latestRelease.totalSats && latestRelease.totalSats > 0 && (
                      <Badge variant="outline" className="h-11 px-4 text-sm bg-yellow-500/20 border-yellow-500/30 text-yellow-300 backdrop-blur-sm">
                        <Zap className="w-4 h-4 mr-1" />
                        {latestRelease.totalSats.toLocaleString()} sats
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
      ) : (
        /* No Latest Release - Show Welcome Message */
        <div className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-secondary/10">
          <div className="absolute inset-0 bg-grid-pattern opacity-5" />
          <div className="container mx-auto px-4 py-12 relative">
            <div className="max-w-4xl mx-auto text-center space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-center gap-2 mb-4">
                  <Globe className="w-8 h-8 text-primary" />
                  <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight">
                    Welcome to Tsunami
                  </h1>
                </div>
                <p className="text-xl text-muted-foreground">
                  The decentralized music platform connecting artists and fans worldwide
                </p>
              </div>
              
              <div className="bg-muted/50 rounded-lg p-6 space-y-4">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Music className="w-6 h-6 text-primary" />
                  <h3 className="text-lg font-semibold">Discover Music on Nostr</h3>
                </div>
                <p className="text-muted-foreground">
                  Explore music from independent artists, support creators directly with Lightning payments, and join a global community of music lovers.
                </p>
                <div className="flex flex-wrap gap-3 justify-center">
                  <Button asChild>
                    <Link to="/releases">
                      <Headphones className="w-4 h-4 mr-2" />
                      Browse Music
                    </Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link to="/community">
                      <Users className="w-4 h-4 mr-2" />
                      Join Community
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 py-4">
        <div className="max-w-6xl mx-auto space-y-12">
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
              limit={6}
              useCache={true}
              excludeLatest={true}
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