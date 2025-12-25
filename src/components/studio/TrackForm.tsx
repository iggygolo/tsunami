import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Upload, Save, Loader2, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { GenreSelector } from '@/components/ui/genre-selector';
import { useToast } from '@/hooks/useToast';
import { validateLanguageCode, validateGenre } from '@/lib/musicMetadata';
import type { MusicTrackFormData, MusicTrackData } from '@/types/music';

// Audio format validation
const SUPPORTED_AUDIO_FORMATS = ['mp3', 'flac', 'm4a', 'ogg', 'wav'];
const SUPPORTED_AUDIO_MIMES = [
  'audio/mpeg',
  'audio/flac', 
  'audio/mp4',
  'audio/ogg',
  'audio/wav'
];

// Schema for track form
const trackFormSchema = z.object({
  title: z.string().min(1, 'Track title is required').max(200, 'Track title too long'),
  artist: z.string().min(1, 'Artist name is required').max(100, 'Artist name too long'),
  description: z.string().max(1000, 'Description too long').optional(),
  
  // Audio validation - either file or URL required
  audioUrl: z.string().optional().refine((val) => {
    return val === undefined || val === '' || z.string().url().safeParse(val).success;
  }, {
    message: 'Invalid audio URL format'
  }),
  
  // Optional metadata
  album: z.string().max(200, 'Album name too long').optional(),
  trackNumber: z.number().positive().optional(),
  releaseDate: z.string().optional().refine((val) => {
    if (!val) return true;
    return /^\d{4}-\d{2}-\d{2}$/.test(val);
  }, {
    message: 'Release date must be in YYYY-MM-DD format'
  }),
  duration: z.number().positive().optional(),
  
  // Media URLs
  imageUrl: z.string().url().optional().or(z.literal('')),
  videoUrl: z.string().url().optional().or(z.literal('')),
  
  // Content
  lyrics: z.string().optional(),
  credits: z.string().optional(),
  language: z.string().nullable().optional().refine(validateLanguageCode, {
    message: 'Invalid language code',
  }),
  explicit: z.boolean().default(false),
  genres: z.array(z.string()).default([]),
});

type TrackFormValues = z.infer<typeof trackFormSchema>;

interface TrackFormProps {
  mode: 'create' | 'edit';
  track?: MusicTrackData;
  onSubmit: (data: MusicTrackFormData) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
  submitButtonText?: string;
  submitButtonLoadingText?: string;
}

