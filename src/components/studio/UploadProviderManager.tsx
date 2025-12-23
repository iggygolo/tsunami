import { useState } from 'react';
import { Plus, X, Server, Check, Cloud } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useBlossomServers, DEFAULT_BLOSSOM_SERVERS, isValidBlossomServerUrl } from '@/hooks/useBlossomServers';
import { useUploadConfig } from '@/hooks/useUploadConfig';
import { useToast } from '@/hooks/useToast';

export function UploadProviderManager() {
  const { userServers, allServers, isLoading: blossomLoading, updateServers, isUpdating } = useBlossomServers();
  const { config, updateProvider } = useUploadConfig();
  const { toast } = useToast();
  
  const [newServerUrl, setNewServerUrl] = useState('');
  const [tempServers, setTempServers] = useState<string[]>([]);
  const [isEditingBlossom, setIsEditingBlossom] = useState(false);

  // Blossom server management functions
  const startEditingBlossom = () => {
    setTempServers([...userServers]);
    setIsEditingBlossom(true);
  };

  const cancelEditingBlossom = () => {
    setTempServers([]);
    setNewServerUrl('');
    setIsEditingBlossom(false);
  };

  const addServer = () => {
    const url = newServerUrl.trim();
    
    if (!url) {
      toast({
        title: "Invalid URL",
        description: "Please enter a server URL.",
        variant: "destructive",
      });
      return;
    }

    if (!isValidBlossomServerUrl(url)) {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid HTTP or HTTPS URL.",
        variant: "destructive",
      });
      return;
    }

    if (tempServers.includes(url)) {
      toast({
        title: "Server already exists",
        description: "This server is already in your list.",
        variant: "destructive",
      });
      return;
    }

    setTempServers(prev => [...prev, url]);
    setNewServerUrl('');
  };

  const removeServer = (serverUrl: string) => {
    setTempServers(prev => prev.filter(url => url !== serverUrl));
  };

  const saveServers = async () => {
    try {
      await updateServers(tempServers);
      toast({
        title: "Servers updated!",
        description: "Your Blossom server list has been published to the network.",
      });
      setIsEditingBlossom(false);
      setTempServers([]);
    } catch (error) {
      toast({
        title: "Failed to update servers",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const resetToDefaults = () => {
    setTempServers([...DEFAULT_BLOSSOM_SERVERS]);
  };

  const handleProviderChange = (provider: 'blossom' | 'vercel') => {
    updateProvider(provider);
    toast({
      title: "Upload provider changed",
      description: `Now using ${provider === 'vercel' ? 'Vercel Blob' : 'Blossom Servers'} for uploads.`,
    });
  };

  if (blossomLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-96" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Provider Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Cloud className="w-5 h-5" />
            <span>Upload Provider</span>
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Choose between decentralized Blossom servers or Vercel's cloud storage.
          </p>
        </CardHeader>
        <CardContent>
          <RadioGroup 
            value={config.defaultProvider} 
            onValueChange={handleProviderChange}
            className="space-y-3"
          >
            {/* Blossom Option */}
            <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
              <RadioGroupItem value="blossom" id="blossom" />
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <Server className="w-4 h-4" />
                  <Label htmlFor="blossom" className="font-medium cursor-pointer">Blossom Servers</Label>
                </div>
                <p className="text-sm text-muted-foreground">
                  Decentralized storage • All file types • Up to 500MB • {allServers.length} servers
                </p>
              </div>
            </div>

            {/* Vercel Option */}
            <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
              <RadioGroupItem value="vercel" id="vercel" />
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <Cloud className="w-4 h-4" />
                  <Label htmlFor="vercel" className="font-medium cursor-pointer">Vercel Blob</Label>
                </div>
                <p className="text-sm text-muted-foreground">
                  Cloud storage • Global CDN • Up to 100MB • Audio, video, images
                </p>
              </div>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Blossom Settings */}
      {config.defaultProvider === 'blossom' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Server className="w-5 h-5" />
                <span>Blossom Settings</span>
              </div>
              {!isEditingBlossom ? (
                <Button onClick={startEditingBlossom} size="sm" variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Manage Servers
                </Button>
              ) : (
                <div className="flex items-center space-x-2">
                  <Button variant="ghost" size="sm" onClick={cancelEditingBlossom} disabled={isUpdating}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={saveServers} disabled={isUpdating}>
                    <Check className="w-4 h-4 mr-2" />
                    {isUpdating ? 'Saving...' : 'Save'}
                  </Button>
                </div>
              )}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {userServers.length} custom servers • {allServers.length} total available
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Custom Servers */}
            {(isEditingBlossom ? tempServers : userServers).length > 0 && (
              <div className="space-y-3">
                <Label className="text-sm font-medium">Your Custom Servers</Label>
                <div className="space-y-2">
                  {(isEditingBlossom ? tempServers : userServers).map((serverUrl) => (
                    <div key={serverUrl} className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                      <div className="flex items-center space-x-3">
                        <Server className="w-4 h-4 text-muted-foreground" />
                        <span className="font-mono text-sm">{serverUrl}</span>
                      </div>
                      {isEditingBlossom && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeServer(serverUrl)}
                          className="text-destructive hover:text-destructive h-8 w-8 p-0"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Add Server Form */}
            {isEditingBlossom && (
              <div className="space-y-3 p-4 bg-muted/50 rounded-lg border-2 border-dashed">
                <Label className="text-sm font-medium">Add Custom Server</Label>
                <div className="flex space-x-2">
                  <Input
                    value={newServerUrl}
                    onChange={(e) => setNewServerUrl(e.target.value)}
                    placeholder="https://blossom.example.com"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        addServer();
                      }
                    }}
                  />
                  <Button onClick={addServer} disabled={!newServerUrl.trim()}>
                    Add
                  </Button>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetToDefaults}
                  className="w-full"
                >
                  Reset to Default Servers
                </Button>
              </div>
            )}

            {/* Default Servers Preview */}
            {!isEditingBlossom && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Default Servers</Label>
                <div className="text-sm text-muted-foreground">
                  Using {DEFAULT_BLOSSOM_SERVERS.length} default Blossom servers for reliable uploads
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Vercel Settings */}
      {config.defaultProvider === 'vercel' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Cloud className="w-5 h-5" />
              <span>Vercel Blob Settings</span>
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Fast, reliable cloud storage with global CDN distribution.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <Check className="h-4 w-4" />
              <AlertDescription>
                <strong>Ready to use!</strong> Vercel Blob is configured automatically. 
                Files are uploaded securely and stored with unique names.
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium mb-2 flex items-center space-x-2">
                  <Cloud className="w-4 h-4" />
                  <span>Features</span>
                </h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Global CDN distribution</li>
                  <li>• Fast upload speeds</li>
                  <li>• Automatic optimization</li>
                  <li>• 100MB file size limit</li>
                </ul>
              </div>
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium mb-2 flex items-center space-x-2">
                  <Server className="w-4 h-4" />
                  <span>Supported Files</span>
                </h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Audio files (MP3, WAV, etc.)</li>
                  <li>• Images (JPEG, PNG, WebP)</li>
                  <li>• Video files (MP4, MOV)</li>
                  <li>• Documents (JSON, SRT, VTT)</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}