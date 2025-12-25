import { Edit, Trash2, Music, Clock, Play, Pause } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import { formatDurationHuman } from '@/lib/audioDuration';
import type { MusicRelease } from '@/types/music';

interface TrackData {
  title: string;
  audioUrl: string;
  duration?: number;
  explicit: boolean;
  language: string | null;
}

interface TrackListProps {
  tracks: TrackData[];
  onAddTrack: (track: TrackData, audioFile?: File) => void;
  onEditTrack: (index: number, track: TrackData, audioFile?: File) => void;
  onRemoveTrack: (index: number) => void;
  releaseId?: string; // Add releaseId for navigation
  releaseTitle?: string; // Add release title for creating mock releases
}

export function TrackList({ 
  tracks, 
  onAddTrack, 
  onEditTrack, 
  onRemoveTrack,
  releaseId = 'new', // Default for new releases
  releaseTitle = 'Untitled Release'
}: TrackListProps) {
  const navigate = useNavigate();
  const { playRelease, pause, state: playerState } = useAudioPlayer();

  // Helper function to create a mock release for a track
  const createMockRelease = (track: TrackData, index: number): MusicRelease => ({
    id: `${releaseId}-track-${index}`,
    eventId: `${releaseId}-track-${index}`,
    identifier: `${releaseId}-track-${index}`,
    title: releaseTitle,
    description: '',
    imageUrl: '',
    publishDate: new Date(),
    createdAt: new Date(),
    artistPubkey: '',
    tags: [],
    tracks: [{
      title: track.title,
      audioUrl: track.audioUrl,
      duration: track.duration,
      explicit: track.explicit,
      language: track.language
    }],
    zapCount: 0,
    commentCount: 0,
    repostCount: 0,
    genre: null
  });

  // Helper function to check if a track is currently playing
  const isTrackPlaying = (track: TrackData, index: number) => {
    const mockRelease = createMockRelease(track, index);
    return playerState.currentRelease?.id === mockRelease.id && playerState.isPlaying;
  };

  // Helper function to check if a track is the current track (playing or paused)
  const isCurrentTrack = (track: TrackData, index: number) => {
    const mockRelease = createMockRelease(track, index);
    return playerState.currentRelease?.id === mockRelease.id;
  };

  // Helper function to handle play/pause
  const handlePlayPause = (track: TrackData, index: number) => {
    if (!track.audioUrl) return;

    const mockRelease = createMockRelease(track, index);
    
    if (isCurrentTrack(track, index)) {
      if (playerState.isPlaying) {
        pause();
      } else {
        playRelease(mockRelease);
      }
    } else {
      playRelease(mockRelease);
    }
  };

  const handleEditTrack = (index: number, track: TrackData) => {
    navigate(`/studio/releases/${releaseId}/tracks/edit/${index}`, {
      state: {
        track,
        mode: 'edit',
        onSave: (updatedTrack: TrackData, audioFile?: File) => {
          onEditTrack(index, updatedTrack, audioFile);
        }
      }
    });
  };

  const handleAddTrack = () => {
    navigate(`/studio/releases/${releaseId}/tracks/add`, {
      state: {
        mode: 'add',
        onSave: (newTrack: TrackData, audioFile?: File) => {
          onAddTrack(newTrack, audioFile);
        }
      }
    });
  };
  return (
    <div className="space-y-4">
      {/* Tracks List */}
      {tracks.filter(track => track.title || track.audioUrl).length > 0 ? (
        <div className="space-y-3">
          {tracks.map((track, index) => {
            // Skip rendering tracks that are completely empty
            const hasContent = track.title || track.audioUrl;
            if (!hasContent) return null;

            return (
              <div key={index} className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                {/* Play/Pause Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handlePlayPause(track, index)}
                  disabled={!track.audioUrl}
                  className="w-10 h-10 rounded-full p-0 bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-sm transition-all duration-200 flex-shrink-0"
                >
                  {isTrackPlaying(track, index) ? (
                    <Pause className="w-5 h-5 text-white" />
                  ) : (
                    <Play className="w-5 h-5 text-white ml-0.5" />
                  )}
                </Button>

                {/* Track Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-base truncate">
                      {track.title || <span className="text-muted-foreground italic">Untitled Track</span>}
                    </span>
                    {track.explicit && (
                      <Badge variant="secondary" className="text-xs">
                        Explicit
                      </Badge>
                    )}
                    {isCurrentTrack(track, index) && (
                      <Badge variant="default" className="text-xs bg-blue-500">
                        {playerState.isPlaying ? 'Playing' : 'Paused'}
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    {track.duration && (
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{formatDurationHuman(track.duration)}</span>
                      </div>
                    )}
                    {track.language && (
                      <span>Language: {track.language}</span>
                    )}
                    {!track.audioUrl && (
                      <span className="text-orange-500 text-xs font-medium">⚠ No audio file</span>
                    )}
                    {!track.title && (
                      <span className="text-red-500 text-xs font-medium">⚠ No title</span>
                    )}
                  </div>
                  
                  {track.audioUrl && (
                    <div className="text-xs text-muted-foreground font-mono truncate mt-1 opacity-60">
                      {track.audioUrl}
                    </div>
                  )}
                </div>
                
                {/* Action Buttons */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => handleEditTrack(index, track)}
                    className="h-8 w-8 p-0"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemoveTrack(index)}
                    className="text-destructive hover:text-destructive h-8 w-8 p-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            );
          }).filter(Boolean)}
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
          <Music className="w-8 h-8 mx-auto mb-3 opacity-50" />
          <h3 className="font-medium mb-1">No tracks added yet</h3>
          <p className="text-sm mb-4">Add your first track to get started</p>
          <Button variant="outline" onClick={handleAddTrack} size="sm">
            <Music className="w-4 h-4 mr-2" />
            Add First Track
          </Button>
        </div>
      )}

      {/* Add New Track Button */}
      {tracks.length > 0 && (
        <div className="flex justify-center pt-4">
          <Button variant="outline" onClick={handleAddTrack}>
            <Music className="w-4 h-4 mr-2" />
            Add Another Track
          </Button>
        </div>
      )}
    </div>
  );
}