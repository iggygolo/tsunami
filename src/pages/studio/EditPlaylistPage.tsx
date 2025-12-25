import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PlaylistForm } from '@/components/studio/PlaylistForm';
import { useUpdatePlaylist } from '@/hooks/usePublishPlaylist';
import { useMusicPlaylist } from '@/hooks/useMusicPlaylists';
import { useToast } from '@/hooks/useToast';
import type { MusicPlaylistFormData } from '@/types/music';

export function EditPlaylistPage() {
  const navigate = useNavigate();
  const { playlistId } = useParams<{ playlistId: string }>();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { data: playlist, isLoading, error } = useMusicPlaylist(playlistId || '');
  const { mutate: updatePlaylist } = useUpdatePlaylist();

  // Redirect if no playlist ID
  useEffect(() => {
    if (!playlistId) {
      navigate('/studio/playlists');
    }
  }, [playlistId, navigate]);

  const handleSubmit = async (formData: MusicPlaylistFormData) => {
    if (!playlistId) return;
    
    setIsSubmitting(true);
    
    updatePlaylist(
      { playlistIdentifier: playlistId, formData },
      {
        onSuccess: (eventId) => {
          toast({
            title: 'Playlist updated',
            description: `"${formData.title}" has been updated successfully.`,
          });
          navigate('/studio/playlists');
        },
        onError: (error) => {
          toast({
            title: 'Failed to update playlist',
            description: error instanceof Error ? error.message : 'An error occurred',
            variant: 'destructive',
          });
        },
        onSettled: () => {
          setIsSubmitting(false);
        },
      }
    );
  };

  const handleCancel = () => {
    navigate('/studio/playlists');
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-4xl mx-auto">
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

          <div className="flex items-center justify-center py-12">
            <div className="flex items-center gap-3">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="text-muted-foreground">Loading playlist...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !playlist) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-4xl mx-auto">
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

          <div className="flex flex-col items-center justify-center py-12">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-foreground mb-2">Playlist not found</h3>
              <p className="text-muted-foreground mb-4">
                {error instanceof Error ? error.message : 'The playlist you\'re looking for doesn\'t exist or couldn\'t be loaded.'}
              </p>
              <Button onClick={() => navigate('/studio/playlists')}>
                Back to Playlists
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Convert playlist data to form data
  const initialFormData: MusicPlaylistFormData = {
    title: playlist.title,
    description: playlist.description || '',
    imageUrl: playlist.imageUrl,
    trackReferences: playlist.tracks,
    categories: playlist.categories,
    isPublic: playlist.isPublic,
    isPrivate: playlist.isPrivate,
    isCollaborative: playlist.isCollaborative,
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
          <h1 className="text-3xl font-bold text-foreground mb-2">Edit Playlist</h1>
          <p className="text-muted-foreground">
            Update your playlist details and track selection.
          </p>
        </div>

        {/* Form */}
        <PlaylistForm
          mode="edit"
          playlist={playlist}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isSubmitting={isSubmitting}
          submitButtonText="Update Playlist"
        />
      </div>
    </div>
  );
}