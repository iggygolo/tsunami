import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Upload, X, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { LanguageSelector } from '@/components/ui/language-selector';
import { GenreSelector } from '@/components/ui/genre-selector';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { usePublishRelease } from '@/hooks/usePublishRelease';
import { useToast } from '@/hooks/useToast';
import { isArtist } from '@/lib/musicConfig';
import { getAudioDuration, formatDurationHuman } from '@/lib/audioDuration';
import { validateLanguageCode, validateGenre } from '@/lib/musicMetadata';
import type { ReleaseFormData } from '@/types/podcast';

const trackSchema = z.object({
  title: z.string().min(1, 'Track title is required').max(200, 'Track title too long'),
  audioUrl: z.string().url().optional().or(z.literal('')),
  duration: z.number().optional(),
  explicit: z.boolean().default(false),
  language: z.string().nullable().optional().refine(validateLanguageCode, {
    message: 'Invalid language code',
  }),
});

const releaseSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  imageUrl: z.string().url().or(z.literal('')),
  description: z.string().max(1000, 'Description too long'),
  tags: z.array(z.string()).default([]),
  tracks: z.array(trackSchema).min(1, 'At least one track is required'),
  genre: z.string().nullable().optional().refine(validateGenre, {
    message: 'Invalid genre',
  }),
});

type ReleaseFormValues = z.infer<typeof releaseSchema>;

interface PublishReleaseFormProps {
  onSuccess?: (releaseId: string) => void;
  onCancel?: () => void;
  className?: string;
}

export function PublishReleaseForm({ 
  onSuccess, 
  onCancel, 
  className 
}: PublishReleaseFormProps) {
  const { user } = useCurrentUser();
  const { mutateAsync: publishRelease, isPending } = usePublishRelease();
  const { toast } = useToast();
  
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [currentTag, setCurrentTag] = useState('');
  const [trackAudioFiles, setTrackAudioFiles] = useState<Record<number, File>>({});
  const [detectingDurations, setDetectingDurations] = useState<Record<number, boolean>>({});

  const form = useForm<ReleaseFormValues>({
    resolver: zodResolver(releaseSchema),
    defaultValues: {
      title: '',
      description: '',
      tags: [],
      imageUrl: '',
      genre: null,
      tracks: [
        {
          title: '',
          audioUrl: '',
          duration: undefined,
          explicit: false,
          language: null,
        }
      ],
    },
  });

  const { watch, setValue, control } = form;
  const tags = watch('tags');
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'tracks',
  });

  // Check if user is the artist
  if (!user || !isArtist(user.pubkey)) {
    return (
      <Card className={className}>
        <CardContent className="py-12 px-8 text-center">
          <p className="text-muted-foreground">
            Only the music artist can publish releases.
          </p>
        </CardContent>
      </Card>
    );
  }

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

  const onSubmit = async (data: ReleaseFormValues) => {
    try {
      console.log('Form submission data:', data);
      console.log('Track audio files:', trackAudioFiles);
      console.log('Image file:', imageFile);
      
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
        imageFile: imageFile || undefined,
        imageUrl: data.imageUrl || undefined,
        tracks: data.tracks.map((track, index) => ({
          ...track,
          audioFile: trackAudioFiles[index] || undefined,
          audioUrl: track.audioUrl || undefined,
        })),
      };

      console.log('Publishing release data:', releaseData);
      const releaseId = await publishRelease(releaseData);
      
      toast({
        title: 'release published!',
        description: 'Your podcast release has been published successfully.',
      });

      onSuccess?.(releaseId);
      
      // Reset form
      form.reset({
        title: '',
        description: '',
        tags: [],
        imageUrl: '',
        genre: null,
        tracks: [
          {
            title: '',
            audioUrl: '',
            duration: undefined,
            explicit: false,
            language: null,
          }
        ],
      });
      setImageFile(null);
      setTrackAudioFiles({});
      setCurrentTag('');
      
    } catch (error) {
      toast({
        title: 'Failed to publish release',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    }
  };

  return (
    <Card className={className}>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-muted-foreground">Upload Image</Label>
                  <div className="mt-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageFileChange}
                      className="hidden"
                      id="image-upload"
                    />
                    <label htmlFor="image-upload">
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-gray-400">
                        <Upload className="w-6 h-6 mx-auto mb-2 text-gray-400" />
                        <p className="text-sm text-gray-500">
                          {imageFile ? (
                            <span className="text-green-600 font-medium">
                              ✓ {imageFile.name}
                            </span>
                          ) : (
                            'Click to upload image'
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
                          Or Enter Image URL
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
              <div className="flex space-x-2">
                <Input
                  value={currentTag}
                  onChange={(e) => setCurrentTag(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Add a tag..."
                  className="flex-1"
                />
                <Button type="button" onClick={addTag} variant="outline">
                  <Plus className="w-4 h-4" />
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
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm text-muted-foreground">Upload Audio File</Label>
                          <div className="mt-1">
                            <input
                              type="file"
                              accept="audio/*"
                              onChange={(e) => handleTrackAudioFileChange(index, e)}
                              className="hidden"
                              id={`audio-upload-${index}`}
                            />
                            <label htmlFor={`audio-upload-${index}`}>
                              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-gray-400">
                                <Upload className="w-6 h-6 mx-auto mb-2 text-gray-400" />
                                <p className="text-sm text-gray-500">
                                  {trackAudioFiles[index] ? (
                                    <span className="text-green-600 font-medium">
                                      ✓ {trackAudioFiles[index].name}
                                    </span>
                                  ) : (
                                    'Click to upload audio file'
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
                                  Or Enter Audio URL
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
                    </div>

                    {/* Duration and Explicit */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <div className="flex justify-end space-x-3">
              {onCancel && (
                <Button type="button" variant="outline" onClick={onCancel}>
                  Cancel
                </Button>
              )}
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Publishing...' : 'Publish release'}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}