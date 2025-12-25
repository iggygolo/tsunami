import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Layout } from '@/components/Layout';
import { useUniversalAudioPlayer, type UniversalTrack } from '@/contexts/UniversalAudioPlayerContext';

export default function DebugAudio() {
  const [testUrl, setTestUrl] = useState('https://www.soundjay.com/misc/sounds/fail-buzzer-02.wav');
  const { playTrack, state: playerState } = useUniversalAudioPlayer();

  // Create a mock universal track for testing
  const createTestTrack = (audioUrl: string): UniversalTrack => ({
    id: 'test-track',
    title: 'Test Audio Track',
    artist: 'Debug Test',
    audioUrl,
    duration: undefined,
    imageUrl: undefined,
    explicit: false,
    language: 'en',
    source: {
      type: 'profile',
      artistPubkey: 'test-pubkey'
    },
    eventId: 'test-event',
    identifier: 'test-track-identifier',
  });

  const [currentTrack, setCurrentTrack] = useState<UniversalTrack | null>(null);

  const handleTestAudio = () => {
    if (testUrl.trim()) {
      const testTrack = createTestTrack(testUrl.trim());
      setCurrentTrack(testTrack);
      // Test the universal audio player
      playTrack(testTrack, [testTrack], 'Debug Test');
    }
  };

  const testUrls = [
    {
      name: 'SoundJay Test Audio (WAV)',
      url: 'https://www.soundjay.com/misc/sounds/fail-buzzer-02.wav'
    },
    {
      name: 'File Sample MP3',
      url: 'https://file-examples.com/storage/fe68c7beb669e21964c1e8a/2017/11/file_example_MP3_700KB.mp3'
    },
    {
      name: 'Sample Videos MP3',
      url: 'https://sample-videos.com/zip/10/mp3/SampleAudio_0.4mb_mp3.mp3'
    }
  ];

  return (
    <Layout>
      <div className="py-8">
        <Card>
        <CardHeader>
          <CardTitle>Audio Player Debug</CardTitle>
          <p className="text-sm text-muted-foreground">
            Test audio playback with different URLs to debug issues
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Custom URL Test */}
          <div className="space-y-3">
            <h3 className="text-lg font-medium">Test Custom URL</h3>
            <div className="flex space-x-2">
              <Input
                placeholder="Enter audio URL to test..."
                value={testUrl}
                onChange={(e) => setTestUrl(e.target.value)}
                className="flex-1"
              />
              <Button onClick={handleTestAudio} disabled={!testUrl.trim()}>
                Test Audio
              </Button>
            </div>
          </div>

          {/* Preset URLs */}
          <div className="space-y-3">
            <h3 className="text-lg font-medium">Test Known URLs</h3>
            <div className="grid gap-2">
              {testUrls.map((preset) => (
                <div key={preset.name} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium text-sm">{preset.name}</p>
                    <p className="text-xs text-muted-foreground font-mono break-all">
                      {preset.url}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setTestUrl(preset.url);
                      const testTrack = createTestTrack(preset.url);
                      setCurrentTrack(testTrack);
                      playTrack(testTrack, [testTrack], 'Debug Test');
                    }}
                  >
                    Test
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Current Track Info */}
          {currentTrack && (
            <div className="space-y-3">
              <h3 className="text-lg font-medium">Current Test Track</h3>
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-sm"><strong>Title:</strong> {currentTrack.title}</p>
                <p className="text-sm"><strong>Artist:</strong> {currentTrack.artist}</p>
                <p className="text-sm"><strong>Audio URL:</strong> {currentTrack.audioUrl}</p>
                <p className="text-sm"><strong>Playing:</strong> {playerState.isPlaying ? 'Yes' : 'No'}</p>
                <p className="text-sm"><strong>Current Time:</strong> {playerState.currentTime.toFixed(2)}s</p>
                <p className="text-sm"><strong>Duration:</strong> {playerState.duration.toFixed(2)}s</p>
                {playerState.error && (
                  <p className="text-sm text-red-600"><strong>Error:</strong> {playerState.error}</p>
                )}
              </div>
            </div>
          )}

          {/* Browser Audio Support Info */}
          <div className="space-y-3">
            <h3 className="text-lg font-medium">Browser Support Info</h3>
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <p className="text-sm">
                <strong>User Agent:</strong> {navigator.userAgent}
              </p>
              <p className="text-sm">
                <strong>Audio Support:</strong>
              </p>
              <ul className="text-sm space-y-1 ml-4">
                <li>MP3: {document.createElement('audio').canPlayType('audio/mpeg') || 'No'}</li>
                <li>WAV: {document.createElement('audio').canPlayType('audio/wav') || 'No'}</li>
                <li>OGG: {document.createElement('audio').canPlayType('audio/ogg') || 'No'}</li>
                <li>AAC: {document.createElement('audio').canPlayType('audio/aac') || 'No'}</li>
              </ul>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-muted/30 border border-border rounded-lg p-4">
            <h4 className="font-medium text-foreground mb-2">Debug Steps:</h4>
            <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Test with the preset URLs to verify basic audio playback works</li>
              <li>Check the browser console for detailed error messages</li>
              <li>Verify your uploaded audio files are accessible</li>
              <li>Check if CORS headers are properly set on your Blossom servers</li>
              <li>Try different audio formats (MP3, WAV, etc.)</li>
              <li>Use the persistent audio player at the bottom to control playback</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
    </Layout>
  );
}