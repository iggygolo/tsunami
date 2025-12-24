import { useSeoMeta } from '@unhead/react';
import { Layout } from '@/components/Layout';
import { ReleaseList } from '@/components/music/ReleaseList';
import { PODCAST_CONFIG } from '@/lib/podcastConfig';

const Releases = () => {
  useSeoMeta({
    title: `Releases - ${PODCAST_CONFIG.podcast.artistName}`,
    description: `Browse all releases of ${PODCAST_CONFIG.podcast.artistName}`,
  });

  return (
    <Layout>
      <div className="container mx-auto px-4 py-4">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-foreground via-primary to-purple-600 bg-clip-text text-transparent">All Releases</h1>
            <p className="text-muted-foreground">
              Browse and listen to all releases of {PODCAST_CONFIG.podcast.artistName}
            </p>
          </div>

          <ReleaseList showSearch useCache />
        </div>
      </div>
    </Layout>
  );
};

export default Releases;