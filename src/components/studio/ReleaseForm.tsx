import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Upload, Save, Loader2, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrackList } from '@/components/TrackList';
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
import type { MusicRelease, ReleaseFormData } from '@/types/music';

// Track schema for individual tracks
const trackSchema = z.object({
  title: z.string().min(1, 'Track title is required').max(200, 'Track title too long'),
  audioUrl: z.string().url().optional().or(z.literal('')),
  duration: z.number().positive().optional(),
  explicit: z.boolean().default(false),
  language: z.string().nullable().optional().refine(validateLanguageCode, {
    message: 'Invalid language code',
  }),
});

// Schema for release
const releaseSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  imageUrl: z.string().url().optional().or(z.literal('')),
  description: z.string().max(1000, 'Description too long').optional(),
  tags: z.array(z.string()).default([]),
  tracks: z.array(trackSchema).min(1, 'At least one track is required'),
  genre: z.string().nullable().optional().refine(validateGenre, {
    message: 'Invalid genre',
  }),
});

type ReleaseFormValues = z.infer<typeof releaseSchema>;

interface ReleaseFormProps {
  mode: 'create' | 'edit';
  release?: MusicRelease;
  onSubmit: (data: ReleaseFormData) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
  submitButtonText?: string;
  submitButtonLoadingText?: string;
}

