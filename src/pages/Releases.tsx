import { useSeoMeta } from '@unhead/react';
import { Layout } from '@/components/Layout';
import { ReleaseList } from '@/components/music/ReleaseList';

const Releases = () => {
  useSeoMeta({
    title: 'Music Releases - Nostr Music Discovery',
    description: 'Browse and discover music releases from artists on Nostr',
  });

  return (
    <Layout>
      <div className="py-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-foreground via-primary to-purple-600 bg-clip-text text-transparent">All Releases</h1>
          <p className="text-muted-foreground">
            Discover and listen to music from artists on Nostr
          </p>
        </div>

        <ReleaseList showSearch showArtistFilter useCache cacheType="all" />
      </div>
    </Layout>
  );
};

export default Releases;