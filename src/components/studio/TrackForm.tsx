import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Upload, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
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
import { LanguageSelector } from '@/components/ui/language-selector';
import { useToast } from '@/hooks/useToast';
import { validateLanguageCode } from '@/lib/musicMetadata';
import { 
  AUDIO_MIME_TYPES, 
  AUDIO_EXTENSIONS,
  validateAudioFile 
} from '@/lib/fileTypes';
import type { MusicTrackFormData, MusicTrackData } from '@/types/music';

// Simplified track form schema
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
  
  // Release info
  releaseDate: z.string().optional().refine((val) => {
    if (!val) return true;
    return /^\d{4}-\d{2}-\d{2}$/.test(val);
  }, {
    message: 'Release date must be in YYYY-MM-DD format'
  }),
  duration: z.number().positive().optional(),
  
  // Media
  imageUrl: z.string().url().optional().or(z.literal('')),
  
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

  const isEditMode = mode === 'edit' && track;

  const form = useForm<TrackFormValues>({
    resolver: zodResolver(trackFormSchema),
    defaultValues: {
      title: '',
      artist: '',
      description: '',
      audioUrl: '',
      releaseDate: '',
      duration: undefined,
      imageUrl: '',
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
        description: track.description || '',
        audioUrl: track.audioUrl || '',
        releaseDate: track.releaseDate || '',
        duration: track.duration,
        imageUrl: track.imageUrl || '',
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
      // Use centralized validation
      const validation = validateAudioFile(file.name, file.type);
      if (!validation.valid) {
        toast({
          title: 'Invalid file type',
          description: validation.error,
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

      // Extract audio duration
      const audio = new Audio();
      const url = URL.createObjectURL(file);
      audio.src = url;
      
      audio.addEventListener('loadedmetadata', () => {
        if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
          setValue('duration', Math.round(audio.duration));
        }
        URL.revokeObjectURL(url);
      });

      audio.addEventListener('error', () => {
        URL.revokeObjectURL(url);
      });

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
        title: 'Track image selected',
        description: `${file.name} (${(file.size / 1024 / 1024).toFixed(1)}MB)`,
      });
    }
  };

  const handleSubmit = async (data: TrackFormValues) => {
    try {
      if (!audioFile && !data.audioUrl) {
        toast({
          title: 'Audio required',
          description: 'Please upload an audio file or provide an audio URL.',
          variant: 'destructive',
        });
        return;
      }

      const trackData: MusicTrackFormData = {
        title: data.title,
        artist: data.artist,
        description: data.description,
        audioFile: audioFile || undefined,
        audioUrl: data.audioUrl || undefined,
        releaseDate: data.releaseDate || undefined,
        duration: data.duration,
        imageFile: imageFile || undefined,
        imageUrl: data.imageUrl || undefined,
        lyrics: data.lyrics,
        credits: data.credits,
        language: data.language || undefined,
        explicit: data.explicit,
        genres: data.genres,
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
                {/* Cover Art - Left Side */}
                <div className="space-y-4">
                  <Label className="text-base font-semibold">Track Cover</Label>
                  
                  <div className="aspect-square w-full max-w-sm">
                    {(imageFile || (isEditMode && track?.imageUrl)) ? (
                      <div className="relative w-full h-full group cursor-pointer">
                        <img 
                          src={imageFile ? URL.createObjectURL(imageFile) : track?.imageUrl} 
                          alt="Track cover" 
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

                {/* Basic Info - Right Side */}
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
              </div>

              {/* Audio File - Smaller Section */}
              <div className="space-y-4">
                <Label className="text-base font-semibold">Audio File *</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    {audioFile ? (
                      <div className="p-4 border rounded-lg bg-muted">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
                            <Upload className="w-5 h-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{audioFile.name}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>{(audioFile.size / 1024 / 1024).toFixed(1)}MB</span>
                              {form.watch('duration') && (
                                <>
                                  <span>•</span>
                                  <span>{Math.floor(form.watch('duration')! / 60)}:{(form.watch('duration')! % 60).toString().padStart(2, '0')}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-4 hover:border-muted-foreground/50 hover:bg-muted/30 transition-all duration-200">
                        <input
                          type="file"
                          accept={AUDIO_MIME_TYPES.join(',')}
                          onChange={handleAudioFileChange}
                          className="hidden"
                          id="audio-upload"
                        />
                        <label htmlFor="audio-upload" className="cursor-pointer flex flex-col items-center">
                          <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center mb-2">
                            <Upload className="w-5 h-5 text-muted-foreground" />
                          </div>
                          <p className="text-foreground font-medium mb-1 text-sm">
                            Upload Audio File
                          </p>
                          <p className="text-xs text-muted-foreground text-center">
                            Supports: {AUDIO_EXTENSIONS.join(', ').toUpperCase()}
                          </p>
                        </label>
                      </div>
                    )}
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="audioUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            placeholder="Or paste audio URL..."
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


              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Genres */}
                <div className="space-y-4">
                  <Label className="text-base font-semibold">Genres</Label>
                  <GenreSelector
                    multiSelect={true}
                    selectedGenres={genres}
                    onGenresChange={(newGenres) => setValue('genres', newGenres)}
                    placeholder="Select genres..."
                    maxGenres={5}
                  />
                </div>

                {/* Language */}
                <FormField
                  control={form.control}
                  name="language"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Language</FormLabel>
                      <FormControl>
                        <LanguageSelector
                          selectedLanguage={field.value}
                          onLanguageChange={(value) => field.onChange(value)}
                          placeholder="Select language..."
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

              {/* Additional Content */}
              <div className="space-y-6">
                {/* Lyrics */}
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
                          className="resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Credits and Settings */}
              <div className="space-y-6">
                <FormField
                  control={form.control}
                  name="credits"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Credits</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Producer, songwriter, etc..."
                          rows={3}
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
                      {submitButtonLoadingText || (isEditMode ? 'Updating...' : 'Creating...')}
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      {submitButtonText || (isEditMode ? 'Update Track' : 'Create Track')}
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