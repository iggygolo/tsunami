import { useSeoMeta } from '@unhead/react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  Save,
  Users,
  Zap,
  Loader2,
  Server,
  MessageSquare,
  Repeat2,
  Volume2,
  Music,
  X,
  Settings,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Layout } from '@/components/Layout';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useToast } from '@/hooks/useToast';
import { useArtistMetadata } from '@/hooks/useArtistMetadata';
import { useMusicConfig } from '@/hooks/useMusicConfig';
import { useMusicAnalytics } from '@/hooks/useMusicAnalytics';
import { useRSSFeedGenerator } from '@/hooks/useRSSFeedGenerator';
import { useUploadConfig } from '@/hooks/useUploadConfig';
import { isArtist, MUSIC_CONFIG, MUSIC_KINDS } from '@/lib/musicConfig';
import { genRSSFeed } from '@/lib/rssGenerator';
import { ReleaseManagement } from '@/components/studio/ReleaseManagement';
import { UploadProviderManager } from '@/components/studio/UploadProviderManager';
import { FileUploadWithProvider } from '@/components/ui/FileUploadWithProvider';
import { useUploadFileWithOptions } from '@/hooks/useUploadFile';
// Footer is provided by Layout

interface PodcastFormData {
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
  // New Podcasting 2.0 fields
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

const Studio = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useCurrentUser();
  const { mutateAsync: createEvent } = useNostrPublish();
  const { toast } = useToast();
  const { data: podcastMetadata, isLoading: isLoadingMetadata } = useArtistMetadata();
  const podcastConfig = useMusicConfig();
  const { refetch: refetchRSSFeed } = useRSSFeedGenerator();
  const { mutateAsync: uploadFileWithOptions } = useUploadFileWithOptions();
  const { config } = useUploadConfig();
  const { data: analytics, isLoading: analyticsLoading } = useMusicAnalytics();
  const isArtist_user = user && isArtist(user.pubkey);

