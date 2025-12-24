import { useSeoMeta } from '@unhead/react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Plus } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Layout } from '@/components/Layout';
import { ReleaseDialog } from '@/components/ReleaseDialog';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { isArtist } from '@/lib/musicConfig';

const PublishRelease = () => {
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const [dialogOpen, setDialogOpen] = useState(true);
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

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      navigate('/');
    }
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
      <div className="py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Publish New Release</h1>
          <p className="text-muted-foreground">
            Create and publish a new release
          </p>
        </div>

        <div className="flex justify-center">
          <ReleaseDialog
            mode="create"
            open={dialogOpen}
            onOpenChange={handleDialogClose}
            onSuccess={handleSuccess}
          >
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create New Release
            </Button>
          </ReleaseDialog>
        </div>
      </div>
    </Layout>
  );
};

export default PublishRelease;