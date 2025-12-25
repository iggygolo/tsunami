import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Edit, Trash2, ListMusic, Calendar, MoreVertical, Users, Lock, Eye, Play, Pause } from 'lucide-react';
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
import { useMusicPlaylists } from '@/hooks/useMusicPlaylists';
import { useDeletePlaylist } from '@/hooks/usePublishPlaylist';
import { useToast } from '@/hooks/useToast';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import type { MusicPlaylistData } from '@/types/music';

interface PlaylistManagerProps {
  onEditPlaylist?: (playlistId: string) => void;
  onDeletePlaylist?: (playlistId: string) => void;
  onCreatePlaylist?: () => void;
}

export function PlaylistManager({
  onEditPlaylist,
  onDeletePlaylist,
  onCreatePlaylist,
}: PlaylistManagerProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { playRelease, pause, state } = useAudioPlayer();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'title' | 'tracks'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const { data: playlists, isLoading, error } = useMusicPlaylists({
    sortBy,
    sortOrder,
    includePrivate: true, // Show all playlists including private ones
  });

  const { mutate: deletePlaylist, isPending: isDeleting } = useDeletePlaylist();

  // Filter playlists based on search query
  const filteredPlaylists = useMemo(() => {
    if (!playlists) return [];
    
    if (!searchQuery.trim()) return playlists;
    
    const query = searchQuery.toLowerCase();
    return playlists.filter(playlist => 
      playlist.title.toLowerCase().includes(query) ||
      playlist.description?.toLowerCase().includes(query) ||
      playlist.categories?.some(category => category.toLowerCase().includes(query))
    );
  }, [playlists, searchQuery]);

  const handleEditPlaylist = (playlist: MusicPlaylistData) => {
    if (onEditPlaylist) {
      onEditPlaylist(playlist.identifier);
    } else {
      navigate(`/studio/playlists/edit/${playlist.identifier}`);
    }
  };

  const handleDeletePlaylist = (playlist: MusicPlaylistData) => {
    if (!playlist.eventId) {
      toast({
        title: 'Cannot delete playlist',
        description: 'Playlist event ID not found.',
        variant: 'destructive',
      });
      return;
    }

    if (confirm(`Are you sure you want to delete "${playlist.title}"? This action cannot be undone.`)) {
      deletePlaylist(playlist.eventId, {
        onSuccess: () => {
          toast({
            title: 'Playlist deleted',
            description: `"${playlist.title}" has been deleted successfully.`,
          });
          if (onDeletePlaylist) {
            onDeletePlaylist(playlist.identifier);
          }
        },
        onError: (error) => {
          toast({
            title: 'Failed to delete playlist',
            description: error instanceof Error ? error.message : 'An error occurred',
            variant: 'destructive',
          });
        },
      });
    }
  };

  const handleCreatePlaylist = () => {
    if (onCreatePlaylist) {
      onCreatePlaylist();
    } else {
      navigate('/studio/playlists/new');
    }
  };

  const handlePlay = (playlist: MusicPlaylistData) => {
    // Check if playlist has tracks
    if (!playlist.tracks || playlist.tracks.length === 0) {
      toast({
        title: 'Cannot play playlist',
        description: 'This playlist is empty.',
        variant: 'destructive',
      });
      return;
    }

    // Check if this playlist is currently playing
    const isCurrentPlaylist = state.currentRelease?.identifier === playlist.identifier;
    
    if (isCurrentPlaylist && state.isPlaying) {
      // If this playlist is playing, pause it
      pause();
      return;
    }

    // Show a warning that playlist playback needs track resolution
    toast({
      title: 'Playlist playback',
      description: 'Playlist playback requires track resolution. This feature is coming soon!',
    });

    // For now, we can still call playRelease but it won't have audio URLs
    // playRelease(releaseData);
  };

  const isPlaylistPlaying = (playlist: MusicPlaylistData) => {
    return state.currentRelease?.identifier === playlist.identifier && state.isPlaying;
  };

  const formatDate = (date?: Date) => {
    if (!date) return 'Unknown';
    return date.toLocaleDateString();
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-foreground mb-2">Failed to load playlists</h3>
          <p className="text-muted-foreground mb-4">
            {error instanceof Error ? error.message : 'An error occurred while loading your playlists.'}
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
          <h1 className="text-2xl font-bold text-foreground">Playlists</h1>
          <p className="text-muted-foreground">
            {isLoading ? 'Loading...' : `${filteredPlaylists.length} playlist${filteredPlaylists.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <Button onClick={handleCreatePlaylist} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          New Playlist
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search playlists by title, description, or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex gap-2">
          <Select value={sortBy} onValueChange={(value: 'date' | 'title' | 'tracks') => setSortBy(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">Date</SelectItem>
              <SelectItem value="title">Title</SelectItem>
              <SelectItem value="tracks">Tracks</SelectItem>
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

      {/* Playlist Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="aspect-square bg-muted rounded-lg mb-4"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                  <div className="h-3 bg-muted rounded w-1/4"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredPlaylists.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <ListMusic className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            {searchQuery ? 'No playlists found' : 'No playlists yet'}
          </h3>
          <p className="text-muted-foreground mb-4">
            {searchQuery 
              ? 'Try adjusting your search terms or filters.'
              : 'Start organizing your tracks by creating your first playlist.'
            }
          </p>
          {!searchQuery && (
            <Button onClick={handleCreatePlaylist} className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Create Your First Playlist
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPlaylists.map((playlist) => (
            <Card key={playlist.identifier} className="group hover:shadow-lg transition-shadow duration-200">
              <CardContent className="p-4">
                {/* Cover Art */}
                <div className="aspect-square bg-muted rounded-lg mb-4 overflow-hidden relative">
                  {playlist.imageUrl ? (
                    <img
                      src={playlist.imageUrl}
                      alt={`${playlist.title} cover`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ListMusic className="w-12 h-12 text-muted-foreground/50" />
                    </div>
                  )}
                  
                  {/* Play Button Overlay */}
                  {playlist.tracks && playlist.tracks.length > 0 && (
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Button
                        size="lg"
                        variant="secondary"
                        className="rounded-full w-12 h-12 p-0 bg-white hover:bg-white/90 text-black border-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePlay(playlist);
                        }}
                      >
                        {isPlaylistPlaying(playlist) ? (
                          <Pause className="w-6 h-6" />
                        ) : (
                          <Play className="w-6 h-6 ml-1" />
                        )}
                      </Button>
                    </div>
                  )}
                </div>

                {/* Playlist Info */}
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground truncate" title={playlist.title}>
                        {playlist.title}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {playlist.tracks.length} track{playlist.tracks.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEditPlaylist(playlist)}>
                          <Edit className="w-4 h-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleDeletePlaylist(playlist)}
                          className="text-red-600"
                          disabled={isDeleting}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Description */}
                  {playlist.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2" title={playlist.description}>
                      {playlist.description}
                    </p>
                  )}

                  {/* Metadata */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(playlist.createdAt)}
                    </div>
                  </div>

                  {/* Categories */}
                  {playlist.categories && playlist.categories.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {playlist.categories.slice(0, 3).map((category) => (
                        <Badge key={category} variant="secondary" className="text-xs">
                          {category}
                        </Badge>
                      ))}
                      {playlist.categories.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{playlist.categories.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}

                  {/* Stats */}
                  {(playlist.zapCount || playlist.totalSats) && (
                    <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t">
                      {playlist.zapCount && (
                        <span>⚡ {playlist.zapCount} zaps</span>
                      )}
                      {playlist.totalSats && (
                        <span>💰 {playlist.totalSats} sats</span>
                      )}
                    </div>
                  )}

                  {/* Track Preview */}
                  {playlist.tracks.length > 0 && (
                    <div className="pt-2 border-t">
                      <p className="text-xs text-muted-foreground mb-1">Recent tracks:</p>
                      <div className="space-y-1">
                        {playlist.tracks.slice(0, 2).map((track, index) => (
                          <div key={track.identifier} className="flex items-center gap-2 text-xs">
                            <span className="text-muted-foreground/70">{index + 1}.</span>
                            <span className="truncate" title={track.title}>
                              {track.title || 'Unknown Track'}
                            </span>
                          </div>
                        ))}
                        {playlist.tracks.length > 2 && (
                          <p className="text-xs text-muted-foreground/70">
                            +{playlist.tracks.length - 2} more tracks
                          </p>
                        )}
                      </div>
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