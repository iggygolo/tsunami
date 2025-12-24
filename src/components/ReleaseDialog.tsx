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
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
  DrawerTrigger,
} from '@/components/ui/drawer';
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
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { usePublishRelease, useUpdateRelease } from '@/hooks/usePublishRelease';
import { useToast } from '@/hooks/useToast';
import { useIsMobile } from '@/hooks/useIsMobile';
import { isArtist } from '@/lib/musicConfig';
import { getAudioDuration, formatDurationHuman } from '@/lib/audioDuration';
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

// Schema for release (works for both create and edit)
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

interface ReleaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (releaseId?: string) => void;
  // Edit mode props
  release?: MusicRelease;
  mode?: 'create' | 'edit';
  children?: React.ReactNode;
}

export function ReleaseDialog({
  open,
  onOpenChange,
  onSuccess,
  release,
  mode = 'create',
  children
}: ReleaseDialogProps) {
  const { user } = useCurrentUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  
  const { mutateAsync: publishRelease, isPending: isPublishing } = usePublishRelease();
  const { mutateAsync: updateRelease, isPending: isUpdating } = useUpdateRelease();
  
  const isPending = isPublishing || isUpdating;
  const isEditMode = mode === 'edit' && release;

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [currentTag, setCurrentTag] = useState('');
  const [trackAudioFiles, setTrackAudioFiles] = useState<Record<number, File>>({});
  const [detectingDurations, setDetectingDurations] = useState<Record<number, boolean>>({});

  const form = useForm<ReleaseFormValues>({
    resolver: zodResolver(releaseSchema),
    defaultValues: isEditMode ? {
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
    } : {
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

  // Reset form when release changes or dialog opens/closes
  useEffect(() => {
    if (open) {
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
      } else {
        reset({
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
        });
      }
      setImageFile(null);
      setTrackAudioFiles({});
      setCurrentTag('');
      setDetectingDurations({});
    }
  }, [open, isEditMode, release, reset]);

  // Check if user is the artist (for create mode)
  if (!isEditMode && (!user || !isArtist(user.pubkey))) {
    return null;
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

      if (isEditMode) {
        await updateRelease({
          releaseId: release.eventId,
          releaseIdentifier: release.identifier,
          releaseData
        });

        // Invalidate release queries to refresh data
        queryClient.invalidateQueries({ queryKey: ['release'] });
        queryClient.invalidateQueries({ queryKey: ['releases'] });
        queryClient.invalidateQueries({ queryKey: ['podcast-release'] });

        toast({
          title: 'Release updated!',
          description: 'Your release has been updated successfully.',
        });
      } else {
        const releaseId = await publishRelease(releaseData);
        
        toast({
          title: 'Release published!',
          description: 'Your release has been published successfully.',
        });

        onSuccess?.(releaseId);
      }

      // Close dialog and trigger success callback
      onOpenChange(false);
      if (isEditMode) {
        onSuccess?.();
      }

    } catch (error) {
      console.error('Error in onSubmit:', error);
      toast({
        title: `Failed to ${isEditMode ? 'update' : 'publish'} release`,
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    }
  };

  const ReleaseForm = () => (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Main Release Info - Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Big Artwork Preview */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Release Artwork</Label>
            
            {/* Large Artwork Display */}
            <div className="aspect-square w-full max-w-sm mx-auto lg:mx-0">
              {(imageFile || (isEditMode && release?.imageUrl)) ? (
                <div className="relative w-full h-full group cursor-pointer">
                  <img 
                    src={imageFile ? URL.createObjectURL(imageFile) : release?.imageUrl} 
                    alt="Release artwork" 
                    className="w-full h-full rounded-lg object-cover border shadow-lg transition-all duration-200 group-hover:brightness-75"
                  />
                  {/* Overlay with change option */}
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
                /* Empty State - Upload Area */
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
            
            {/* Image URL as alternative */}
            <FormField
              control={form.control}
              name="imageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      placeholder="Or paste image URL..."
                      disabled={!!imageFile}
                      className="h-9 text-sm"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Right: Title and Description */}
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">Release Title *</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Enter release title..." 
                      className="h-10 text-base"
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
                  <FormLabel className="text-sm font-medium">Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Brief description of the release..."
                      rows={4}
                      className="text-sm resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Genre and Tags in vertical layout for better space usage */}
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="genre"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Genre</FormLabel>
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
              <div className="space-y-2">
                <Label className="text-sm font-medium">Tags</Label>
                <div className="flex gap-2">
                  <Input
                    value={currentTag}
                    onChange={(e) => setCurrentTag(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Add tag..."
                    className="h-9 text-sm flex-1"
                  />
                  <Button type="button" onClick={addTag} variant="outline" size="sm">
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs h-6">
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
            </div>
          </div>
        </div>

        {/* Audio Tracks Section */}
        <div className="space-y-4 border-t pt-6">
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
              <Plus className="w-3 h-3 mr-1" />
              Add Track
            </Button>
          </div>

          {fields.map((field, index) => (
            <div key={field.id} className="border rounded-lg p-4 space-y-4 bg-gray-50/30">
              {/* Track Title and Remove */}
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <FormField
                    control={form.control}
                    name={`tracks.${index}.title`}
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input 
                            placeholder={`Track ${index + 1} title...`} 
                            className="h-9 text-sm bg-white"
                            {...field} 
                          />
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
                    className="text-destructive hover:text-destructive h-9 w-9 p-0"
                    onClick={() => remove(index)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>

              {/* Audio Upload Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground mb-2 block">Upload Audio File</Label>
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={(e) => handleTrackAudioFileChange(index, e)}
                    className="hidden"
                    id={`audio-upload-${index}`}
                  />
                  <label htmlFor={`audio-upload-${index}`}>
                    <div className="border-2 border-dashed rounded-lg p-3 text-center cursor-pointer hover:border-gray-400 transition-colors h-16 flex items-center justify-center bg-white">
                      {trackAudioFiles[index] ? (
                        <span className="text-green-600 font-medium text-sm">
                          ✓ {trackAudioFiles[index].name}
                        </span>
                      ) : (
                        <div className="flex items-center gap-2 text-gray-500">
                          <Upload className="w-4 h-4" />
                          <span className="text-sm">Upload audio</span>
                        </div>
                      )}
                    </div>
                  </label>
                </div>
                
                <div>
                  <Label className="text-xs text-muted-foreground mb-2 block">Or Audio URL</Label>
                  <FormField
                    control={form.control}
                    name={`tracks.${index}.audioUrl`}
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            placeholder="Paste audio URL..."
                            disabled={!!trackAudioFiles[index]}
                            className="h-16 text-sm bg-white"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Current audio info for edit mode */}
              {isEditMode && !trackAudioFiles[index] && release?.tracks?.[index]?.audioUrl && (
                <div className="text-xs text-muted-foreground bg-blue-50 p-2 rounded border-l-2 border-blue-200">
                  <strong>Current:</strong>
                  <span className="break-all ml-1">{release.tracks[index].audioUrl}</span>
                </div>
              )}

              {/* Track Metadata */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Duration (seconds)</Label>
                  <FormField
                    control={form.control}
                    name={`tracks.${index}.duration`}
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="180"
                            disabled={detectingDurations[index]}
                            className="h-8 text-sm bg-white"
                            {...field}
                            onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Language</Label>
                  <FormField
                    control={form.control}
                    name={`tracks.${index}.language`}
                    render={({ field }) => (
                      <FormItem>
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

                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Explicit</Label>
                  <FormField
                    control={form.control}
                    name={`tracks.${index}.explicit`}
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-center rounded-lg border h-8 bg-white">
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            className="scale-75"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Duration and detection feedback */}
              <div className="flex gap-4 text-xs text-muted-foreground">
                {form.watch(`tracks.${index}.duration`) && (
                  <span>Duration: {formatDurationHuman(form.watch(`tracks.${index}.duration`) || 0)}</span>
                )}
                {detectingDurations[index] && (
                  <span>Detecting duration...</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Form Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {isEditMode ? 'Updating...' : 'Publishing...'}
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                {isEditMode ? 'Update Release' : 'Publish Release'}
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        {children && <DrawerTrigger asChild>{children}</DrawerTrigger>}
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader className="pb-2">
            <DrawerTitle className="text-lg">
              {isEditMode ? 'Edit Release' : 'Publish New Release'}
            </DrawerTitle>
            <DrawerDescription className="text-sm">
              {isEditMode 
                ? 'Update release details and metadata.' 
                : 'Create and publish a new music release.'
              }
            </DrawerDescription>
          </DrawerHeader>
          <div className="px-4 overflow-y-auto flex-1">
            <ReleaseForm />
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent className="max-w-3xl max-h-[90vh] w-[90vw] sm:w-full">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-lg">
            {isEditMode ? 'Edit Release' : 'Publish New Release'}
          </DialogTitle>
          <DialogDescription className="text-sm">
            {isEditMode 
              ? 'Update release details and metadata.' 
              : 'Create and publish a new music release.'
            }
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-6rem)] pr-4">
          <ReleaseForm />
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}