import { useSeoMeta } from '@unhead/react';
import { Globe, Rss, Zap, Hash, Play, Music, MessageCircle, Share2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Layout } from '@/components/Layout';
import { ZapDialog } from '@/components/ZapDialog';
import { useAuthor } from '@/hooks/useAuthor';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { usePodcastStats } from '@/hooks/usePodcastReleases';
import { usePodcastConfig } from '@/hooks/usePodcastConfig';
import { getArtistPubkeyHex } from '@/lib/musicConfig';

const About = () => {
  const { data: stats } = usePodcastStats();
  const { data: artist } = useAuthor(getArtistPubkeyHex());
  const { user } = useCurrentUser();
  const podcastConfig = usePodcastConfig();

  useSeoMeta({
    title: `About - ${podcastConfig.music.artistName}`,
    description: podcastConfig.music.description,
  });

  return (
    <Layout>
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-secondary/10">
        <div className="absolute inset-0 bg-grid-pattern opacity-5" />
        <div className="container mx-auto px-4 py-12 relative">
          <div className="max-w-4xl mx-auto">
            <div className="flex flex-col md:flex-row items-center gap-8">
              {/* Artist Image */}
              {podcastConfig.music.image && (
                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-primary to-secondary rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-500" />
                  <img
                    src={podcastConfig.music.image}
                    alt={podcastConfig.music.artistName}
                    className="relative w-48 h-48 md:w-56 md:h-56 rounded-2xl object-cover shadow-2xl"
                  />
                </div>
              )}

              {/* Artist Info */}
              <div className="flex-1 text-center md:text-left space-y-4">
                <div className="space-y-2">
                  <Badge variant="primary" className="mb-2">
                    <Sparkles className="w-3 h-3 mr-1" />
                    Value4Value Music
                  </Badge>
                  <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
                    {podcastConfig.music.artistName}
                  </h1>
                </div>

                <p className="text-lg text-muted-foreground leading-relaxed max-w-xl">
                  {podcastConfig.music.description}
                </p>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-3 justify-center md:justify-start pt-2">
                  {artist?.metadata?.website && (
                    <Button variant="outline" asChild>
                      <a href={artist.metadata.website} target="_blank" rel="noopener noreferrer">
                        <Globe className="w-4 h-4 mr-2" />
                        Website
                      </a>
                    </Button>
                  )}

                  <Button variant="outline" asChild>
                    <a href={`https://njump.me/${podcastConfig.artistNpub}`} target="_blank" rel="noopener noreferrer">
                      <Hash className="w-4 h-4 mr-2" />
                      Nostr
                    </a>
                  </Button>

                  {artist?.event && user && (artist.metadata?.lud16 || artist.metadata?.lud06) ? (
                    <ZapDialog target={artist.event}>
                      <Button variant="outline" className="w-full border-yellow-500/50 hover:bg-yellow-500/10">
                        <Zap className="w-4 h-4 mr-2 text-yellow-500" />
                        Zap the Artist
                      </Button>
                    </ZapDialog>
                  ) : user ? null : (
                    <Button variant="outline" disabled>
                      <Zap className="w-4 h-4 mr-2" />
                      Login to Zap
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-4">
        <div className="max-w-4xl mx-auto space-y-12">
          {/* Stats Section */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="text-center p-6 bg-gradient-to-br from-primary/5 to-transparent border-primary/20 hover:border-primary/40 transition-colors">
                <CardContent className="p-0 space-y-2">
                  <Music className="w-8 h-8 mx-auto text-primary" />
                  <div className="text-3xl font-bold">{stats.totalReleases}</div>
                  <div className="text-sm text-muted-foreground">Releases</div>
                </CardContent>
              </Card>

              <Card className="text-center p-6 bg-gradient-to-br from-yellow-500/10 to-transparent border-yellow-500/20 hover:border-yellow-500/40 transition-colors">
                <CardContent className="p-0 space-y-2">
                  <Zap className="w-8 h-8 mx-auto text-yellow-500" />
                  <div className="text-3xl font-bold">{stats.totalZaps}</div>
                  <div className="text-sm text-muted-foreground">Zaps</div>
                </CardContent>
              </Card>

              <Card className="text-center p-6 bg-gradient-to-br from-blue-500/10 to-transparent border-blue-500/20 hover:border-blue-500/40 transition-colors">
                <CardContent className="p-0 space-y-2">
                  <MessageCircle className="w-8 h-8 mx-auto text-blue-500" />
                  <div className="text-3xl font-bold">{stats.totalComments}</div>
                  <div className="text-sm text-muted-foreground">Comments</div>
                </CardContent>
              </Card>

              <Card className="text-center p-6 bg-gradient-to-br from-green-500/10 to-transparent border-green-500/20 hover:border-green-500/40 transition-colors">
                <CardContent className="p-0 space-y-2">
                  <Share2 className="w-8 h-8 mx-auto text-green-500" />
                  <div className="text-3xl font-bold">{stats.totalReposts}</div>
                  <div className="text-sm text-muted-foreground">Reposts</div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Subscribe & Support */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full -translate-y-1/2 translate-x-1/2" />
              <CardContent className="p-6 space-y-4 relative">
                <div className="flex items-center gap-2">
                  <Rss className="w-5 h-5 text-orange-500" />
                  <h3 className="font-semibold text-lg">Subscribe</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Subscribe to the RSS feed in your favorite value4value music app to get notified of new releases.
                </p>
                <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white" asChild>
                  <a href="/rss.xml" target="_blank" rel="noopener noreferrer">
                    <Rss className="w-4 h-4 mr-2" />
                    RSS Feed
                  </a>
                </Button>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/10 rounded-full -translate-y-1/2 translate-x-1/2" />
              <CardContent className="p-6 space-y-4 relative">
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-yellow-500" />
                  <h3 className="font-semibold text-lg">Support</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Support by zapping releases, sharing with friends, and engaging with the community.
                </p>
                {artist?.event && user && (artist.metadata?.lud16 || artist.metadata?.lud06) ? (
                  <ZapDialog target={artist.event}>
                      <Button className="bg-yellow-500 hover:bg-yellow-600 text-yellow-950">
                        <Zap className="w-4 h-4 mr-2" />
                        Zap the Artist
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
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default About;