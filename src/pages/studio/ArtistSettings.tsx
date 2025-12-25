import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Save, Loader2, Music } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RecipientList } from '@/components/RecipientList';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useToast } from '@/hooks/useToast';
import { useArtistMetadata } from '@/hooks/useArtistMetadata';
import { useMusicConfig } from '@/hooks/useMusicConfig';
import { useRSSFeedGenerator } from '@/hooks/useRSSFeedGenerator';
import { useUploadConfig } from '@/hooks/useUploadConfig';
import { MUSIC_CONFIG, MUSIC_KINDS } from '@/lib/musicConfig';
import { genRSSFeed } from '@/lib/rssGenerator';
import { FileUploadWithProvider } from '@/components/ui/FileUploadWithProvider';
import { useUploadFileWithOptions } from '@/hooks/useUploadFile';

interface ArtistFormData {
  artistName: string;
  description: string;
  image: string;
  website: string;
  copyright: string;
  value: {
    amount: number;
    currency: string;
    recipients?: Array<{
      name: string;
      type: 'node' | 'lnaddress';
      address: string;
      split: number;
      customKey?: string;
      customValue?: string;
      fee?: boolean;
    }>;
  };
  guid: string;
  medium: 'podcast' | 'music' | 'video' | 'film' | 'audiobook' | 'newsletter' | 'blog';
  publisher: string;
  location?: {
    name: string;
    geo?: string;
    osm?: string;
  };
  person: Array<{
    name: string;
    role: string;
    group?: string;
    img?: string;
    href?: string;
  }>;
  license: {
    identifier: string;
    url?: string;
  };
}

