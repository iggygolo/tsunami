import { useNavigate } from 'react-router-dom';
import { TrackForm } from '@/components/studio/TrackForm';
import { usePublishTrack } from '@/hooks/usePublishTrack';
import { useToast } from '@/hooks/useToast';
import type { MusicTrackFormData } from '@/types/music';

export function CreateTrackPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { mutate: publishTrack, isPending } = usePublishTrack();

  const handleSubmit = async (data: MusicTrackFormData) => {
    publishTrack(data, {
      onSuccess: (eventId) => {
        toast({
          title: 'Track published successfully!',
          description: `Your track "${data.title}" has been published to the network.`,
        });
        navigate('/studio/tracks');
      },
      onError: (error) => {
        toast({
          title: 'Failed to publish track',
          description: error instanceof Error ? error.message : 'An error occurred while publishing your track.',
          variant: 'destructive',
        });
      },
    });
  };

  const handleCancel = () => {
    navigate('/studio/tracks');
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <TrackForm
        mode="create"
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isSubmitting={isPending}
      />
    </div>
  );
}