export function TrackForm({
  mode,
  track,
  onSubmit,
  onCancel,
  isSubmitting,
  submitButtonText,
  submitButtonLoadingText,
}: TrackFormProps) {
  const { toast } = useToast();
  
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [currentGenre, setCurrentGenre] = useState('');

  const isEditMode = mode === 'edit' && track;

  const form = useForm<TrackFormValues>({
    resolver: zodResolver(trackFormSchema),
    defaultValues: {
      title: '',
      artist: '',
      description: '',
      audioUrl: '',
      album: '',
      trackNumber: undefined,
      releaseDate: '',
      duration: undefined,
      imageUrl: '',
      videoUrl: '',
      lyrics: '',
      credits: '',
      language: null,
      explicit: false,
      genres: [],
    },
  });

  const { watch, setValue, reset } = form;
  const genres = watch('genres');

  // Load track data when available (for edit mode)
  useEffect(() => {
    if (isEditMode) {
      reset({
        title: track.title,
        artist: track.artist,
        description: '', // MusicTrackData doesn't have description, so use empty string
        audioUrl: track.audioUrl || '',
        album: track.album || '',
        trackNumber: track.trackNumber,
        releaseDate: track.releaseDate || '',
        duration: track.duration,
        imageUrl: track.imageUrl || '',
        videoUrl: track.videoUrl || '',
        lyrics: track.lyrics || '',
        credits: track.credits || '',
        language: track.language || null,
        explicit: track.explicit || false,
        genres: track.genres || [],
      });
    }
  }, [track, reset, isEditMode]);

  const handleAudioFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      if (!fileExtension || !SUPPORTED_AUDIO_FORMATS.includes(fileExtension)) {
        toast({
          title: 'Invalid file type',
          description: `Please select an audio file. Supported formats: ${SUPPORTED_AUDIO_FORMATS.join(', ').toUpperCase()}`,
          variant: 'destructive',
        });
        return;
      }

      if (!SUPPORTED_AUDIO_MIMES.includes(file.type)) {
        toast({
          title: 'Invalid file type',
          description: `Please select an audio file. Supported formats: ${SUPPORTED_AUDIO_FORMATS.join(', ').toUpperCase()}`,
          variant: 'destructive',
        });
        return;
      }

      if (file.size > 100 * 1024 * 1024) { // 100MB limit
        toast({
          title: 'File too large',
          description: 'Audio file must be less than 100MB.',
          variant: 'destructive',
        });
        return;
      }

      setAudioFile(file);
      setValue('audioUrl', '');

      toast({
        title: 'Audio file selected',
        description: `${file.name} (${(file.size / 1024 / 1024).toFixed(1)}MB)`,
      });
    }
  };

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
        title: 'Cover image selected',
        description: `${file.name} (${(file.size / 1024 / 1024).toFixed(1)}MB)`,
      });
    }
  };

  const handleVideoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('video/')) {
        toast({
          title: 'Invalid file type',
          description: 'Please select a video file.',
          variant: 'destructive',
        });
        return;
      }

      if (file.size > 500 * 1024 * 1024) { // 500MB limit
        toast({
          title: 'File too large',
          description: 'Video file must be less than 500MB.',
          variant: 'destructive',
        });
        return;
      }

      setVideoFile(file);
      setValue('videoUrl', '');

      toast({
        title: 'Video file selected',
        description: `${file.name} (${(file.size / 1024 / 1024).toFixed(1)}MB)`,
      });
    }
  };

  const addGenre = () => {
    if (currentGenre.trim() && !genres.includes(currentGenre.trim())) {
      setValue('genres', [...genres, currentGenre.trim()]);
      setCurrentGenre('');
    }
  };

  const removeGenre = (genreToRemove: string) => {
    setValue('genres', genres.filter(genre => genre !== genreToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addGenre();
    }
  };

  const handleSubmit = async (data: TrackFormValues) => {
    try {
      // Validate that either audio file or URL is provided
      if (!audioFile && !data.audioUrl) {
        toast({
          title: 'Audio required',
          description: 'Please provide either an audio file or audio URL.',
          variant: 'destructive',
        });
        return;
      }

      const trackData: MusicTrackFormData = {
        title: data.title,
        artist: data.artist,
        audioFile: audioFile || undefined,
        imageFile: imageFile || undefined,
        videoFile: videoFile || undefined,
        audioType: audioFile?.type,
        description: data.description || undefined,
        album: data.album || undefined,
        trackNumber: data.trackNumber,
        releaseDate: data.releaseDate || undefined,
        imageUrl: data.imageUrl || undefined,
        videoUrl: data.videoUrl || undefined,
        lyrics: data.lyrics || undefined,
        credits: data.credits || undefined,
        language: data.language || undefined,
        explicit: data.explicit,
        genres: data.genres || undefined,
      };

      await onSubmit(trackData);
    } catch (error) {
      // Error handling is done in the parent component
      throw error;
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>
            {isEditMode ? 'Edit Track' : 'Create New Track'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
              {/* Basic Information */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                {/* Cover Art */}
                <div className="space-y-4">
                  <Label className="text-base font-semibold">Cover Art</Label>
                  
                  <div className="aspect-square w-full max-w-sm">
                    {(imageFile || (isEditMode && track?.imageUrl)) ? (
                      <div className="relative w-full h-full group cursor-pointer">
                        <img 
                          src={imageFile ? URL.createObjectURL(imageFile) : track?.imageUrl} 
                          alt="Track cover art" 
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
                          <p className="text-muted-foreground font-medium mb-1 group-hover:text-foreground transition-colors duration-200">Upload Cover Art</p>
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
                        <FormLabel className="text-base font-semibold">Track Title *</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Enter track title..." 
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
                    name="artist"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-semibold">Artist *</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Enter artist name..." 
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
                            placeholder="Brief description of the track..."
                            rows={4}
                            className="resize-none"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Audio Upload */}
              <div className="space-y-4 border-t pt-8">
                <Label className="text-xl font-semibold">Audio File *</Label>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-6 hover:border-muted-foreground/50 hover:bg-muted/30 transition-all duration-200">
                      <input
                        type="file"
                        accept={SUPPORTED_AUDIO_MIMES.join(',')}
                        onChange={handleAudioFileChange}
                        className="hidden"
                        id="audio-upload"
                      />
                      <label htmlFor="audio-upload" className="cursor-pointer flex flex-col items-center">
                        <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center mb-3">
                          <Upload className="w-6 h-6 text-muted-foreground" />
                        </div>
                        <p className="text-foreground font-medium mb-1">
                          {audioFile ? audioFile.name : 'Upload Audio File'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {audioFile 
                            ? `${(audioFile.size / 1024 / 1024).toFixed(1)}MB`
                            : `Supports: ${SUPPORTED_AUDIO_FORMATS.join(', ').toUpperCase()}`
                          }
                        </p>
                      </label>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="audioUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Or Audio URL</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="https://example.com/track.mp3"
                              disabled={!!audioFile}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </div>

              {/* Additional Metadata */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 border-t pt-8">
                <div className="space-y-6">
                  <FormField
                    control={form.control}
                    name="album"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Album</FormLabel>
                        <FormControl>
                          <Input placeholder="Album name..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="trackNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Track Number</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="1" 
                              {...field}
                              onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="releaseDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Release Date</FormLabel>
                          <FormControl>
                            <Input 
                              type="date"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="language"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Language</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="en, es, fr, etc. (ISO 639-1 code)"
                            {...field}
                            value={field.value || ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="explicit"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Explicit Content</FormLabel>
                          <p className="text-sm text-muted-foreground">
                            Check if this track contains explicit content
                          </p>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-6">
                  {/* Genres */}
                  <div className="space-y-3">
                    <Label className="text-base font-semibold">Genres</Label>
                    <div className="flex gap-2">
                      <Input
                        value={currentGenre}
                        onChange={(e) => setCurrentGenre(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Add genre..."
                        className="flex-1"
                      />
                      <Button type="button" onClick={addGenre} variant="outline">
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

                  <FormField
                    control={form.control}
                    name="videoUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Music Video URL</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="https://example.com/video.mp4"
                            disabled={!!videoFile}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="space-y-4">
                    <div className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-4 hover:border-muted-foreground/50 hover:bg-muted/30 transition-all duration-200">
                      <input
                        type="file"
                        accept="video/*"
                        onChange={handleVideoFileChange}
                        className="hidden"
                        id="video-upload"
                      />
                      <label htmlFor="video-upload" className="cursor-pointer flex items-center gap-3">
                        <div className="w-8 h-8 bg-muted rounded flex items-center justify-center">
                          <Upload className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {videoFile ? videoFile.name : 'Upload Video File'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {videoFile 
                              ? `${(videoFile.size / 1024 / 1024).toFixed(1)}MB`
                              : 'Optional music video'
                            }
                          </p>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="space-y-6 border-t pt-8">
                <FormField
                  control={form.control}
                  name="lyrics"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-semibold">Lyrics</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Enter track lyrics..."
                          rows={8}
                          className="resize-none font-mono text-sm"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="credits"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-semibold">Credits</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Producer: John Doe&#10;Songwriter: Jane Smith&#10;Mixed by: Audio Engineer"
                          rows={4}
                          className="resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
                      {submitButtonLoadingText || (isEditMode ? 'Updating...' : 'Publishing...')}
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      {submitButtonText || (isEditMode ? 'Update Track' : 'Publish Track')}
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