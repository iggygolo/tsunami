import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Edit, Trash2, Music, Clock, Calendar, MoreVertical, Play, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useMusicTracks } from '@/hooks/useMusicTracks';
import { useDeleteTrack } from '@/hooks/usePublishTrack';
import { useToast } from '@/hooks/useToast';
import { useUniversalAudioPlayer, musicTrackToUniversal } from '@/contexts/UniversalAudioPlayerContext';
import type { MusicTrackData } from '@/types/music';

interface TrackLibraryProps {
  onEditTrack?: (trackId: string) => void;
  onDeleteTrack?: (trackId: string) => void;
  onAddToPlaylist?: (trackId: string) => void;
}

export function TrackLibrary({
  onEditTrack,
  onDeleteTrack,
  onAddToPlaylist,
}: TrackLibraryProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { playTrack, pause, state } = useUniversalAudioPlayer();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'title' | 'album'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const { data: tracks, isLoading, error } = useMusicTracks({
    sortBy,
    sortOrder,
  });

  const { mutate: deleteTrack, isPending: isDeleting } = useDeleteTrack();

  // Filter tracks based on search query
  const filteredTracks = useMemo(() => {
    if (!tracks) return [];
    
    if (!searchQuery.trim()) return tracks;
    
    const query = searchQuery.toLowerCase();
    return tracks.filter(track => 
      track.title.toLowerCase().includes(query) ||
      track.artist.toLowerCase().includes(query) ||
      track.description?.toLowerCase().includes(query) ||
      track.album?.toLowerCase().includes(query) ||
      track.genres?.some(genre => genre.toLowerCase().includes(query))
    );
  }, [tracks, searchQuery]);

  const handleEditTrack = (track: MusicTrackData) => {
    if (onEditTrack) {
      onEditTrack(track.identifier);
    } else {
      navigate(`/studio/tracks/edit/${track.identifier}`);
    }
  };

  const handleDeleteTrack = (track: MusicTrackData) => {
    if (!track.eventId) {
      toast({
        title: 'Cannot delete track',
        description: 'Track event ID not found.',
        variant: 'destructive',
      });
      return;
    }

    if (confirm(`Are you sure you want to delete "${track.title}"? This action cannot be undone.`)) {
      deleteTrack(track.eventId, {
        onSuccess: () => {
          toast({
            title: 'Track deleted',
            description: `"${track.title}" has been deleted successfully.`,
          });
          if (onDeleteTrack) {
            onDeleteTrack(track.identifier);
          }
        },
        onError: (error) => {
          toast({
            title: 'Failed to delete track',
            description: error instanceof Error ? error.message : 'An error occurred',
            variant: 'destructive',
          });
        },
      });
    }
  };

  const handleAddToPlaylist = (track: MusicTrackData) => {
    if (onAddToPlaylist) {
      onAddToPlaylist(track.identifier);
    } else {
      // TODO: Open playlist selection modal
      toast({
        title: 'Add to playlist',
        description: 'Playlist functionality coming soon!',
      });
    }
  };

  const handlePlay = (track: MusicTrackData) => {
    // Check if this track is currently playing
    const isCurrentTrack = state.currentTrack?.id === track.eventId;
    
    if (isCurrentTrack && state.isPlaying) {
      // If this track is playing, pause it
      pause();
    } else {
      // Convert to universal track and play
      const universalTrack = musicTrackToUniversal(track, {
        type: 'profile',
        artistPubkey: track.artistPubkey
      });
      playTrack(universalTrack, [universalTrack], track.title);
    }
  };

  const isTrackPlaying = (track: MusicTrackData) => {
    return state.currentTrack?.id === track.eventId && state.isPlaying;
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (date?: Date) => {
    if (!date) return 'Unknown';
    return date.toLocaleDateString();
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-foreground mb-2">Failed to load tracks</h3>
          <p className="text-muted-foreground mb-4">
            {error instanceof Error ? error.message : 'An error occurred while loading your tracks.'}
          </p>
          <Button onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Simplified Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Tracks</h1>
          <p className="text-muted-foreground text-sm">
            {isLoading ? 'Loading...' : `${filteredTracks.length} track${filteredTracks.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <Button onClick={() => navigate('/studio/tracks/new')} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          New Track
        </Button>
      </div>

      {/* Simplified Search and Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search tracks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={sortBy} onValueChange={(value: 'date' | 'title' | 'album') => setSortBy(value)}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="date">Date</SelectItem>
            <SelectItem value="title">Title</SelectItem>
            <SelectItem value="album">Album</SelectItem>
          </SelectContent>
        </Select>
        
        <Select value={sortOrder} onValueChange={(value: 'asc' | 'desc') => setSortOrder(value)}>
          <SelectTrigger className="w-24">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="desc">↓</SelectItem>
            <SelectItem value="asc">↑</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Track Grid - Smaller Cards */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-3">
                <div className="aspect-square bg-muted rounded-lg mb-3"></div>
                <div className="space-y-2">
                  <div className="h-3 bg-muted rounded w-3/4"></div>
                  <div className="h-2 bg-muted rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredTracks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Music className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            {searchQuery ? 'No tracks found' : 'No tracks yet'}
          </h3>
          <p className="text-muted-foreground mb-4">
            {searchQuery 
              ? 'Try adjusting your search terms or filters.'
              : 'Start building your music library by creating your first track.'
            }
          </p>
          {!searchQuery && (
            <Button onClick={() => navigate('/studio/tracks/new')} className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Create Your First Track
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredTracks.map((track) => (
            <Card key={track.identifier} className="group hover:shadow-lg transition-shadow duration-200">
              <CardContent className="p-3">
                {/* Cover Art - Fill top of card */}
                <div className="aspect-square bg-muted rounded-t-lg -mx-3 -mt-3 mb-3 overflow-hidden relative">
                  {track.imageUrl ? (
                    <img
                      src={track.imageUrl}
                      alt={`${track.title} cover`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Music className="w-8 h-8 text-muted-foreground/50" />
                    </div>
                  )}
                  
                  {/* Play Button Overlay - Smaller */}
                  {track.audioUrl && (
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Button
                        size="sm"
                        variant="secondary"
                        className="rounded-full w-8 h-8 p-0 bg-white hover:bg-white/90 text-black border-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePlay(track);
                        }}
                      >
                        {isTrackPlaying(track) ? (
                          <Pause className="w-4 h-4" />
                        ) : (
                          <Play className="w-4 h-4 ml-0.5" />
                        )}
                      </Button>
                    </div>
                  )}
                </div>

                {/* Track Info - Compact */}
                <div className="space-y-1">
                  <div className="flex items-start justify-between gap-1">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-foreground truncate text-sm" title={track.title}>
                        {track.title}
                      </h3>
                      <p className="text-xs text-muted-foreground truncate" title={track.artist}>
                        {track.artist}
                      </p>
                    </div>
                    
                    {/* Always Visible Menu and Edit Button */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditTrack(track)}
                        className="w-6 h-6 p-0 text-muted-foreground hover:text-foreground"
                        title="Edit track"
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="w-6 h-6 p-0 text-muted-foreground hover:text-foreground"
                          >
                            <MoreVertical className="w-3 h-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditTrack(track)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleAddToPlaylist(track)}>
                            <Plus className="w-4 h-4 mr-2" />
                            Add to Playlist
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDeleteTrack(track)}
                            className="text-red-600"
                            disabled={isDeleting}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {/* Compact Metadata */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      {formatDuration(track.duration)}
                    </div>
                    {track.explicit && (
                      <Badge variant="destructive" className="text-xs px-1 py-0 h-4">
                        E
                      </Badge>
                    )}
                  </div>

                  {/* Genres - More Muted */}
                  {track.genres && track.genres.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {track.genres.slice(0, 2).map((genre) => (
                        <Badge key={genre} variant="outline" className="text-xs px-1 py-0 h-4 text-muted-foreground/70 border-muted-foreground/30">
                          {genre}
                        </Badge>
                      ))}
                      {track.genres.length > 2 && (
                        <Badge variant="outline" className="text-xs px-1 py-0 h-4 text-muted-foreground/70 border-muted-foreground/30">
                          +{track.genres.length - 2}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}