  const [activeTab, setActiveTab] = useState('settings');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUploadProvider, setImageUploadProvider] = useState<'blossom' | 'vercel'>(config.defaultProvider);

  const [formData, setFormData] = useState<PodcastFormData>({
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
    // New Podcasting 2.0 defaults
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
    if (podcastMetadata && !isLoadingMetadata) {
      setFormData({
        artistName: podcastMetadata.artist,
        description: podcastMetadata.description,
        image: podcastMetadata.image,
        website: podcastMetadata.website,
        copyright: podcastMetadata.copyright,
        value: podcastMetadata.value || {
          amount: MUSIC_CONFIG.music.value.amount,
          currency: MUSIC_CONFIG.music.value.currency,
          recipients: MUSIC_CONFIG.music.value.recipients || []
        },
        // Podcasting 2.0 fields
        guid: podcastMetadata.guid || MUSIC_CONFIG.artistNpub,
        medium: podcastMetadata.medium || 'music',
        publisher: podcastMetadata.publisher || podcastMetadata.artist,
        location: podcastMetadata.location,
        person: podcastMetadata.person || [
          {
            name: podcastMetadata.artist,
            role: 'artist',
            group: 'cast'
          }
        ],
        license: podcastMetadata.license || {
          identifier: 'All Right Reserved',
          url: ''
        },
      });
    }
  }, [podcastMetadata, isLoadingMetadata]);

  useSeoMeta({
    title: 'Studio',
    description: 'Manage your artist profile and publish new releases',
  });

  const handleInputChange = (field: keyof PodcastFormData, value: PodcastFormData[keyof PodcastFormData]) => {
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

  const handleRecipientUpdate = (index: number, field: string, value: string | number | boolean) => {
    const currentRecipients = formData.value.recipients || [];
    const updatedRecipients = [...currentRecipients];
    updatedRecipients[index] = {
      ...updatedRecipients[index],
      [field]: value
    };
    handleInputChange('value', {
      ...formData.value,
      recipients: updatedRecipients
    });
  };

  // Handle file uploads for podcast image
  const uploadPodcastImage = async (file: File, provider?: 'blossom' | 'vercel') => {
    setIsUploading(true);
    try {
      const result = await uploadFileWithOptions({ 
        file, 
        options: { provider: provider || imageUploadProvider } 
      });
      handleInputChange('image', result.url);
      toast({
        title: 'Success',
        description: `Podcast cover image uploaded successfully via ${result.provider}`,
      });
    } catch (error) {
      console.error('Failed to upload podcast image:', error);
      toast({
        title: 'Error',
        description: 'Failed to upload podcast cover image. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const podcastMetadataEvent = {
        kind: MUSIC_KINDS.ARTIST_METADATA, // Addressable podcast metadata event
        content: JSON.stringify({
          artist: formData.artistName,
          description: formData.description,
          image: formData.image,
          website: formData.website,
          copyright: formData.copyright,
          value: formData.value,
          // Podcasting 2.0 fields
          guid: formData.guid,
          medium: formData.medium,
          publisher: formData.publisher,
          location: formData.location,
          person: formData.person,
          license: formData.license,
          updated_at: Math.floor(Date.now() / 1000)
        }),
        tags: [
          ['d', 'artist-metadata'], // Identifier for this type of event
          ['artist', formData.artistName],
          ['description', formData.description],
        ],
        // Use current time in seconds, always increment to ensure different event IDs
        created_at: Math.ceil(Date.now() / 1000)
      };

      await createEvent(podcastMetadataEvent);

      // Invalidate artist metadata cache to force refetch with new data
      queryClient.invalidateQueries({ queryKey: ['artist-metadata'] });

      // Update RSS feed with the new configuration (non-blocking)
      try {
        await Promise.race([
          genRSSFeed(undefined, [], podcastConfig),
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

  if (!user) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <Card className="max-w-md mx-auto">
            <CardContent className="p-6 text-center">
              <h2 className="text-xl font-semibold mb-4">Login Required</h2>
              <p className="text-muted-foreground mb-4">
                You need to be logged in to access the Studio.
              </p>
              <Button onClick={() => navigate('/')}>
                Go to Homepage
              </Button>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  if (!isArtist_user) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <Card className="max-w-md mx-auto">
            <CardContent className="p-6 text-center">
              <h2 className="text-xl font-semibold mb-4">Access Denied</h2>
              <p className="text-muted-foreground mb-4">
                Only the music artist can access the Studio.
              </p>
              <Button onClick={() => navigate('/')}>
                Go to Homepage
              </Button>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Studio</h1>
            <p className="text-muted-foreground">
              Manage your profile and artist settings
            </p>
          </div>

        </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="settings" className="flex items-center space-x-2">
                <Settings className="w-4 h-4" />
                <span>Artist Settings</span>
              </TabsTrigger>
              <TabsTrigger value="releases" className="flex items-center space-x-2">
                <Volume2 className="w-4 h-4" />
                <span>Releases</span>
              </TabsTrigger>
              <TabsTrigger value="blossom" className="flex items-center space-x-2">
                <Server className="w-4 h-4" />
                <span>Upload Providers</span>
              </TabsTrigger>
              <TabsTrigger value="analytics" className="flex items-center space-x-2">
                <Zap className="w-4 h-4" />
                <span>Analytics</span>
              </TabsTrigger>
            </TabsList>

            {/* Settings Tab */}
            <TabsContent value="settings" className="space-y-6">

              {/* Artist Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Music className="w-5 h-5" />
                    <span>Artist Settings</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
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
                              uploadPodcastImage(file, imageUploadProvider);
                            }
                          }}
                          onProviderChange={setImageUploadProvider}
                          disabled={isUploading}
                        />
                        {formData.image && (
                          <div className="mt-2">
                            <img 
                              src={formData.image} 
                              alt="Artist image preview" 
                              className="h-20 w-20 rounded object-cover"
                            />
                          </div>
                        )}
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
                          placeholder="© 2025 Podcast Name"
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
                      placeholder="Enter podcast description"
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
                        <Label htmlFor="medium">Medium</Label>
                        <select
                          id="medium"
                          value={formData.medium}
                          onChange={(e) => handleInputChange('medium', e.target.value)}
                          disabled={false}
                          className="w-full p-2 border border-input bg-background text-foreground rounded-md focus:ring-2 focus:ring-ring focus:border-ring disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <option value="podcast">Podcast</option>
                          <option value="music">Music</option>
                          <option value="video">Video</option>
                          <option value="film">Film</option>
                          <option value="audiobook">Audiobook</option>
                          <option value="newsletter">Newsletter</option>
                          <option value="blog">Blog</option>
                        </select>
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

                    {/* Existing Recipients */}
                    <div className="space-y-3 mb-4">
                      {(formData.value.recipients || []).map((recipient, index) => (
                        <div key={index} className="p-4 border rounded-lg space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium">Recipient {index + 1}</h4>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRecipientRemove(index)}
                              className="text-destructive hover:text-destructive"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <Label>Name</Label>
                              <Input
                                value={recipient.name}
                                onChange={(e) => handleRecipientUpdate(index, 'name', e.target.value)}
                                disabled={false}
                                placeholder="Recipient name"
                              />
                            </div>

                            <div>
                              <Label>Type</Label>
                              <select
                                value={recipient.type}
                                onChange={(e) => handleRecipientUpdate(index, 'type', e.target.value)}
                                disabled={false}
                                className="w-full p-2 border border-input bg-background text-foreground rounded-md focus:ring-2 focus:ring-ring focus:border-ring disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                <option value="node">Lightning Node</option>
                                <option value="lnaddress">Lightning Address</option>
                              </select>
                            </div>

                            <div>
                              <Label>Address</Label>
                              <Input
                                value={recipient.address}
                                onChange={(e) => handleRecipientUpdate(index, 'address', e.target.value)}
                                disabled={false}
                                placeholder="Lightning node pubkey or lightning address"
                              />
                            </div>

                            <div>
                              <Label>Split (%)</Label>
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                value={recipient.split}
                                onChange={(e) => handleRecipientUpdate(index, 'split', parseInt(e.target.value) || 0)}
                                disabled={false}
                                placeholder="0-100"
                              />
                            </div>

                            <div>
                              <Label>Custom Key (Optional)</Label>
                              <Input
                                value={recipient.customKey || ''}
                                onChange={(e) => handleRecipientUpdate(index, 'customKey', e.target.value)}
                                disabled={false}
                                placeholder="Custom TLV key for Lightning payments"
                              />
                            </div>

                            <div>
                              <Label>Custom Value (Optional)</Label>
                              <Input
                                value={recipient.customValue || ''}
                                onChange={(e) => handleRecipientUpdate(index, 'customValue', e.target.value)}
                                disabled={false}
                                placeholder="Custom TLV value for Lightning payments"
                              />
                            </div>

                            <div className="flex items-center space-x-2">
                              <Switch
                                checked={recipient.fee || false}
                                onCheckedChange={(checked) => handleRecipientUpdate(index, 'fee', checked)}
                                disabled={false}
                              />
                              <Label>Fee Recipient</Label>
                            </div>
                          </div>
                        </div>
                      ))}

                      {(formData.value.recipients || []).length === 0 && (
                        <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                          No value recipients configured. Add recipients to enable Lightning payments.
                        </div>
                      )}
                    </div>

                    {/* Add New Recipient */}
                    <div className="p-4 border-2 border-dashed rounded-lg">
                      <h4 className="font-medium mb-3">Add New Recipient</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                          <Input
                            id="new-recipient-name"
                            placeholder="Recipient name"
                          />
                          <select
                            id="new-recipient-type"
                            className="w-full p-2 border border-input bg-background text-foreground rounded-md focus:ring-2 focus:ring-ring focus:border-ring disabled:cursor-not-allowed disabled:opacity-50"
                            defaultValue="node"
                          >
                            <option value="node">Lightning Node</option>
                            <option value="lnaddress">Lightning Address</option>
                          </select>
                          <Input
                            id="new-recipient-address"
                            placeholder="Lightning node pubkey or lightning address"
                            className="md:col-span-2"
                          />
                          <Input
                            id="new-recipient-split"
                            type="number"
                            min="0"
                            max="100"
                            placeholder="Split percentage (0-100)"
                          />
                        </div>
                        <Button
                          type="button"
                          onClick={() => {
                            const nameInput = document.getElementById('new-recipient-name') as HTMLInputElement;
                            const typeSelect = document.getElementById('new-recipient-type') as HTMLSelectElement;
                            const addressInput = document.getElementById('new-recipient-address') as HTMLInputElement;
                            const splitInput = document.getElementById('new-recipient-split') as HTMLInputElement;

                            if (nameInput?.value && addressInput?.value && splitInput?.value) {
                              handleRecipientAdd({
                                name: nameInput.value,
                                type: typeSelect.value as 'node' | 'lnaddress',
                                address: addressInput.value,
                                split: parseInt(splitInput.value) || 0
                              });

                              nameInput.value = '';
                              addressInput.value = '';
                              splitInput.value = '';
                            }
                          }}
                        >
                          Add Recipient
                        </Button>
                      </div>

                    <div className="mt-4">
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p><strong>Total Split:</strong> {(formData.value.recipients || []).reduce((sum, r) => sum + r.split, 0)}%</p>
                        <p className="text-xs">Note: Total split percentage should equal 100% for proper value distribution.</p>
                      </div>
                    </div>
                  </div>

                  <div>  
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
            </TabsContent>

            {/* Releases Tab */}
            <TabsContent value="releases" className="space-y-6">
              <ReleaseManagement />
            </TabsContent>

            {/* Upload Provider Configuration Tab */}
            <TabsContent value="blossom" className="space-y-6">
              <UploadProviderManager />
            </TabsContent>

            {/* Analytics Tab */}
            <TabsContent value="analytics" className="space-y-6">
              {/* Nostr Engagement Analytics */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Zap className="w-5 h-5" />
                    <span>Nostr Engagement</span>
                  </CardTitle>
                  <CardDescription>Social interactions from the Nostr network</CardDescription>
                </CardHeader>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                  <CardContent className="p-6 text-center">
                    <Volume2 className="w-12 h-12 mx-auto mb-4 text-primary" />
                    <div className="text-2xl font-bold">
                      {analyticsLoading ? '...' : analytics?.totalReleases || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">Releases</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6 text-center">
                    <Zap className="w-12 h-12 mx-auto mb-4 text-yellow-500" />
                    <div className="text-2xl font-bold">
                      {analyticsLoading ? '...' : analytics?.totalZaps || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">Total Zaps</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6 text-center">
                    <MessageSquare className="w-12 h-12 mx-auto mb-4 text-blue-500" />
                    <div className="text-2xl font-bold">
                      {analyticsLoading ? '...' : analytics?.totalComments || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">Comments</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6 text-center">
                    <Repeat2 className="w-12 h-12 mx-auto mb-4 text-green-500" />
                    <div className="text-2xl font-bold">
                      {analyticsLoading ? '...' : analytics?.totalReposts || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">Reposts</div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Releases */}
                <Card>
                  <CardHeader>
                    <CardTitle>Top Releases by Engagement</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {analyticsLoading ? (
                      <div className="space-y-3">
                        {[...Array(3)].map((_, i) => (
                          <div key={i} className="animate-pulse">
                            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                          </div>
                        ))}
                      </div>
                    ) : analytics?.topReleases && analytics.topReleases.length > 0 ? (
                      <div className="space-y-4">
                        {analytics.topReleases.slice(0, 5).map((release, index) => (
                          <div key={release.release.id} className="flex items-center space-x-3 p-3 rounded-lg bg-muted">
                            <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                              {index + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-medium truncate">
                                {release.release.title}
                              </h4>
                              <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                                <span className="flex items-center">
                                  <Zap className="w-3 h-3 mr-1 text-yellow-500" />
                                  {release.zaps}
                                </span>
                                <span className="flex items-center">
                                  <MessageSquare className="w-3 h-3 mr-1 text-blue-500" />
                                  {release.comments}
                                </span>
                                <span className="flex items-center">
                                  <Repeat2 className="w-3 h-3 mr-1 text-green-500" />
                                  {release.reposts}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Volume2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No release engagement data yet.</p>
                        <p className="text-sm">Publish releases and engagement will appear here!</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Recent Activity */}
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {analyticsLoading ? (
                      <div className="space-y-3">
                        {[...Array(5)].map((_, i) => (
                          <div key={i} className="animate-pulse flex items-center space-x-3">
                            <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                            <div className="flex-1">
                              <div className="h-3 bg-gray-200 rounded w-2/3 mb-1"></div>
                              <div className="h-2 bg-gray-200 rounded w-1/2"></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : analytics?.recentActivity && analytics.recentActivity.length > 0 ? (
                      <div className="space-y-4">
                        {analytics.recentActivity.slice(0, 8).map((activity, index) => (
                          <div key={index} className="flex items-center space-x-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                              activity.type === 'zap' ? 'bg-yellow-100 text-yellow-700' :
                              activity.type === 'comment' ? 'bg-blue-100 text-blue-700' :
                              'bg-green-100 text-green-700'
                            }`}>
                              {activity.type === 'zap' ? (
                                <Zap className="w-4 h-4" />
                              ) : activity.type === 'comment' ? (
                                <MessageSquare className="w-4 h-4" />
                              ) : (
                                <Repeat2 className="w-4 h-4" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm">
                                <span className="font-medium">
                                  {activity.type === 'zap' ? 'Zapped' :
                                   activity.type === 'comment' ? 'Commented on' :
                                   'Reposted'}
                                </span>{' '}
                                <span className="text-muted-foreground truncate">
                                  {activity.releaseTitle}
                                </span>
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {activity.timestamp.toLocaleDateString()} at {activity.timestamp.toLocaleTimeString()}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No recent activity yet.</p>
                        <p className="text-sm">Listener interactions will appear here!</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Studio;