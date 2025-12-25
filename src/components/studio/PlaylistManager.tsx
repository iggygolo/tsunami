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
import { useUniversalAudioPlayer, musicTrackToUniversal } from '@/contexts/UniversalAudioPlayerContext';
import { usePlaylistTrackResolution } from '@/hooks/usePlaylistTrackResolution';
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
  const { playQueue, pause, state } = useUniversalAudioPlayer();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'title' | 'tracks'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const { data: playlists, isLoading, error } = useMusicPlaylists({
    sortBy,
    sortOrder,
    includePrivate: true, // Show all playlists including private ones
  });

  const { mutate: deletePlaylist, isPending: isDeleting } = useDeletePlaylist();

  // Get all track references from all playlists for batch resolution
  const allTrackReferences = playlists?.flatMap(playlist => playlist.tracks) || [];
  
  // Resolve all track references at once for better performance
  const { data: resolvedTracks, isLoading: isLoadingTracks } = usePlaylistTrackResolution(allTrackReferences);

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

  // Helper function to get resolved tracks for a specific playlist
  const getPlaylistResolvedTracks = (playlist: MusicPlaylistData) => {
    if (!resolvedTracks) return [];
    
    return playlist.tracks.map(trackRef => {
      return resolvedTracks.find(resolved => 
        resolved.reference.pubkey === trackRef.pubkey && 
        resolved.reference.identifier === trackRef.identifier
      );
    }).filter(Boolean);
  };

  // Helper function to get playable tracks for a playlist
  const getPlaylistPlayableTracks = (playlist: MusicPlaylistData) => {
    const resolved = getPlaylistResolvedTracks(playlist);
    return resolved
      .filter(rt => rt?.trackData && rt.trackData.audioUrl)
      .map(rt => rt!.trackData!);
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

    // Get playable tracks
    const playableTracks = getPlaylistPlayableTracks(playlist);
    
    if (playableTracks.length === 0) {
      if (isLoadingTracks) {
        toast({
          title: 'Loading tracks',
          description: 'Please wait while tracks are being loaded...',
        });
        return;
      }
      
      toast({
        title: 'Cannot play playlist',
        description: 'No playable tracks found in this playlist.',
        variant: 'destructive',
      });
      return;
    }

    // Check if this playlist is currently playing
    const isCurrentPlaylist = state.currentTrack?.source?.releaseId === playlist.eventId;
    
    if (isCurrentPlaylist && state.isPlaying) {
      // If this playlist is playing, pause it
      pause();
      return;
    }

    // Convert tracks to universal format and play
    const universalTracks = playableTracks.map(track => 
      musicTrackToUniversal(track, {
        type: 'playlist',
        releaseId: playlist.eventId,
        releaseTitle: playlist.title,
        artistPubkey: playlist.authorPubkey
      })
    );

    // Play the playlist queue
    playQueue(universalTracks, 0, playlist.title);
    
    toast({
      title: 'Playing playlist',
      description: `Started playing "${playlist.title}" with ${playableTracks.length} track${playableTracks.length === 1 ? '' : 's'}.`,
    });
  };

  const isPlaylistPlaying = (playlist: MusicPlaylistData) => {
    return state.currentTrack?.source?.releaseId === playlist.eventId && state.isPlaying;
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
    <div className="space-y-4">
      {/* Simplified Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Playlists</h1>
          <p className="text-muted-foreground text-sm">
            {isLoading ? 'Loading...' : `${filteredPlaylists.length} playlist${filteredPlaylists.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <Button onClick={handleCreatePlaylist} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          New Playlist
        </Button>
      </div>

      {/* Simplified Search and Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search playlists..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
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

      {/* Playlist Grid - Smaller Cards */}
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
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredPlaylists.map((playlist) => (
            <Card key={playlist.identifier} className="group hover:shadow-lg transition-shadow duration-200">
              <CardContent className="p-3">
                {/* Cover Art - Fill top of card */}
                <div className="aspect-square bg-muted rounded-t-lg -mx-3 -mt-3 mb-3 overflow-hidden relative">
                  {playlist.imageUrl ? (
                    <img
                      src={playlist.imageUrl}
                      alt={`${playlist.title} cover`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ListMusic className="w-8 h-8 text-muted-foreground/50" />
                    </div>
                  )}
                  
                  {/* Play Button Overlay - Smaller */}
                  {playlist.tracks && playlist.tracks.length > 0 && (
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Button
                        size="sm"
                        variant="secondary"
                        className="rounded-full w-8 h-8 p-0 bg-white hover:bg-white/90 text-black border-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePlay(playlist);
                        }}
                        disabled={isLoadingTracks || getPlaylistPlayableTracks(playlist).length === 0}
                      >
                        {isLoadingTracks ? (
                          <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                        ) : isPlaylistPlaying(playlist) ? (
                          <Pause className="w-4 h-4" />
                        ) : (
                          <Play className="w-4 h-4 ml-0.5" />
                        )}
                      </Button>
                    </div>
                  )}
                </div>

                {/* Playlist Info - Compact */}
                <div className="space-y-1">
                  <div className="flex items-start justify-between gap-1">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-foreground truncate text-sm" title={playlist.title}>
                        {playlist.title}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {playlist.tracks.length} track{playlist.tracks.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                    
                    {/* Always Visible Menu and Edit Button */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditPlaylist(playlist)}
                        className="w-6 h-6 p-0 text-muted-foreground hover:text-foreground"
                        title="Edit playlist"
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
                  </div>

                  {/* Compact Track Count with Status */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      {!isLoadingTracks && resolvedTracks ? (
                        `${getPlaylistPlayableTracks(playlist).length}/${playlist.tracks.length} playable`
                      ) : isLoadingTracks ? (
                        'Loading...'
                      ) : (
                        `${playlist.tracks.length} tracks`
                      )}
                    </span>
                    <span>{formatDate(playlist.createdAt)}</span>
                  </div>

                  {/* Categories - More Muted */}
                  {playlist.categories && playlist.categories.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {playlist.categories.slice(0, 2).map((category) => (
                        <Badge key={category} variant="outline" className="text-xs px-1 py-0 h-4 text-muted-foreground/70 border-muted-foreground/30">
                          {category}
                        </Badge>
                      ))}
                      {playlist.categories.length > 2 && (
                        <Badge variant="outline" className="text-xs px-1 py-0 h-4 text-muted-foreground/70 border-muted-foreground/30">
                          +{playlist.categories.length - 2}
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