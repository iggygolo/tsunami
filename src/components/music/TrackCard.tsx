import React from 'react';
import { Play, Pause, Music } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useUniversalAudioPlayer, musicTrackToUniversal } from '@/contexts/UniversalAudioPlayerContext';
import { formatDistanceToNow } from 'date-fns';
import type { MusicTrackData } from '@/types/music';

interface TrackCardProps {
  track: MusicTrackData;
  className?: string;
}

export function TrackCard({ track, className }: TrackCardProps) {
  const { playTrack } = useUniversalAudioPlayer();

  const handlePlay = () => {
    // Convert MusicTrackData to UniversalTrack format
    const universalTrack = musicTrackToUniversal(track, {
      type: 'profile',
      artistPubkey: track.artistPubkey
    });
    
    // Play the single track
    playTrack(universalTrack, [universalTrack], track.title);
  };

  const formatDuration = (seconds?: number): string => {
    if (!seconds) return '';
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card className={className}>
      <CardContent className="p-4">
        <div className="relative group">
          {/* Cover Art */}
          <div className="aspect-square rounded-lg overflow-hidden bg-muted mb-4 relative">
            {track.imageUrl ? (
              <img 
                src={track.imageUrl} 
                alt={track.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Music className="w-12 h-12 text-muted-foreground" />
              </div>
            )}
            
            {/* Play Button Overlay */}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Button
                size="lg"
                className="rounded-full w-12 h-12 p-0"
                onClick={handlePlay}
              >
                <Play className="w-6 h-6 ml-1" />
              </Button>
            </div>
          </div>

          {/* Track Info */}
          <div className="space-y-2">
            <h3 className="font-medium text-sm line-clamp-2">{track.title}</h3>
            <p className="text-xs text-muted-foreground line-clamp-1">
              {track.artist || 'Unknown Artist'}
            </p>
            
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              {track.duration && (
                <span>{formatDuration(track.duration)}</span>
              )}
              {track.createdAt && (
                <span>{formatDistanceToNow(track.createdAt, { addSuffix: true })}</span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}