export function ReleaseForm({
  mode,
  release,
  onSubmit,
  onCancel,
  isSubmitting,
  submitButtonText,
  submitButtonLoadingText,
}: ReleaseFormProps) {
  const { toast } = useToast();
  
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [currentTag, setCurrentTag] = useState('');
  const [trackAudioFiles, setTrackAudioFiles] = useState<Record<number, File>>({});

  const isEditMode = mode === 'edit' && release;

  const form = useForm<ReleaseFormValues>({
    resolver: zodResolver(releaseSchema),
    defaultValues: {
      title: '',
      description: '',
      tags: [],
      imageUrl: '',
      genre: null,
      tracks: [{
        title: '',
        audioUrl: '',
        duration: undefined,
        explicit: false,
        language: null,
      }],
    },
  });

  const { watch, setValue, reset, control } = form;
  const tags = watch('tags');
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'tracks',
  });

  // Load release data when available (for edit mode)
  useEffect(() => {
    if (isEditMode) {
      reset({
        title: release.title,
        imageUrl: release.imageUrl || '',
        description: release.description || '',
        tags: release.tags || [],
        genre: release.genre || null,
        tracks: release.tracks?.map(track => ({
          title: track.title,
          audioUrl: track.audioUrl || '',
          duration: track.duration,
          explicit: track.explicit || false,
          language: track.language || null,
        })) || [{
          title: release.title,
          audioUrl: '',
          duration: undefined,
          explicit: false,
          language: null,
        }],
      });
    }
  }, [release, reset, isEditMode]);

  const handleTrackAdd = (track: { title: string; audioUrl: string; duration?: number; explicit: boolean; language: string | null }, audioFile?: File) => {
    if (audioFile) {
      setTrackAudioFiles(prev => ({ ...prev, [fields.length]: audioFile }));
    }
    append({
      title: track.title,
      audioUrl: track.audioUrl,
      duration: track.duration,
      explicit: track.explicit,
      language: track.language,
    });
  };

  const handleTrackEdit = (index: number, track: { title: string; audioUrl: string; duration?: number; explicit: boolean; language: string | null }, audioFile?: File) => {
    if (audioFile) {
      setTrackAudioFiles(prev => ({ ...prev, [index]: audioFile }));
    }
    setValue(`tracks.${index}.title`, track.title);
    setValue(`tracks.${index}.audioUrl`, track.audioUrl);
    setValue(`tracks.${index}.duration`, track.duration);
    setValue(`tracks.${index}.explicit`, track.explicit);
    setValue(`tracks.${index}.language`, track.language);
  };

  const handleTrackRemove = (index: number) => {
    remove(index);
    setTrackAudioFiles(prev => {
      const newFiles = { ...prev };
      delete newFiles[index];
      return newFiles;
    });
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
        title: 'Image file selected',
        description: `${file.name} (${(file.size / 1024 / 1024).toFixed(1)}MB)`,
      });
    }
  };

  const addTag = () => {
    if (currentTag.trim() && !tags.includes(currentTag.trim())) {
      setValue('tags', [...tags, currentTag.trim()]);
      setCurrentTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setValue('tags', tags.filter(tag => tag !== tagToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };

  const handleSubmit = async (data: ReleaseFormValues) => {
    try {
      // Validate that each track has either audio file or URL
      for (let i = 0; i < data.tracks.length; i++) {
        if (!trackAudioFiles[i] && !data.tracks[i].audioUrl) {
          toast({
            title: 'Audio required',
            description: `Track ${i + 1}: Please provide either an audio file or audio URL.`,
            variant: 'destructive',
          });
          return;
        }
      }

      const releaseData: ReleaseFormData = {
        ...data,
        description: data.description || '',
        imageFile: imageFile || undefined,
        imageUrl: data.imageUrl || undefined,
        tags: data.tags || [],
        genre: data.genre || undefined,
        tracks: data.tracks.map((track, index) => ({
          ...track,
          audioFile: trackAudioFiles[index] || undefined,
          audioUrl: track.audioUrl || undefined,
        })),
      };

      await onSubmit(releaseData);
    } catch (error) {
      // Error handling is done in the parent component
      throw error;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Release Details</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
            {/* Main Release Info - Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left: Artwork */}
              <div className="space-y-4">
                <Label className="text-base font-semibold">Release Artwork</Label>
                
                <div className="aspect-square w-full max-w-sm">
                  {(imageFile || (isEditMode && release?.imageUrl)) ? (
                    <div className="relative w-full h-full group cursor-pointer">
                      <img 
                        src={imageFile ? URL.createObjectURL(imageFile) : release?.imageUrl} 
                        alt="Release artwork" 
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
                          <div className="bg-white/90 hover:bg-white transition-colors duration-200 rounded-lg px-4 py-2 flex items-center gap-2 shadow-lg">
                            <Upload className="w-4 h-4 text-gray-700" />
                            <span className="text-sm font-medium text-gray-700">Change Image</span>
                          </div>
                        </label>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-full border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center hover:border-gray-400 hover:bg-gray-50/30 transition-all duration-200 cursor-pointer group">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageFileChange}
                        className="hidden"
                        id="image-upload"
                      />
                      <label htmlFor="image-upload" className="cursor-pointer flex flex-col items-center justify-center w-full h-full">
                        <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-gray-200 transition-colors duration-200">
                          <Upload className="w-8 h-8 text-gray-400 group-hover:text-gray-600 transition-colors duration-200" />
                        </div>
                        <p className="text-gray-600 font-medium mb-1 group-hover:text-gray-800 transition-colors duration-200">Upload Image</p>
                        <p className="text-sm text-gray-500 group-hover:text-gray-600 transition-colors duration-200">Click to select artwork</p>
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

              {/* Right: Title and Description */}
              <div className="space-y-6">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-semibold">Release Title *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter release title..." 
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
                          placeholder="Brief description of the release..."
                          rows={6}
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
                  name="genre"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-semibold">Genre</FormLabel>
                      <FormControl>
                        <GenreSelector
                          selectedGenre={field.value}
                          onGenreChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Tags */}
                <div className="space-y-3">
                  <Label className="text-base font-semibold">Tags</Label>
                  <div className="flex gap-2">
                    <Input
                      value={currentTag}
                      onChange={(e) => setCurrentTag(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Add tag..."
                      className="flex-1"
                    />
                    <Button type="button" onClick={addTag} variant="outline">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-sm">
                          #{tag}
                          <button
                            type="button"
                            onClick={() => removeTag(tag)}
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

            {/* Audio Tracks Section */}
            <div className="space-y-6 border-t pt-8">
              <Label className="text-xl font-semibold">Audio Tracks *</Label>
              <TrackList
                tracks={fields.map((field, index) => ({
                  title: form.watch(`tracks.${index}.title`) || '',
                  audioUrl: form.watch(`tracks.${index}.audioUrl`) || '',
                  duration: form.watch(`tracks.${index}.duration`) || undefined,
                  explicit: form.watch(`tracks.${index}.explicit`) || false,
                  language: form.watch(`tracks.${index}.language`) || null,
                }))}
                onAddTrack={handleTrackAdd}
                onEditTrack={handleTrackEdit}
                onRemoveTrack={handleTrackRemove}
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
                    {submitButtonText || (isEditMode ? 'Update Release' : 'Publish Release')}
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}