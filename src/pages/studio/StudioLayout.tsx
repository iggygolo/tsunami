import { useSeoMeta } from '@unhead/react';
import { useNavigate, useLocation, Outlet, Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Layout } from '@/components/Layout';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { isArtist } from '@/lib/musicConfig';
import { Settings, Volume2, Server, Zap } from 'lucide-react';

const StudioLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useCurrentUser();
  const isArtist_user = user && isArtist(user.pubkey);

  useSeoMeta({
    title: 'Studio',
    description: 'Manage your artist profile and publish new releases',
  });

  // Redirect /studio to /studio/settings
  if (location.pathname === '/studio') {
    return <Navigate to="/studio/settings" replace />;
  }

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

  const navigationItems = [
    {
      path: '/studio/settings',
      label: 'Artist Settings',
      icon: Settings,
    },
    {
      path: '/studio/releases',
      label: 'Releases',
      icon: Volume2,
    },
    {
      path: '/studio/providers',
      label: 'Upload Providers',
      icon: Server,
    },
    {
      path: '/studio/analytics',
      label: 'Analytics',
      icon: Zap,
    },
  ];

  return (
    <Layout>
      <div className="py-4">
        {/* Navigation */}
        <div className="flex flex-wrap gap-2 mb-2 border-b pb-2">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.includes(item.path);
            
            return (
              <Button
                key={item.path}
                variant={isActive ? "default" : "ghost"}
                onClick={() => navigate(item.path)}
                className="flex items-center space-x-2"
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </Button>
            );
          })}
        </div>

        {/* Page Content */}
        <Outlet />
      </div>
    </Layout>
  );
};

export default StudioLayout;