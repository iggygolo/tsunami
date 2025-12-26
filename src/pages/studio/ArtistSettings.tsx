import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Save, Loader2, Music, Rss, Copy, Check, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { RecipientList } from '@/components/RecipientList';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useToast } from '@/hooks/useToast';
import { useArtistMetadata } from '@/hooks/useArtistMetadata';
import { useMusicConfig } from '@/hooks/useMusicConfig';
import { useRSSFeedGenerator } from '@/hooks/useRSSFeedGenerator';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { MUSIC_KINDS, PLATFORM_CONFIG } from '@/lib/musicConfig';
import { genRSSFeed } from '@/lib/rssGenerator';

interface ArtistFormData {
  artistName: string;
  description: string;
  image: string;
  website: string;
  copyright: string;
  rssEnabled: boolean;
  blossomServers: string[]; // Custom Blossom servers
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
  const { user, name, picture, website } = useCurrentUser();
  const { data: artistMetadata, isLoading: isLoadingMetadata } = useArtistMetadata(user?.pubkey);
  const musicConfig = useMusicConfig();
  const { refetch: refetchRSSFeed } = useRSSFeedGenerator();

  // Redirect if not authenticated
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Music className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">Authentication Required</h2>
          <p className="text-muted-foreground">Please log in to access artist settings.</p>
        </div>
      </div>
    );
  }

  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const [formData, setFormData] = useState<ArtistFormData>({
    artistName: name || 'Artist',
    description: '',
    image: picture || '',
    website: website || '',
    copyright: `© ${new Date().getFullYear()} ${name || 'Artist'}`,
    rssEnabled: false, // Default to disabled as per requirements
    blossomServers: PLATFORM_CONFIG.upload.blossomServers, // Use platform defaults
    value: {
      amount: 100,
      currency: 'sats',
      recipients: []
    },
    guid: user?.pubkey || '',
    medium: 'music',
    publisher: name || 'Artist',
    person: [
      {
        name: name || 'Artist',
        role: 'artist',
        group: 'cast'
      }
    ],
    license: {
      identifier: 'All Rights Reserved',
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
        rssEnabled: artistMetadata.rssEnabled || false, // Default to false if not present
        blossomServers: artistMetadata.blossomServers || PLATFORM_CONFIG.upload.blossomServers,
        value: artistMetadata.value || {
          amount: 100,
          currency: 'sats',
          recipients: []
        },
        guid: artistMetadata.guid || user?.pubkey || '',
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
          identifier: 'All Rights Reserved',
          url: ''
        },
      });
    }
  }, [artistMetadata, isLoadingMetadata, user?.pubkey, name]);

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

  // Blossom server management functions
  const validateBlossomServerUrl = (url: string): boolean => {
    try {
      const parsedUrl = new URL(url);
      return parsedUrl.protocol === 'https:' && parsedUrl.hostname.length > 0;
    } catch {
      return false;
    }
  };

  const handleBlossomServerAdd = () => {
    const newServer = '';
    handleInputChange('blossomServers', [...formData.blossomServers, newServer]);
  };

  const handleBlossomServerUpdate = (index: number, url: string) => {
    const updatedServers = [...formData.blossomServers];
    updatedServers[index] = url;
    handleInputChange('blossomServers', updatedServers);
  };

  const handleBlossomServerRemove = (index: number) => {
    const updatedServers = formData.blossomServers.filter((_, i) => i !== index);
    handleInputChange('blossomServers', updatedServers);
  };

  const resetToDefaultServers = () => {
    handleInputChange('blossomServers', PLATFORM_CONFIG.upload.blossomServers);
  };

  // Handle copy to clipboard
  const handleCopyRSSUrl = async () => {
    const baseUrl = window.location.origin;
    const rssUrl = `${baseUrl}/rss/${user?.pubkey || 'your-pubkey'}.xml`;
    try {
      await navigator.clipboard.writeText(rssUrl);
      setCopied(true);
      toast({
        title: 'Copied!',
        description: 'RSS feed URL copied to clipboard',
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      toast({
        title: 'Copy failed',
        description: 'Could not copy to clipboard',
        variant: 'destructive',
      });
    }
  };

  const handleSave = async () => {
    // Validate Blossom servers before saving
    const invalidServers = formData.blossomServers.filter(server => 
      server.trim() !== '' && !validateBlossomServerUrl(server)
    );
    
    if (invalidServers.length > 0) {
      toast({
        title: "Invalid Blossom servers",
        description: "Please ensure all Blossom server URLs are valid HTTPS URLs.",
        variant: "destructive",
      });
      return;
    }

    // Filter out empty server URLs
    const validServers = formData.blossomServers.filter(server => server.trim() !== '');
    
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
          rssEnabled: formData.rssEnabled,
          blossomServers: validServers.length > 0 ? validServers : PLATFORM_CONFIG.upload.blossomServers,
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
                <Label htmlFor="artist-image">Artist Image</Label>
                <div className="space-y-2">
                  <Input
                    id="artist-image"
                    value={formData.image}
                    onChange={(e) => handleInputChange('image', e.target.value)}
                    placeholder="https://example.com/image.jpg"
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter a direct URL to your artist image, or upload files using your configured Blossom servers.
                  </p>
                </div>
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

          {/* RSS Settings */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="rss-enabled" className="text-base font-semibold">RSS Feed</Label>
                <p className="text-sm text-muted-foreground">
                  Enable RSS feed generation for your music releases. When enabled, your music will be available via RSS at a unique feed URL.
                </p>
              </div>
              <Switch
                id="rss-enabled"
                checked={formData.rssEnabled}
                onCheckedChange={(checked) => handleInputChange('rssEnabled', checked)}
                className="data-[state=checked]:bg-orange-500"
              />
            </div>
            {formData.rssEnabled && (
              <div className="flex items-center justify-between gap-2 p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                <div className="flex items-center gap-2">
                  <Rss className="w-4 h-4 text-orange-500" />
                  <p className="text-sm text-foreground">
                    Your RSS feed will be available at: <code className="text-xs px-1 py-0.5 rounded text-orange-600">/rss/{user?.pubkey || 'your-pubkey'}.xml</code>
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyRSSUrl}
                  className="h-8 px-2 text-orange-600 hover:text-orange-700 hover:bg-orange-500/10"
                >
                  {copied ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
            )}
          </div>

          {/* Blossom Server Configuration */}
          <div className="space-y-4">
            <div className="space-y-1">
              <Label className="text-base font-semibold">Blossom Servers</Label>
              <p className="text-sm text-muted-foreground">
                Configure your preferred Blossom servers for file uploads. These servers will be used for storing your music files and images.
              </p>
            </div>
            
            <div className="space-y-3">
              {formData.blossomServers.map((server, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    value={server}
                    onChange={(e) => handleBlossomServerUpdate(index, e.target.value)}
                    placeholder="https://blossom.example.com"
                    className={`flex-1 ${server.trim() !== '' && !validateBlossomServerUrl(server) ? 'border-destructive' : ''}`}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleBlossomServerRemove(index)}
                    className="h-10 w-10 p-0 text-muted-foreground hover:text-destructive"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBlossomServerAdd}
                  className="flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Server
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetToDefaultServers}
                  className="text-muted-foreground"
                >
                  Reset to Defaults
                </Button>
              </div>
              
              <div className="text-xs text-muted-foreground">
                Default servers: {PLATFORM_CONFIG.upload.blossomServers.join(', ')}
              </div>
            </div>
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
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
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