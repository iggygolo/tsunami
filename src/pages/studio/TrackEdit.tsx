import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { ArrowLeft, Upload, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LanguageSelector } from '@/components/ui/language-selector';
import { useToast } from '@/hooks/useToast';
import { getAudioDuration, formatDurationHuman } from '@/lib/audioDuration';

interface TrackData {
  title: string;
  audioUrl: string;
  duration?: number;
  explicit: boolean;
  language: string | null;
}

export function TrackEdit() {
  const navigate = useNavigate();
  const { releaseId, trackIndex } = useParams();
  const location = useLocation();
  const { toast } = useToast();

  // Get track data from location state or initialize empty
  const initialTrack = location.state?.track as TrackData | undefined;
  const isEditMode = location.state?.mode === 'edit';
  const onSave = location.state?.onSave;

  const [formData, setFormData] = useState<TrackData>({
    title: '',
    audioUrl: '',
    duration: undefined,
    explicit: false,
    language: null,
  });
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [detectingDuration, setDetectingDuration] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Initialize form data
  useEffect(() => {
    if (initialTrack) {
      setFormData(initialTrack);
    }
  }, [initialTrack]);

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

  const handleSubmit = async () => {
    if (!isValid) return;

    setIsSaving(true);
    try {
      // Call the onSave callback if provided
      if (onSave) {
        await onSave(formData, audioFile || undefined);
      }

      toast({
        title: isEditMode ? 'Track updated' : 'Track added',
        description: `"${formData.title}" has been ${isEditMode ? 'updated' : 'added'} successfully.`,
      });

      // Navigate back to the release form
      if (releaseId && releaseId !== 'new') {
        navigate(`/studio/releases/edit/${releaseId}`);
      } else {
        navigate('/studio/releases/create');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'An error occurred while saving the track.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    // Navigate back to the release form (either create or edit)
    if (releaseId && releaseId !== 'new') {
      navigate(`/studio/releases/edit/${releaseId}`);
    } else {
      navigate('/studio/releases/create');
    }
  };

  const isValid = formData.title && (audioFile || formData.audioUrl);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" onClick={handleCancel}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              {isEditMode ? 'Edit Track' : 'Add New Track'}
            </h1>
            <p className="text-muted-foreground">
              {isEditMode 
                ? 'Update the track details and audio file.' 
                : 'Add a new audio track to your release.'
              }
            </p>
          </div>
        </div>
        <Button onClick={handleSubmit} disabled={!isValid || isSaving}>
          <Save className="w-4 h-4 mr-2" />
          {isSaving ? 'Saving...' : (isEditMode ? 'Update Track' : 'Add Track')}
        </Button>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>Track Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Track Title */}
          <div>
            <Label htmlFor="title">Track Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="Enter track title..."
              className="mt-2"
            />
          </div>

          {/* Audio Upload/URL */}
          <div className="space-y-4">
            <Label>Audio File *</Label>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <Label className="text-sm text-muted-foreground mb-3 block">Upload Audio File</Label>
                <input
                  type="file"
                  accept="audio/*"
                  onChange={handleAudioFileChange}
                  className="hidden"
                  id="audio-upload"
                />
                <label htmlFor="audio-upload">
                  <div className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-gray-400 hover:bg-gray-50/30 transition-all duration-200 min-h-[120px] flex flex-col items-center justify-center">
                    {audioFile ? (
                      <div className="space-y-2">
                        <div className="text-green-600 font-medium">
                          ✓ {audioFile.name}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {(audioFile.size / 1024 / 1024).toFixed(1)}MB
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Upload className="w-8 h-8 text-gray-400 mx-auto" />
                        <div className="text-sm text-gray-500">
                          Click to upload audio file
                        </div>
                        <div className="text-xs text-gray-400">
                          Supports MP3, WAV, FLAC, etc. (Max 100MB)
                        </div>
                      </div>
                    )}
                  </div>
                </label>
              </div>
              
              <div>
                <Label className="text-sm text-muted-foreground mb-3 block">Or Audio URL</Label>
                <Input
                  value={formData.audioUrl}
                  onChange={(e) => handleInputChange('audioUrl', e.target.value)}
                  placeholder="https://example.com/audio.mp3"
                  disabled={!!audioFile}
                  className="min-h-[120px] text-sm"
                />
              </div>
            </div>

            {/* Current audio info for edit mode */}
            {isEditMode && !audioFile && initialTrack?.audioUrl && (
              <div className="text-sm text-muted-foreground bg-blue-50 p-3 rounded border-l-4 border-blue-200">
                <strong>Current audio file:</strong>
                <div className="break-all mt-1 font-mono text-xs">{initialTrack.audioUrl}</div>
              </div>
            )}
          </div>

          {/* Track Metadata */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <Label className="text-sm text-muted-foreground mb-2 block">Duration (seconds)</Label>
              <Input
                type="number"
                value={formData.duration?.toString() || ''}
                onChange={(e) => handleInputChange('duration', e.target.value ? parseInt(e.target.value) : undefined)}
                placeholder="180"
                disabled={detectingDuration}
              />
              {detectingDuration && (
                <div className="text-xs text-muted-foreground mt-1">
                  Detecting duration...
                </div>
              )}
            </div>

            <div>
              <Label className="text-sm text-muted-foreground mb-2 block">Language</Label>
              <LanguageSelector
                selectedLanguage={formData.language}
                onLanguageChange={(language) => handleInputChange('language', language || null)}
              />
            </div>

            <div>
              <Label className="text-sm text-muted-foreground mb-2 block">Explicit Content</Label>
              <div className="flex items-center justify-center rounded-lg border h-10 hover:bg-gray-50/30 transition-colors duration-200">
                <Switch
                  checked={formData.explicit}
                  onCheckedChange={(checked) => handleInputChange('explicit', checked)}
                />
              </div>
            </div>
          </div>

          {/* Duration Display */}
          {formData.duration && (
            <div className="text-sm text-muted-foreground">
              <strong>Duration:</strong> {formatDurationHuman(formData.duration)}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default TrackEdit;