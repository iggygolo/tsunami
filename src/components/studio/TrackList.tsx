import { Edit, Trash2, Music, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TrackEditDialog } from '../TrackEditDialog';
import { formatDurationHuman } from '@/lib/audioDuration';

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
}

export function TrackList({ 
  tracks, 
  onAddTrack, 
  onEditTrack, 
  onRemoveTrack 
}: TrackListProps) {
  return (
    <div className="space-y-4">
      {/* Tracks List */}
      {tracks.length > 0 ? (
        <div className="space-y-2">
          {tracks.map((track, index) => (
            <div key={index} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Music className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span className="font-medium truncate">{track.title}</span>
                  {track.explicit && (
                    <Badge variant="secondary" className="text-xs">
                      Explicit
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  {track.duration && (
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{formatDurationHuman(track.duration)}</span>
                    </div>
                  )}
                  {track.language && (
                    <span>Language: {track.language}</span>
                  )}
                </div>
                {track.audioUrl && (
                  <div className="text-xs text-muted-foreground font-mono truncate mt-1">
                    {track.audioUrl}
                  </div>
                )}
              </div>
              
              <div className="flex items-center gap-1 ml-4">
                <TrackEditDialog
                  mode="edit"
                  editingTrack={track}
                  onSaveTrack={(updatedTrack, audioFile) => onEditTrack(index, updatedTrack, audioFile)}
                  onAddTrack={onAddTrack}
                >
                  <Button variant="ghost" size="sm">
                    <Edit className="w-4 h-4" />
                  </Button>
                </TrackEditDialog>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemoveTrack(index)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-6 text-muted-foreground border border-dashed rounded-lg">
          <Music className="w-6 h-6 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No tracks added yet</p>
        </div>
      )}

      {/* Add New Track Button */}
      <div className="flex justify-center pt-2">
        <TrackEditDialog mode="add" onAddTrack={onAddTrack} onSaveTrack={() => {}}>
          <Button variant="outline">
            <Music className="w-4 h-4 mr-2" />
            Add Track
          </Button>
        </TrackEditDialog>
      </div>
    </div>
  );
}