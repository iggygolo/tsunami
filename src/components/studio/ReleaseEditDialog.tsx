import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Upload, Save, Loader2, Plus, Trash2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { LanguageSelector } from '@/components/ui/language-selector';
import { GenreSelector } from '@/components/ui/genre-selector';
import { useUpdateRelease } from '@/hooks/usePublishRelease';
import { useToast } from '@/hooks/useToast';
import { getAudioDuration, formatDurationHuman } from '@/lib/audioDuration';
import { validateLanguageCode, validateGenre } from '@/lib/musicMetadata';
import type { PodcastRelease, ReleaseFormData, TrackFormData } from '@/types/podcast';

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

// Schema for release editing (similar to publish but allows empty audio URLs for existing releases)
const releaseEditSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  imageUrl: z.string().url().optional().or(z.literal('')),
  description: z.string().max(1000, 'Description too long').optional(),
  tags: z.array(z.string()).default([]),
  tracks: z.array(trackSchema).min(1, 'At least one track is required'),
  genre: z.string().nullable().optional().refine(validateGenre, {
    message: 'Invalid genre',
  }),
});

type ReleaseEditFormValues = z.infer<typeof releaseEditSchema>;

interface ReleaseEditDialogProps {
  release: PodcastRelease;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function ReleaseEditDialog({
  release: release,
  open,
  onOpenChange,
  onSuccess
}: ReleaseEditDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { mutateAsync: updateRelease, isPending } = useUpdateRelease();

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [currentTag, setCurrentTag] = useState('');
  const [trackAudioFiles, setTrackAudioFiles] = useState<Record<number, File>>({});
  const [detectingDurations, setDetectingDurations] = useState<Record<number, boolean>>({});

  const form = useForm<ReleaseEditFormValues>({
    resolver: zodResolver(releaseEditSchema),
    defaultValues: {
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
    },
  });

  const { watch, setValue, reset, control } = form;
  const tags = watch('tags');
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'tracks',
  });

  // Reset form when release changes
  useEffect(() => {
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
    setImageFile(null);
    setTrackAudioFiles({});
    setCurrentTag('');
    setDetectingDurations({});
  }, [release, reset]);

  const handleTrackAudioFileChange = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('audio/')) {
        toast({
          title: 'Invalid file type',
          description: 'Please select an audio file.',
          variant: 'destructive',
        });
        return;
      }

      // Validate file size (100MB limit)
      if (file.size > 100 * 1024 * 1024) {
        toast({
          title: 'File too large',
          description: 'Audio file must be less than 100MB.',
          variant: 'destructive',
        });
        return;
      }

      setTrackAudioFiles(prev => ({ ...prev, [index]: file }));
      setValue(`tracks.${index}.audioUrl`, '');

      // Detect audio duration
      setDetectingDurations(prev => ({ ...prev, [index]: true }));
      try {
        const duration = await getAudioDuration(file);
        setValue(`tracks.${index}.duration`, duration);

        toast({
          title: 'Audio file selected',
          description: `${file.name} (${(file.size / 1024 / 1024).toFixed(1)}MB, ${formatDurationHuman(duration)})`,
        });
      } catch {
        toast({
          title: 'Audio file selected',
          description: `${file.name} (${(file.size / 1024 / 1024).toFixed(1)}MB) - Could not detect duration. You can enter it manually.`,
          variant: 'default',
        });
      } finally {
        setDetectingDurations(prev => ({ ...prev, [index]: false }));
      }
    }
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: 'Invalid file type',
          description: 'Please select an image file.',
          variant: 'destructive',
        });
        return;
      }

      // Validate file size (10MB limit)
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

  const onSubmit = async (data: ReleaseEditFormValues) => {
    try {
      console.log('Starting release update...');

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

      console.log('Calling updateRelease with:', { releaseId: release.eventId, releaseIdentifier: release.identifier, releaseData });

      await updateRelease({
        releaseId: release.eventId,
        releaseIdentifier: release.identifier,
        releaseData
      });

      console.log('Updaterelease completed successfully');

      // Invalidate release queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['release'] });
      queryClient.invalidateQueries({ queryKey: ['releases'] });
      queryClient.invalidateQueries({ queryKey: ['podcast-release'] });

      toast({
        title: 'release updated!',
        description: 'Your release has been updated successfully.',
      });

      // Close dialog and trigger success callback
      onOpenChange(false);
      onSuccess();

    } catch (error) {
      console.error('Error in onSubmit:', error);
      toast({
        title: 'Failed to update release',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[95vh] w-[95vw] sm:w-full sm:max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">Edit release</DialogTitle>
          <DialogDescription>
            Update release details, audio, artwork, and metadata.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(95vh-8rem)] sm:max-h-[calc(90vh-8rem)] pr-2 sm:pr-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6">
              {/* Title */}
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Release Title *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter release title..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Image Upload/URL */}
              <div className="space-y-4">
                <Label>Release Artwork</Label>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <Label className="text-sm text-muted-foreground">Replace Image</Label>
                    <div className="mt-1">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageFileChange}
                        className="hidden"
                        id="image-upload-edit"
                      />
                      <label htmlFor="image-upload-edit">
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-3 sm:p-4 text-center cursor-pointer hover:border-gray-400 transition-colors">
                          <Upload className="w-6 h-6 mx-auto mb-2 text-gray-400" />
                          <p className="text-sm text-gray-500">
                            {imageFile ? (
                              <span className="text-green-600 font-medium">
                                ✓ {imageFile.name}
                              </span>
                            ) : (
                              'Click to replace image'
                            )}
                          </p>
                        </div>
                      </label>
                    </div>
                  </div>

                  <div>
                    <FormField
                      control={form.control}
                      name="imageUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm text-muted-foreground">
                            Or Update Image URL
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="https://example.com/artwork.jpg"
                              disabled={!!imageFile}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Current image preview */}
                {!imageFile && release.imageUrl && (
                  <div className="flex items-center space-x-3 bg-muted/20 p-2 sm:p-3 rounded">
                    <img
                      src={release.imageUrl}
                      alt="Current artwork"
                      className="w-12 h-12 sm:w-16 sm:h-16 rounded object-cover flex-shrink-0"
                    />
                    <div className="text-xs text-muted-foreground min-w-0">
                      <strong>Current artwork</strong>
                    </div>
                  </div>
                )}
              </div>

              {/* Description */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Brief description of the release..."
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Genre */}
              <FormField
                control={form.control}
                name="genre"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Genre</FormLabel>
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
                <Label>Tags</Label>
                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                  <Input
                    value={currentTag}
                    onChange={(e) => setCurrentTag(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Add a tag..."
                    className="flex-1"
                  />
                  <Button type="button" onClick={addTag} variant="outline" className="w-full sm:w-auto">
                    <Plus className="w-4 h-4 mr-2" />
                    Add
                  </Button>
                </div>

                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        #{tag}
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="ml-1 hover:text-red-500"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Audio Tracks */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">Audio Tracks *</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => append({
                      title: '',
                      audioUrl: '',
                      duration: undefined,
                      explicit: false,
                      language: null,
                    })}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Track
                  </Button>
                </div>

                {fields.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                    No tracks added yet. Click "Add Track" to get started.
                  </div>
                )}

                {fields.map((field, index) => (
                  <Card key={field.id} className="p-4">
                    <div className="space-y-4">
                      {/* Track Title */}
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <FormField
                            control={form.control}
                            name={`tracks.${index}.title`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Track Title {index + 1} *</FormLabel>
                                <FormControl>
                                  <Input placeholder="Enter track title..." {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        {fields.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive mt-8"
                            onClick={() => remove(index)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>

                      {/* Audio Upload/URL */}
                      <div className="space-y-3">
                        <Label className="text-sm">Audio File *</Label>
                        
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
                          <div>
                            <Label className="text-sm text-muted-foreground">Replace Audio File</Label>
                            <div className="mt-1">
                              <input
                                type="file"
                                accept="audio/*"
                                onChange={(e) => handleTrackAudioFileChange(index, e)}
                                className="hidden"
                                id={`audio-upload-${index}`}
                              />
                              <label htmlFor={`audio-upload-${index}`}>
                                <div className="border-2 border-dashed border-gray-300 rounded-lg p-3 sm:p-4 text-center cursor-pointer hover:border-gray-400 transition-colors">
                                  <Upload className="w-6 h-6 mx-auto mb-2 text-gray-400" />
                                  <p className="text-sm text-gray-500">
                                    {trackAudioFiles[index] ? (
                                      <span className="text-green-600 font-medium">
                                        ✓ {trackAudioFiles[index].name}
                                      </span>
                                    ) : (
                                      'Click to replace audio file'
                                    )}
                                  </p>
                                </div>
                              </label>
                            </div>
                          </div>

                          <div>
                            <FormField
                              control={form.control}
                              name={`tracks.${index}.audioUrl`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-sm text-muted-foreground">
                                    Or Update Audio URL
                                  </FormLabel>
                                  <FormControl>
                                    <Input
                                      placeholder="https://example.com/audio.mp3"
                                      disabled={!!trackAudioFiles[index]}
                                      {...field}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>

                        {/* Current audio info */}
                        {!trackAudioFiles[index] && release.tracks?.[index]?.audioUrl && (
                          <div className="text-xs text-muted-foreground bg-muted/50 p-2 sm:p-3 rounded">
                            <strong>Current:</strong>
                            <span className="break-all ml-1">{release.tracks[index].audioUrl}</span>
                          </div>
                        )}
                      </div>

                      {/* Duration and Explicit */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        <FormField
                          control={form.control}
                          name={`tracks.${index}.duration`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Duration (seconds)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  placeholder="3600"
                                  disabled={detectingDurations[index]}
                                  {...field}
                                  onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                                />
                              </FormControl>
                              {detectingDurations[index] && (
                                <p className="text-sm text-muted-foreground">Detecting duration...</p>
                              )}
                              {field.value && (
                                <p className="text-sm text-muted-foreground">
                                  Duration: {formatDurationHuman(field.value)}
                                </p>
                              )}
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={`tracks.${index}.explicit`}
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 mt-8">
                              <FormLabel className="text-sm">Explicit</FormLabel>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Language */}
                      <FormField
                        control={form.control}
                        name={`tracks.${index}.language`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Language</FormLabel>
                            <FormControl>
                              <LanguageSelector
                                selectedLanguage={field.value}
                                onLanguageChange={field.onChange}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </Card>
                ))}
              </div>

              {/* Form Actions */}
              <div className="flex flex-col-reverse sm:flex-row justify-end space-y-reverse space-y-2 sm:space-y-0 sm:space-x-3 pt-4 sm:pt-6 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isPending}
                  className="w-full sm:w-auto"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending} className="w-full sm:w-auto">
                  {isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Update release
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}