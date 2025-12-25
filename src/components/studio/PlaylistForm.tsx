import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Upload, Save, Loader2, Plus, X, Music, GripVertical, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useToast } from '@/hooks/useToast';
import { useMusicTracks } from '@/hooks/useMusicTracks';
import { getAllGenres, POPULAR_GENRES } from '@/lib/musicMetadata';
import type { MusicPlaylistFormData, MusicPlaylistData, TrackReference, MusicTrackData } from '@/types/music';

// Schema for playlist form
const playlistFormSchema = z.object({
  title: z.string().min(1, 'Playlist title is required').max(200, 'Playlist title too long'),
  description: z.string().max(1000, 'Description too long').optional(),
  imageUrl: z.string().url().optional().or(z.literal('')),
  genres: z.array(z.string()).default([]),
});

type PlaylistFormValues = z.infer<typeof playlistFormSchema>;

interface PlaylistFormProps {
  mode: 'create' | 'edit';
  playlist?: MusicPlaylistData;
  onSubmit: (data: MusicPlaylistFormData) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
  submitButtonText?: string;
  submitButtonLoadingText?: string;
}

export function PlaylistForm({
  mode,
  playlist,
  onSubmit,
  onCancel,
  isSubmitting,
  submitButtonText,
  submitButtonLoadingText,
}: PlaylistFormProps) {
  const { toast } = useToast();
  
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [selectedGenre, setSelectedGenre] = useState('');
  const [selectedTracks, setSelectedTracks] = useState<TrackReference[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const isEditMode = mode === 'edit' && playlist;

  // Get all available genres (same as used for tracks)
  const allGenres = getAllGenres();

  // Fetch available tracks
  const { data: availableTracks, isLoading: tracksLoading } = useMusicTracks();

  const form = useForm<PlaylistFormValues>({
    resolver: zodResolver(playlistFormSchema),
    defaultValues: {
      title: '',
      description: '',
      imageUrl: '',
      genres: []
    },
  });

  const { watch, setValue, reset } = form;
  const genres = watch('genres');

  // Load playlist data when available (for edit mode)
  useEffect(() => {
    if (isEditMode) {
      reset({
        title: playlist.title,
        description: playlist.description || '',
        imageUrl: playlist.imageUrl || '',
        genres: playlist.categories || [], // Map categories to genres for backward compatibility
      });
      setSelectedTracks(playlist.tracks || []);
    }
  }, [playlist, reset, isEditMode]);

  // Filter available tracks based on search
  const filteredTracks = availableTracks?.filter(track => 
    !searchQuery || 
    track.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    track.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
    track.album?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast({
          title: 'Invalid file type',
          description: 'Please select an image file.',
          variant: 'destructive',
        });
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: 'File too large',
          description: 'Image file must be less than 10MB.',
          variant: 'destructive',
        });
        return;
      }

      setImageFile(file);
      setValue('imageUrl', '');

      toast({
        title: 'Playlist image selected',
        description: `${file.name} (${(file.size / 1024 / 1024).toFixed(1)}MB)`,
      });
    }
  };

  const addGenre = () => {
    if (selectedGenre && !genres.includes(selectedGenre)) {
      setValue('genres', [...genres, selectedGenre]);
      setSelectedGenre('');
    }
  };

  const removeGenre = (genreToRemove: string) => {
    setValue('genres', genres.filter(genre => genre !== genreToRemove));
  };

  const addTrackToPlaylist = (track: MusicTrackData) => {
    const trackRef: TrackReference = {
      kind: 36787,
      pubkey: track.artistPubkey || '',
      identifier: track.identifier,
      title: track.title,
      artist: track.artist,
    };

    if (!selectedTracks.find(t => t.identifier === track.identifier)) {
      setSelectedTracks([...selectedTracks, trackRef]);
      toast({
        title: 'Track added',
        description: `"${track.title}" has been added to the playlist.`,
      });
    }
  };

  const removeTrackFromPlaylist = (identifier: string) => {
    setSelectedTracks(selectedTracks.filter(track => track.identifier !== identifier));
  };

  const moveTrack = (fromIndex: number, toIndex: number) => {
    const newTracks = [...selectedTracks];
    const [movedTrack] = newTracks.splice(fromIndex, 1);
    newTracks.splice(toIndex, 0, movedTrack);
    setSelectedTracks(newTracks);
  };

  // Drag and drop state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', ''); // Required for Firefox
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== dropIndex) {
      moveTrack(draggedIndex, dropIndex);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleSubmit = async (data: PlaylistFormValues) => {
    try {
      if (selectedTracks.length === 0) {
        toast({
          title: 'No tracks selected',
          description: 'Please add at least one track to the playlist.',
          variant: 'destructive',
        });
        return;
      }

      const playlistData: MusicPlaylistFormData = {
        title: data.title,
        trackReferences: selectedTracks,
        description: data.description,
        imageFile: imageFile || undefined,
        imageUrl: data.imageUrl || undefined,
        categories: data.genres || undefined, // Map genres back to categories for API compatibility
      };

      await onSubmit(playlistData);
    } catch (error) {
      // Error handling is done in the parent component
      throw error;
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>
            {isEditMode ? 'Edit Playlist' : 'Create New Playlist'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">

              {/* Basic Information */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Cover Art */}
                <div className="space-y-4">
                  <Label className="text-base font-semibold">Playlist Cover</Label>
                  
                  <div className="aspect-square w-full max-w-sm">
                    {(imageFile || (isEditMode && playlist?.imageUrl)) ? (
                      <div className="relative w-full h-full group cursor-pointer">
                        <img 
                          src={imageFile ? URL.createObjectURL(imageFile) : playlist?.imageUrl} 
                          alt="Playlist cover" 
                          className="w-full h-full rounded-lg object-cover border shadow-lg transition-all duration-200 group-hover:brightness-75"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all duration-200 rounded-lg flex items-center justify-center">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageFileChange}
                            className="hidden"
                            id="image-upload"
                          />
                          <label htmlFor="image-upload" className="cursor-pointer">
                            <div className="bg-background/90 hover:bg-background transition-colors duration-200 rounded-lg px-4 py-2 flex items-center gap-2 shadow-lg">
                              <Upload className="w-4 h-4 text-foreground" />
                              <span className="text-sm font-medium text-foreground">Change Image</span>
                            </div>
                          </label>
                        </div>
                      </div>
                    ) : (
                      <div className="w-full h-full border-2 border-dashed border-muted-foreground/30 rounded-lg flex flex-col items-center justify-center hover:border-muted-foreground/50 hover:bg-muted/30 transition-all duration-200 cursor-pointer group">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageFileChange}
                          className="hidden"
                          id="image-upload"
                        />
                        <label htmlFor="image-upload" className="cursor-pointer flex flex-col items-center justify-center w-full h-full">
                          <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center mb-4 group-hover:bg-muted/80 transition-colors duration-200">
                            <Upload className="w-8 h-8 text-muted-foreground group-hover:text-foreground transition-colors duration-200" />
                          </div>
                          <p className="text-muted-foreground font-medium mb-1 group-hover:text-foreground transition-colors duration-200">Upload Cover</p>
                          <p className="text-sm text-muted-foreground group-hover:text-foreground transition-colors duration-200">Click to select image</p>
                        </label>
                      </div>
                    )}
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="imageUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            placeholder="Or paste image URL..."
                            disabled={!!imageFile}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-6">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-semibold">Playlist Title *</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Enter playlist title..." 
                            className="h-12 text-lg"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-semibold">Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Brief description of the playlist..."
                            rows={4}
                            className="resize-none"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Genres */}
                  <div className="space-y-3">
                    <Label className="text-base font-semibold">Genres</Label>
                    <div className="flex gap-2">
                      <Select value={selectedGenre} onValueChange={setSelectedGenre}>
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Select a genre..." />
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                          {/* Popular genres first */}
                          {POPULAR_GENRES.filter(genre => !genres.includes(genre)).length > 0 && (
                            <>
                              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                Popular
                              </div>
                              {POPULAR_GENRES.filter(genre => !genres.includes(genre)).map((genre) => (
                                <SelectItem key={genre} value={genre}>
                                  {genre}
                                </SelectItem>
                              ))}
                              <div className="border-t my-1" />
                            </>
                          )}
                          
                          {/* All other genres */}
                          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            All Genres
                          </div>
                          {allGenres.filter(genre => !genres.includes(genre) && !POPULAR_GENRES.includes(genre)).map((genre) => (
                            <SelectItem key={genre} value={genre}>
                              {genre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button 
                        type="button" 
                        onClick={addGenre} 
                        variant="outline"
                        disabled={!selectedGenre || genres.includes(selectedGenre)}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                    {genres.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {genres.map((genre) => (
                          <Badge key={genre} variant="secondary" className="text-sm">
                            {genre}
                            <button
                              type="button"
                              onClick={() => removeGenre(genre)}
                              className="ml-2 hover:text-red-500"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Track Selection */}
              <div className="space-y-6 border-t pt-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Available Tracks */}
                  <div className="space-y-4">
                    <Label className="text-base font-semibold">Available Tracks</Label>
                    
                    <div className="relative">
                      <Input
                        placeholder="Search tracks..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                      <Music className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    </div>

                    <div className="border rounded-lg max-h-96 overflow-y-auto">
                      {tracksLoading ? (
                        <div className="p-4 text-center text-muted-foreground">Loading tracks...</div>
                      ) : filteredTracks.length === 0 ? (
                        <div className="p-4 text-center text-muted-foreground">
                          {searchQuery ? 'No tracks found' : 'No tracks available'}
                        </div>
                      ) : (
                        <div className="divide-y">
                          {filteredTracks.map((track) => (
                            <div
                              key={track.identifier}
                              className="p-3 hover:bg-muted cursor-pointer flex items-center justify-between"
                              onClick={() => addTrackToPlaylist(track)}
                            >
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <div className="w-10 h-10 bg-muted rounded flex items-center justify-center flex-shrink-0">
                                  {track.imageUrl ? (
                                    <img
                                      src={track.imageUrl}
                                      alt={track.title}
                                      className="w-full h-full object-cover rounded"
                                    />
                                  ) : (
                                    <Music className="w-4 h-4 text-muted-foreground" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-sm truncate">{track.title}</p>
                                  <p className="text-xs text-muted-foreground truncate">{track.artist}</p>
                                  {track.album && (
                                    <p className="text-xs text-muted-foreground/70 truncate">{track.album}</p>
                                  )}
                                </div>
                              </div>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                disabled={selectedTracks.some(t => t.identifier === track.identifier)}
                              >
                                <Plus className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Selected Tracks */}
                  <div className="space-y-4">
                    <Label className="text-base font-semibold">
                      Playlist Tracks ({selectedTracks.length})
                    </Label>

                    <div className="border rounded-lg max-h-96 overflow-y-auto">
                      {selectedTracks.length === 0 ? (
                        <div className="p-4 text-center text-muted-foreground">
                          No tracks added yet. Select tracks from the left to add them to your playlist.
                        </div>
                      ) : (
                        <div className="divide-y">
                          {selectedTracks.map((track, index) => (
                            <div
                              key={track.identifier}
                              className={`p-3 flex items-center gap-3 transition-colors ${
                                draggedIndex === index ? 'opacity-50' : ''
                              } ${
                                dragOverIndex === index ? 'bg-primary/10 border-primary/20' : ''
                              }`}
                              draggable
                              onDragStart={(e) => handleDragStart(e, index)}
                              onDragOver={(e) => handleDragOver(e, index)}
                              onDragLeave={handleDragLeave}
                              onDrop={(e) => handleDrop(e, index)}
                              onDragEnd={handleDragEnd}
                            >
                              <div className="cursor-move" title="Drag to reorder">
                                <GripVertical className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                              </div>
                              <div className="text-sm text-muted-foreground w-6">
                                {index + 1}.
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">{track.title}</p>
                                <p className="text-xs text-muted-foreground truncate">{track.artist}</p>
                              </div>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => removeTrackFromPlaylist(track.identifier)}
                                title="Remove from playlist"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex justify-end gap-4 pt-8 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting} size="lg">
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {submitButtonLoadingText || (isEditMode ? 'Updating...' : 'Creating...')}
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      {submitButtonText || (isEditMode ? 'Update Playlist' : 'Create Playlist')}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}