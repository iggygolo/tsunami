import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ReleaseForm } from '@/components/studio/ReleaseForm';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { usePublishRelease } from '@/hooks/usePublishRelease';
import { useToast } from '@/hooks/useToast';
import { isArtist } from '@/lib/musicConfig';
import type { ReleaseFormData } from '@/types/music';

const CreateRelease = () => {
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const { toast } = useToast();
  
  const { mutateAsync: publishRelease, isPending: isPublishing } = usePublishRelease();

  // Check if user is the artist
  useEffect(() => {
    if (!user || !isArtist(user.pubkey)) {
      navigate('/studio/releases');
    }
  }, [user, navigate]);

  if (!user || !isArtist(user.pubkey)) {
    return null;
  }

  const handleSubmit = async (releaseData: ReleaseFormData) => {
    try {
      const releaseId = await publishRelease(releaseData);
      
      toast({
        title: 'Release published!',
        description: 'Your release has been published successfully.',
      });

      // Navigate back to releases page
      navigate('/studio/releases');
    } catch (error) {
      console.error('Error publishing release:', error);
      toast({
        title: 'Failed to publish release',
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
      <div className="flex items-center justify-between mb-4">
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
        </div>
      </div>

      {/* Form */}
      <ReleaseForm
        mode="create"
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isSubmitting={isPublishing}
        submitButtonText="Publish Release"
        submitButtonLoadingText="Publishing..."
      />
    </div>
  );
};

export default CreateRelease;