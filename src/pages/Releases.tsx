import { useSeoMeta } from '@unhead/react';
import { Layout } from '@/components/Layout';
import { ReleaseList } from '@/components/podcast/ReleaseList';
import { PODCAST_CONFIG } from '@/lib/podcastConfig';

const Releases = () => {
  useSeoMeta({
    title: `Releases - ${PODCAST_CONFIG.podcast.author}`,
    description: `Browse all releases of ${PODCAST_CONFIG.podcast.author}`,
  });

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">All Releases</h1>
            <p className="text-muted-foreground">
              Browse and listen to all releases of {PODCAST_CONFIG.podcast.author}
            </p>
          </div>

          <ReleaseList showSearch _showPlayer _autoPlay />
        </div>
      </div>
    </Layout>
  );
};

export default Releases;