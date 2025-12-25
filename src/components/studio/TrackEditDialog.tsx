import { useState, useEffect } from 'react';
import { Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
  DrawerFooter,
  DrawerClose,
} from '@/components/ui/drawer';
import { LanguageSelector } from '@/components/ui/language-selector';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useToast } from '@/hooks/useToast';
import { getAudioDuration, formatDurationHuman } from '@/lib/audioDuration';

interface TrackData {
  title: string;
  audioUrl: string;
  duration?: number;
  explicit: boolean;
  language: string | null;
}

interface TrackEditDialogProps {
  onSaveTrack: (track: TrackData, audioFile?: File) => void;
  onAddTrack?: (track: TrackData, audioFile?: File) => void;
  editingTrack?: TrackData;
  mode?: 'add' | 'edit';
  children?: React.ReactNode;
}

export function TrackEditDialog({ 
  onSaveTrack, 
  onAddTrack, 
  editingTrack, 
  mode = 'add',
  children 
}: TrackEditDialogProps) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState<TrackData>({
    title: '',
    audioUrl: '',
    duration: undefined,
    explicit: false,
    language: null,
  });
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [detectingDuration, setDetectingDuration] = useState(false);
  const isMobile = useIsMobile();
  const { toast } = useToast();

  const isEditMode = mode === 'edit' && editingTrack;

  // Initialize form data when editing
  useEffect(() => {
    if (editingTrack) {
      setFormData(editingTrack);
    } else {
      setFormData({
        title: '',
        audioUrl: '',
        duration: undefined,
        explicit: false,
        language: null,
      });
    }
    setAudioFile(null);
  }, [editingTrack, open]);

  const handleInputChange = (field: keyof TrackData, value: string | number | boolean | null | undefined) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAudioFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

      setAudioFile(file);
      setFormData(prev => ({ ...prev, audioUrl: '' }));

      // Detect audio duration
      setDetectingDuration(true);
      try {
        const duration = await getAudioDuration(file);
        setFormData(prev => ({ ...prev, duration }));

        toast({
          title: 'Audio file selected',
          description: `${file.name} (${(file.size / 1024 / 1024).toFixed(1)}MB, ${formatDurationHuman(duration)})`,
        });
      } catch {
        toast({
          title: 'Audio file selected',
          description: `${file.name} (${(file.size / 1024 / 1024).toFixed(1)}MB) - Could not detect duration.`,
          variant: 'default',
        });
      } finally {
        setDetectingDuration(false);
      }
    }
  };

  const handleSubmit = () => {
    if (formData.title && (audioFile || formData.audioUrl)) {
      if (isEditMode) {
        onSaveTrack(formData, audioFile || undefined);
      } else {
        onAddTrack?.(formData, audioFile || undefined);
      }
      setOpen(false);
    }
  };

  const isValid = formData.title && (audioFile || formData.audioUrl);

  const TrackForm = () => (
    <div className="space-y-4">
      {/* Track Title */}
      <div>
        <Label htmlFor="title">Track Title *</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => handleInputChange('title', e.target.value)}
          placeholder="Enter track title..."
          className="h-10"
        />
      </div>

      {/* Audio Upload/URL */}
      <div className="space-y-3">
        <Label>Audio File *</Label>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">Upload Audio File</Label>
            <input
              type="file"
              accept="audio/*"
              onChange={handleAudioFileChange}
              className="hidden"
              id="audio-upload"
            />
            <label htmlFor="audio-upload">
              <div className="border-2 border-dashed rounded-lg p-3 text-center cursor-pointer hover:border-gray-400 hover:bg-gray-50/30 transition-all duration-200 h-16 flex items-center justify-center">
                {audioFile ? (
                  <span className="text-green-600 font-medium text-sm">
                    ✓ {audioFile.name}
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
            <Input
              value={formData.audioUrl}
              onChange={(e) => handleInputChange('audioUrl', e.target.value)}
              placeholder="Paste audio URL..."
              disabled={!!audioFile}
              className="h-16 text-sm"
            />
          </div>
        </div>

        {/* Current audio info for edit mode */}
        {isEditMode && !audioFile && editingTrack?.audioUrl && (
          <div className="text-xs text-muted-foreground bg-blue-50 p-2 rounded border-l-2 border-blue-200">
            <strong>Current:</strong>
            <span className="break-all ml-1">{editingTrack.audioUrl}</span>
          </div>
        )}
      </div>

      {/* Track Metadata */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">Duration (seconds)</Label>
          <Input
            type="number"
            value={formData.duration?.toString() || ''}
            onChange={(e) => handleInputChange('duration', e.target.value ? parseInt(e.target.value) : undefined)}
            placeholder="180"
            disabled={detectingDuration}
            className="h-10 text-sm"
          />
        </div>

        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">Language</Label>
          <div className="h-10">
            <LanguageSelector
              selectedLanguage={formData.language}
              onLanguageChange={(language) => handleInputChange('language', language || null)}
            />
          </div>
        </div>

        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">Explicit</Label>
          <div className="flex items-center justify-center rounded-lg border h-10 hover:bg-gray-50/30 transition-colors duration-200">
            <Switch
              checked={formData.explicit}
              onCheckedChange={(checked) => handleInputChange('explicit', checked)}
            />
          </div>
        </div>
      </div>

      {/* Duration and detection feedback */}
      <div className="flex gap-4 text-xs text-muted-foreground">
        {formData.duration && (
          <span>Duration: {formatDurationHuman(formData.duration)}</span>
        )}
        {detectingDuration && (
          <span>Detecting duration...</span>
        )}
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        {children && <DrawerTrigger asChild>{children}</DrawerTrigger>}
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{isEditMode ? 'Edit Track' : 'Add New Track'}</DrawerTitle>
            <DrawerDescription>
              {isEditMode 
                ? 'Update the track details and audio file.' 
                : 'Add a new audio track to your release.'
              }
            </DrawerDescription>
          </DrawerHeader>
          <div className="px-4">
            <TrackForm />
          </div>
          <DrawerFooter>
            <Button onClick={handleSubmit} disabled={!isValid}>
              {isEditMode ? 'Update Track' : 'Add Track'}
            </Button>
            <DrawerClose asChild>
              <Button variant="outline">Cancel</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent 
        className="sm:max-w-[500px]"
        onPointerDownOutside={(e) => {
          // Prevent closing when clicking on parent dialog
          e.preventDefault();
        }}
        onInteractOutside={(e) => {
          // Prevent closing when clicking on parent dialog
          e.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit Track' : 'Add New Track'}</DialogTitle>
          <DialogDescription>
            {isEditMode 
              ? 'Update the track details and audio file.' 
              : 'Add a new audio track to your release.'
            }
          </DialogDescription>
        </DialogHeader>
        <TrackForm />
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!isValid}>
            {isEditMode ? 'Update Track' : 'Add Track'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}