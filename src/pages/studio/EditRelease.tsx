import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { ReleaseForm } from '@/components/studio/ReleaseForm';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useUpdateRelease } from '@/hooks/usePublishRelease';
import { usePodcastRelease } from '@/hooks/useReleases';
import { useToast } from '@/hooks/useToast';
import { isArtist } from '@/lib/musicConfig';
import type { ReleaseFormData } from '@/types/music';

const EditRelease = () => {
  const navigate = useNavigate();
  const { releaseId } = useParams<{ releaseId: string }>();
  const { user } = useCurrentUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: release, isLoading: isLoadingRelease, error } = usePodcastRelease(releaseId!);
  const { mutateAsync: updateRelease, isPending: isUpdating } = useUpdateRelease();

  // Check if user is the artist
  useEffect(() => {
    if (!user || !isArtist(user.pubkey)) {
      navigate('/studio/releases');
    }
  }, [user, navigate]);

  if (!user || !isArtist(user.pubkey)) {
    return null;
  }

  if (isLoadingRelease) {
    return (
      <div className="py-4">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex items-center space-x-2">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span>Loading release...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error || !release) {
    return (
      <div className="py-4">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">Release not found</h2>
            <p className="text-muted-foreground mb-4">
              The release you're looking for doesn't exist or you don't have permission to edit it.
            </p>
            <Button onClick={() => navigate('/studio/releases')}>
              Back to Releases
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (releaseData: ReleaseFormData) => {
    try {
      await updateRelease({
        releaseId: release.eventId,
        releaseIdentifier: release.identifier,
        releaseData
      });

      // Invalidate release queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['release'] });
      queryClient.invalidateQueries({ queryKey: ['releases'] });
      queryClient.invalidateQueries({ queryKey: ['podcast-release'] });

      toast({
        title: 'Release updated!',
        description: 'Your release has been updated successfully.',
      });

      // Navigate back to releases page
      navigate('/studio/releases');
    } catch (error) {
      console.error('Error updating release:', error);
      toast({
        title: 'Failed to update release',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
      throw error; // Re-throw to let the form handle it
    }
  };

  const handleCancel = () => {
    navigate('/studio/releases');
  };

  return (
    <div className="py-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/studio/releases')}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Releases</span>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Edit Release</h1>
            <p className="text-muted-foreground">
              Update your release details and metadata
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <ReleaseForm
        mode="edit"
        release={release}
        releaseId={releaseId}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isSubmitting={isUpdating}
        submitButtonText="Update Release"
        submitButtonLoadingText="Updating..."
      />
    </div>
  );
};

export default EditRelease;