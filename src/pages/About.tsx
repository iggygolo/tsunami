import { useSeoMeta } from '@unhead/react';
import { Globe, Rss, Zap, Hash, Play, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Layout } from '@/components/Layout';
import { ZapDialog } from '@/components/ZapDialog';
import { useAuthor } from '@/hooks/useAuthor';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { usePodcastStats } from '@/hooks/usePodcastReleases';
import { usePodcastTrailers } from '@/hooks/usePodcastTrailers';
import { usePodcastConfig } from '@/hooks/usePodcastConfig';
import { getArtistPubkeyHex } from '@/lib/podcastConfig';

const About = () => {
  const { data: stats } = usePodcastStats();
  const { data: artist } = useAuthor(getArtistPubkeyHex());
  const { data: trailers } = usePodcastTrailers();
  const { user } = useCurrentUser();
  const podcastConfig = usePodcastConfig();

  // Get the most recent trailer for showcase
  const featuredTrailer = trailers?.[0]; // Already sorted by date (newest first)

  useSeoMeta({
    title: `About - ${podcastConfig.podcast.artistName}`,
    description: podcastConfig.podcast.description,
  });

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* Podcast Description */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <span>{podcastConfig.podcast.artistName}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {podcastConfig.podcast.image && (
                    <img
                      src={podcastConfig.podcast.image}
                      alt={podcastConfig.podcast.artistName}
                      className="w-full max-w-sm rounded-lg object-cover"
                    />
                  )}

                  <p className="text-muted-foreground leading-relaxed">
                    {podcastConfig.podcast.description}
                  </p>

                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-3 pt-2">
                      {artist?.metadata?.website && (
                        <Button variant="outline" size="sm" asChild>
                          <a href={artist.metadata.website} target="_blank" rel="noopener noreferrer">
                            <Globe className="w-4 h-4 mr-2" />
                            Website
                          </a>
                        </Button>
                      )}

                      <Button variant="outline" size="sm" asChild>
                        <a href={`https://njump.me/${podcastConfig.artistNpub}`} target="_blank" rel="noopener noreferrer">
                          <Hash className="w-4 h-4 mr-2" />
                          Nostr
                        </a>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Trailer Showcase */}
              {featuredTrailer && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Play className="w-5 h-5" />
                      <span>Trailer</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h3 className="font-medium mb-2">{featuredTrailer.title}</h3>
                      {featuredTrailer.season && (
                        <p className="text-sm text-muted-foreground mb-3">
                          Season {featuredTrailer.season} trailer
                        </p>
                      )}
                    </div>

                    {/* Media Player */}
                    <div className="space-y-3">
                      {featuredTrailer.type?.startsWith('video/') ? (
                        <div className="bg-black rounded-lg overflow-hidden">
                          <video 
                            controls 
                            className="w-full h-auto"
                            preload="metadata"
                            poster="" // Could add a poster frame if available
                          >
                            <source src={featuredTrailer.url} type={featuredTrailer.type} />
                            <p className="text-white p-4">
                              Your browser doesn't support HTML5 video. 
                              <a href={featuredTrailer.url} className="text-blue-300 underline">
                                Download the video
                              </a> instead.
                            </p>
                          </video>
                        </div>
                      ) : (
                        <audio 
                          controls 
                          className="w-full"
                          preload="metadata"
                        >
                          <source src={featuredTrailer.url} type={featuredTrailer.type || 'audio/mpeg'} />
                          <p className="text-muted-foreground">
                            Your browser doesn't support HTML5 audio. 
                            <a href={featuredTrailer.url} className="text-blue-600 underline">
                              Download the audio
                            </a> instead.
                          </p>
                        </audio>
                      )}
                      
                      <div className="text-xs text-muted-foreground">
                        <span>
                          Published {featuredTrailer.pubDate.toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    {trailers && trailers.length > 1 && (
                      <div className="pt-2 border-t">
                        <p className="text-sm text-muted-foreground">
                          <span className="font-medium">{trailers.length} trailers</span> available. 
                          Check out our releases to discover more content!
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Statistics */}
              {stats && (
                <Card>
                  <CardHeader>
                    <CardTitle>Stats</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div>
                        <div className="text-2xl font-bold">{stats.totalReleases}</div>
                        <div className="text-xs text-muted-foreground">Releases</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold">{stats.totalZaps}</div>
                        <div className="text-xs text-muted-foreground">Zaps</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold">{stats.totalComments}</div>
                        <div className="text-xs text-muted-foreground">Comments</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold">{stats.totalReposts}</div>
                        <div className="text-xs text-muted-foreground">Reposts</div>
                      </div>
                    </div>

                    <Separator />

                    {stats.mostZappedRelease && (
                      <div>
                        <h4 className="font-medium mb-2">Most Zapped Release</h4>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {stats.mostZappedRelease.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {stats.mostZappedRelease.zapCount} zaps
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Subscribe */}
              <Card>
                <CardHeader>
                  <CardTitle>Subscribe</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button className="w-full" asChild>
                    <a href="/rss.xml" target="_blank" rel="noopener noreferrer">
                      <Rss className="w-4 h-4 mr-2" />
                      RSS Feed
                    </a>
                  </Button>

                  <p className="text-xs text-muted-foreground">
                    Subscribe to the RSS feed in your favorite value4value music app to get notified of new releases.
                  </p>
                </CardContent>
              </Card>

              {/* Support */}
              <Card>
                <CardHeader>
                  <CardTitle>Support</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Support us by zapping albums, sharing with friends, and engaging with the community.
                  </p>

                  {artist?.event && user && (artist.metadata?.lud16 || artist.metadata?.lud06) ? (
                    <ZapDialog target={artist.event}>
                      <Button variant="outline" className="w-full">
                        <Zap className="w-4 h-4 mr-2" />
                        Zap the Show
                      </Button>
                    </ZapDialog>
                  ) : (
                    <Button variant="outline" className="w-full" disabled>
                      <Zap className="w-4 h-4 mr-2" />
                      {!user ? "Login to Zap" : "Artist has no Lightning address"}
                    </Button>
                  )}
                </CardContent>
              </Card>

              {/* Copyright */}
              <Card>
                <CardContent className="pt-6">
                  <p className="text-xs text-muted-foreground text-center">
                    {podcastConfig.podcast.copyright}
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default About;