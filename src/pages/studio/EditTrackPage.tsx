import { useNavigate, useParams } from 'react-router-dom';
import { TrackForm } from '@/components/studio/TrackForm';
import { useMusicTrack } from '@/hooks/useMusicTracks';
import { useUpdateTrack } from '@/hooks/usePublishTrack';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useToast } from '@/hooks/useToast';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft } from 'lucide-react';
import type { MusicTrackFormData } from '@/types/music';

export function EditTrackPage() {
  const navigate = useNavigate();
  const { trackId } = useParams<{ trackId: string }>();
  const { toast } = useToast();
  const { user } = useCurrentUser();
  
  // Only fetch track if trackId exists and belongs to the current user
  const { data: track, isLoading, error } = useMusicTrack(trackId!, user?.pubkey || '');
  const { mutate: updateTrack, isPending } = useUpdateTrack();

  // Early return if trackId is missing
  if (!trackId) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Track Not Found</h1>
          <p className="text-muted-foreground mb-6">The track you're looking for could not be found.</p>
          <Button onClick={() => navigate('/studio/tracks')}>
            Back to Tracks
          </Button>
        </div>
      </div>
    );
  }

  const handleSubmit = async (data: MusicTrackFormData) => {
    if (!trackId) return;

    updateTrack({
      trackIdentifier: trackId,
      formData: data,
    }, {
      onSuccess: (eventId) => {
        toast({
          title: 'Track updated successfully!',
          description: `Your track "${data.title}" has been updated.`,
        });
        navigate('/studio/tracks');
      },
      onError: (error) => {
        toast({
          title: 'Failed to update track',
          description: error instanceof Error ? error.message : 'An error occurred while updating your track.',
          variant: 'destructive',
        });
      },
    });
  };

  const handleCancel = () => {
    navigate('/studio/tracks');
  };

  if (!trackId) {
    return (
      <div className="container mx-auto px-4 py-6">
        <Card>
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-semibold mb-4">Invalid Track ID</h2>
            <p className="text-muted-foreground mb-4">The track ID is missing from the URL.</p>
            <Button onClick={() => navigate('/studio/tracks')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Tracks
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <Card>
          <CardContent className="p-6 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Loading Track</h2>
            <p className="text-muted-foreground">Please wait while we load your track...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !track) {
    return (
      <div className="container mx-auto px-4 py-6">
        <Card>
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-semibold mb-4">Track Not Found</h2>
            <p className="text-muted-foreground mb-4">
              {error instanceof Error ? error.message : 'The requested track could not be found.'}
            </p>
            <Button onClick={() => navigate('/studio/tracks')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Tracks
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <TrackForm
        mode="edit"
        track={track}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isSubmitting={isPending}
      />
    </div>
  );
}