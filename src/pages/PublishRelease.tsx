import { useSeoMeta } from '@unhead/react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Layout } from '@/components/Layout';
import { PublishReleaseForm } from '@/components/podcast/PublishReleaseForm';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { isPodcastCreator } from '@/lib/podcastConfig';

const PublishRelease = () => {
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const isCreator = user && isPodcastCreator(user.pubkey);

  useSeoMeta({
    title: 'Publish Release - PODSTR',
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

  if (!isCreator) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-md mx-auto text-center">
            <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
            <p className="text-muted-foreground mb-6">
              Only the podcast creator can publish releases.
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
            onSuccess={handleSuccess}
            onCancel={handleCancel}
          />
        </div>
      </div>
    </Layout>
  );
};

export default PublishRelease;