const ArtistSettings = () => {
  const queryClient = useQueryClient();
  const { mutateAsync: createEvent } = useNostrPublish();
  const { toast } = useToast();
  const { data: artistMetadata, isLoading: isLoadingMetadata } = useArtistMetadata();
  const musicConfig = useMusicConfig();
  const { refetch: refetchRSSFeed } = useRSSFeedGenerator();
  const { mutateAsync: uploadFileWithOptions } = useUploadFileWithOptions();
  const { config } = useUploadConfig();

  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUploadProvider, setImageUploadProvider] = useState<'blossom' | 'vercel'>(config.defaultProvider);

  const [formData, setFormData] = useState<ArtistFormData>({
    artistName: MUSIC_CONFIG.music.artistName,
    description: MUSIC_CONFIG.music.description,
    image: MUSIC_CONFIG.music.image,
    website: MUSIC_CONFIG.music.website,
    copyright: MUSIC_CONFIG.music.copyright,
    value: {
      amount: MUSIC_CONFIG.music.value.amount,
      currency: MUSIC_CONFIG.music.value.currency,
      recipients: MUSIC_CONFIG.music.value.recipients || []
    },
    guid: MUSIC_CONFIG.music.guid || MUSIC_CONFIG.artistNpub,
    medium: MUSIC_CONFIG.music.medium || 'music',
    publisher: MUSIC_CONFIG.music.publisher || MUSIC_CONFIG.music.artistName,
    person: MUSIC_CONFIG.music.person || [
      {
        name: MUSIC_CONFIG.music.artistName,
        role: 'artist',
        group: 'cast'
      }
    ],
    license: MUSIC_CONFIG.music.license || {
      identifier: 'All Right Reserved',
      url: ''
    },
  });

  // Update form data when metadata loads
  useEffect(() => {
    if (artistMetadata && !isLoadingMetadata) {
      setFormData({
        artistName: artistMetadata.artist,
        description: artistMetadata.description,
        image: artistMetadata.image,
        website: artistMetadata.website,
        copyright: artistMetadata.copyright,
        value: artistMetadata.value || {
          amount: MUSIC_CONFIG.music.value.amount,
          currency: MUSIC_CONFIG.music.value.currency,
          recipients: MUSIC_CONFIG.music.value.recipients || []
        },
        guid: artistMetadata.guid || MUSIC_CONFIG.artistNpub,
        medium: artistMetadata.medium || 'music',
        publisher: artistMetadata.publisher || artistMetadata.artist,
        location: artistMetadata.location,
        person: artistMetadata.person || [
          {
            name: artistMetadata.artist,
            role: 'artist',
            group: 'cast'
          }
        ],
        license: artistMetadata.license || {
          identifier: 'All Right Reserved',
          url: ''
        },
      });
    }
  }, [artistMetadata, isLoadingMetadata]);

  const handleInputChange = (field: keyof ArtistFormData, value: ArtistFormData[keyof ArtistFormData]) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleRecipientAdd = (recipient: { name: string; type: 'node' | 'lnaddress'; address: string; split: number; customKey?: string; customValue?: string; fee?: boolean }) => {
    if (recipient.name && recipient.address) {
      const currentRecipients = formData.value.recipients || [];
      handleInputChange('value', {
        ...formData.value,
        recipients: [...currentRecipients, recipient]
      });
    }
  };

  const handleRecipientRemove = (index: number) => {
    const currentRecipients = formData.value.recipients || [];
    handleInputChange('value', {
      ...formData.value,
      recipients: currentRecipients.filter((_, i) => i !== index)
    });
  };

  const handleRecipientUpdate = (index: number, recipient: { name: string; type: 'node' | 'lnaddress'; address: string; split: number; customKey?: string; customValue?: string; fee?: boolean }) => {
    const currentRecipients = formData.value.recipients || [];
    const updatedRecipients = [...currentRecipients];
    updatedRecipients[index] = recipient;
    handleInputChange('value', {
      ...formData.value,
      recipients: updatedRecipients
    });
  };

  // Handle file uploads for podcast image
  const uploadCoverImage = async (file: File, provider?: 'blossom' | 'vercel') => {
    setIsUploading(true);
    try {
      const result = await uploadFileWithOptions({ 
        file, 
        options: { provider: provider || imageUploadProvider } 
      });
      handleInputChange('image', result.url);
      toast({
        title: 'Success',
        description: `Cover image uploaded successfully via ${result.provider}`,
      });
    } catch (error) {
      console.error('Failed to upload cover image:', error);
      toast({
        title: 'Error',
        description: 'Failed to upload cover image. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const artistMetadataEvent = {
        kind: MUSIC_KINDS.ARTIST_METADATA,
        content: JSON.stringify({
          artist: formData.artistName,
          description: formData.description,
          image: formData.image,
          website: formData.website,
          copyright: formData.copyright,
          value: formData.value,
          guid: formData.guid,
          publisher: formData.publisher,
          location: formData.location,
          person: formData.person,
          license: formData.license,
          updated_at: Math.floor(Date.now() / 1000)
        }),
        tags: [
          ['d', 'artist-metadata'],
          ['artist', formData.artistName],
          ['description', formData.description],
        ],
        created_at: Math.ceil(Date.now() / 1000)
      };

      await createEvent(artistMetadataEvent);

      // Invalidate artist metadata cache to force refetch with new data
      queryClient.invalidateQueries({ queryKey: ['artist-metadata'] });

      // Update RSS feed with the new configuration (non-blocking)
      try {
        await Promise.race([
          genRSSFeed(undefined, [], musicConfig),
          new Promise((_, reject) => setTimeout(() => reject(new Error('RSS generation timeout')), 5000))
        ]);
        console.log('RSS feed updated successfully');
      } catch (error) {
        console.warn('RSS feed update failed or timed out, but settings were saved:', error);
      }

      // Refetch RSS feed generator (non-blocking)
      try {
        await Promise.race([
          refetchRSSFeed(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('RSS refetch timeout')), 3000))
        ]);
      } catch (error) {
        console.warn('RSS refetch failed or timed out, but settings were saved:', error);
      }

      toast({
        title: "Settings saved!",
        description: `Artist settings have been updated.`,
      });
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast({
        title: "Failed to save settings",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Standardized Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground text-sm">
            Manage your artist profile and configuration
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="space-y-6 pt-4">
          {/* Basic Information */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="artistName">Artist Name</Label>
                <Input
                  id="artistName"
                  value={formData.artistName}
                  onChange={(e) => handleInputChange('artistName', e.target.value)}
                  disabled={false}
                  placeholder="Enter artist name"
                />
              </div>

              <div>
                <FileUploadWithProvider
                  accept="image/*"
                  label="Artist Image"
                  placeholder="Click to select an artist image"
                  file={imageFile}
                  onFileSelect={(file) => {
                    setImageFile(file);
                    if (file) {
                      uploadCoverImage(file, imageUploadProvider);
                    }
                  }}
                  onProviderChange={setImageUploadProvider}
                  disabled={isUploading}
                  imageUrl={formData.image}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  value={formData.website}
                  onChange={(e) => handleInputChange('website', e.target.value)}
                  disabled={false}
                  placeholder="https://example.com"
                />
              </div>

              <div>
                <Label htmlFor="copyright">Copyright</Label>
                <Input
                  id="copyright"
                  value={formData.copyright}
                  onChange={(e) => handleInputChange('copyright', e.target.value)}
                  disabled={false}
                  placeholder="© 2025 Artist Name"
                />
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              disabled={false}
              placeholder="Enter artist description"
              rows={4}
            />
          </div>

          {/* Podcast 2.0 Advanced Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="guid">GUID (Artist Identifier)</Label>
                <Input
                  id="guid"
                  value={formData.guid}
                  onChange={(e) => handleInputChange('guid', e.target.value)}
                  disabled={false}
                  placeholder="Unique artist identifier"
                />
              </div>

              <div>
                <Label htmlFor="publisher">Publisher</Label>
                <Input
                  id="publisher"
                  value={formData.publisher}
                  onChange={(e) => handleInputChange('publisher', e.target.value)}
                  disabled={false}
                  placeholder="Publisher name"
                />
              </div>

              <div>
                <Label htmlFor="value-amount">Suggested Value</Label>
                <div className="flex space-x-2">
                  <Input
                    id="value-amount"
                    type="number"
                    value={formData.value.amount}
                    onChange={(e) => handleInputChange('value', {
                      ...formData.value,
                      amount: parseFloat(e.target.value) || 0
                    })}
                    disabled={false}
                    placeholder="0"
                    className="flex-1"
                  />
                  <select
                    value={formData.value.currency}
                    onChange={(e) => handleInputChange('value', {
                      ...formData.value,
                      currency: e.target.value
                    })}
                    disabled={false}
                    className="p-2 border border-input bg-background text-foreground rounded-md focus:ring-2 focus:ring-ring focus:border-ring disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="BTC">BTC</option>
                    <option value="SATS">SATS</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="license-identifier">License</Label>
                <Input
                  id="license-identifier"
                  value={formData.license.identifier}
                  onChange={(e) => handleInputChange('license', {
                    ...formData.license,
                    identifier: e.target.value
                  })}
                  disabled={false}
                  placeholder="All Rights Reserved, CC BY 4.0, etc."
                />
              </div>

              <div>
                <Label htmlFor="license-url">License URL</Label>
                <Input
                  id="license-url"
                  value={formData.license.url || ''}
                  onChange={(e) => handleInputChange('license', {
                    ...formData.license,
                    url: e.target.value
                  })}
                  disabled={false}
                  placeholder="https://creativecommons.org/licenses/..."
                />
              </div>

              <div>
                <Label htmlFor="location-name">Location</Label>
                <Input
                  id="location-name"
                  value={formData.location?.name || ''}
                  onChange={(e) => handleInputChange('location', {
                    ...formData.location,
                    name: e.target.value
                  })}
                  disabled={false}
                  placeholder="Recording location"
                />
              </div>
            </div>
          </div>

          {/* Value Recipients */}
          <div>
            <Label>Value Recipients (Podcasting 2.0)</Label>
            <p className="text-sm text-muted-foreground mb-4">
              Configure Lightning payment recipients for value-for-value support. Recipients will receive payments automatically when listeners send value.
            </p>

            <RecipientList
              recipients={formData.value.recipients || []}
              onAddRecipient={handleRecipientAdd}
              onEditRecipient={handleRecipientUpdate}
              onRemoveRecipient={handleRecipientRemove}
            />
          </div>

          <div className="flex justify-end">  
            <Button onClick={handleSave} disabled={isSaving || isUploading}>
              {(isSaving || isUploading) ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Save Settings
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ArtistSettings;