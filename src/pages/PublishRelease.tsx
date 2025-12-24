import { useSeoMeta } from '@unhead/react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Layout } from '@/components/Layout';
import { PublishReleaseForm } from '@/components/music/PublishReleaseForm';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { isArtist } from '@/lib/musicConfig';

const PublishRelease = () => {
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const isArtist_user = user && isArtist(user.pubkey);

  useSeoMeta({
    title: 'Publish Release',
    description: 'Publish a new release',
  });

  const handleSuccess = (_releaseId: string) => {
    navigate('/');
  };

  const handleCancel = () => {
    navigate('/');
  };

  if (!user) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-md mx-auto text-center">
            <h1 className="text-2xl font-bold mb-4">Authentication Required</h1>
            <p className="text-muted-foreground mb-6">
              You must be logged in to publish releases.
            </p>
            <Button asChild>
              <Link to="/">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Go Back
              </Link>
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  if (!isArtist_user) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-md mx-auto text-center">
            <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
            <p className="text-muted-foreground mb-6">
              Only the music artist can publish releases.
            </p>
            <Button asChild>
              <Link to="/">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Go Back
              </Link>
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Publish New Release</h1>
            <p className="text-muted-foreground">
              Create and publish a new release
            </p>
          </div>

          <PublishReleaseForm
            className="pt-8"
            onSuccess={handleSuccess}
            onCancel={handleCancel}
          />
        </div>
      </div>
    </Layout>
  );
};

export default PublishRelease;