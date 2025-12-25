import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Edit, Trash2, Music, Clock, Calendar, MoreVertical } from 'lucide-react';
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
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to load tracks</h3>
          <p className="text-gray-600 mb-4">
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Track Library</h1>
          <p className="text-gray-600">
            {isLoading ? 'Loading...' : `${filteredTracks.length} track${filteredTracks.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <Button onClick={() => navigate('/studio/tracks/new')} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          New Track
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search tracks by title, artist, album, or genre..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex gap-2">
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
      </div>

      {/* Track Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="aspect-square bg-gray-200 rounded-lg mb-4"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredTracks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Music className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">
            {searchQuery ? 'No tracks found' : 'No tracks yet'}
          </h3>
          <p className="text-gray-600 mb-4">
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTracks.map((track) => (
            <Card key={track.identifier} className="group hover:shadow-lg transition-shadow duration-200">
              <CardContent className="p-4">
                {/* Cover Art */}
                <div className="aspect-square bg-gray-100 rounded-lg mb-4 overflow-hidden">
                  {track.imageUrl ? (
                    <img
                      src={track.imageUrl}
                      alt={`${track.title} cover`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Music className="w-12 h-12 text-gray-300" />
                    </div>
                  )}
                </div>

                {/* Track Info */}
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate" title={track.title}>
                        {track.title}
                      </h3>
                      <p className="text-sm text-gray-600 truncate" title={track.artist}>
                        {track.artist}
                      </p>
                    </div>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreVertical className="w-4 h-4" />
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

                  {/* Album */}
                  {track.album && (
                    <p className="text-xs text-gray-500 truncate" title={track.album}>
                      {track.album}
                    </p>
                  )}

                  {/* Description */}
                  {track.description && (
                    <p className="text-xs text-gray-600 line-clamp-2" title={track.description}>
                      {track.description}
                    </p>
                  )}

                  {/* Metadata */}
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDuration(track.duration)}
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(track.createdAt)}
                    </div>
                  </div>

                  {/* Genres */}
                  {track.genres && track.genres.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {track.genres.slice(0, 3).map((genre) => (
                        <Badge key={genre} variant="secondary" className="text-xs">
                          {genre}
                        </Badge>
                      ))}
                      {track.genres.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{track.genres.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}

                  {/* Stats */}
                  {(track.zapCount || track.totalSats) && (
                    <div className="flex items-center gap-4 text-xs text-gray-500 pt-2 border-t">
                      {track.zapCount && (
                        <span>⚡ {track.zapCount} zaps</span>
                      )}
                      {track.totalSats && (
                        <span>💰 {track.totalSats} sats</span>
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