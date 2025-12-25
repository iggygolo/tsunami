import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PlaylistForm } from '@/components/studio/PlaylistForm';
import { usePublishPlaylist } from '@/hooks/usePublishPlaylist';
import { useToast } from '@/hooks/useToast';
import type { MusicPlaylistFormData } from '@/types/music';

export function CreatePlaylistPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { mutate: publishPlaylist } = usePublishPlaylist();

  const handleSubmit = async (formData: MusicPlaylistFormData) => {
    setIsSubmitting(true);
    
    publishPlaylist(formData, {
      onSuccess: (eventId) => {
        toast({
          title: 'Playlist created',
          description: `"${formData.title}" has been published successfully.`,
        });
        navigate('/studio/playlists');
      },
      onError: (error) => {
        toast({
          title: 'Failed to create playlist',
          description: error instanceof Error ? error.message : 'An error occurred',
          variant: 'destructive',
        });
      },
      onSettled: () => {
        setIsSubmitting(false);
      },
    });
  };

  const handleCancel = () => {
    navigate('/studio/playlists');
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/studio/playlists')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Playlists
          </Button>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Create New Playlist</h1>
          <p className="text-muted-foreground">
            Organize your tracks into a playlist and share it with your audience.
          </p>
        </div>

        {/* Form */}
        <PlaylistForm
          mode="create"
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isSubmitting={isSubmitting}
          submitButtonText="Create Playlist"
        />
      </div>
    </div>
  );
}