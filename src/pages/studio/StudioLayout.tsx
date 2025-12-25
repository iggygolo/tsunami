import { useSeoMeta } from '@unhead/react';
import { useNavigate, Outlet } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Layout } from '@/components/Layout';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { isArtist } from '@/lib/musicConfig';

const StudioLayout = () => {
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const isArtist_user = user && isArtist(user.pubkey);

  useSeoMeta({
    title: 'Studio',
    description: 'Manage your tracks, playlists, and artist profile',
  });

  if (!user) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <Card className="max-w-md mx-auto">
            <CardContent className="p-6 text-center">
              <h2 className="text-xl font-semibold mb-4">Login Required</h2>
              <p className="text-muted-foreground mb-4">
                You need to be logged in to access the Studio.
              </p>
              <Button onClick={() => navigate('/')}>
                Go to Homepage
              </Button>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  if (!isArtist_user) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <Card className="max-w-md mx-auto">
            <CardContent className="p-6 text-center">
              <h2 className="text-xl font-semibold mb-4">Access Denied</h2>
              <p className="text-muted-foreground mb-4">
                Only the music artist can access the Studio.
              </p>
              <Button onClick={() => navigate('/')}>
                Go to Homepage
              </Button>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="py-2">
        {/* Page Content - Navigation is now handled by main Navigation component */}
        <Outlet />
      </div>
    </Layout>
  );
};

export default StudioLayout;