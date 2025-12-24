import React from 'react';
import { Play, Pause, ListMusic } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import { formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';
import { nip19 } from 'nostr-tools';
import { MUSIC_KINDS } from '@/lib/musicConfig';
import type { MusicPlaylistData } from '@/types/music';

interface PlaylistCardProps {
  playlist: MusicPlaylistData;
  className?: string;
}

export function PlaylistCard({ playlist, className }: PlaylistCardProps) {
  const { playRelease } = useAudioPlayer();

  const handlePlay = () => {
    // Convert MusicPlaylistData to MusicRelease format for the audio player
    const releaseData = {
      id: playlist.identifier,
      title: playlist.title,
      imageUrl: playlist.imageUrl,
      description: playlist.description,
      content: playlist.description,
      tracks: playlist.tracks.map(trackRef => ({
        title: trackRef.title || 'Unknown Track',
        audioUrl: '', // Would need to resolve track references
        duration: undefined,
        explicit: false,
        language: null
      })),
      publishDate: playlist.createdAt || new Date(),
      tags: playlist.categories || [],
      genre: playlist.categories?.[0] || null,
      eventId: playlist.eventId || '',
      artistPubkey: playlist.authorPubkey || '',
      identifier: playlist.identifier,
      createdAt: playlist.createdAt || new Date(),
      zapCount: playlist.zapCount,
      totalSats: playlist.totalSats,
      commentCount: playlist.commentCount,
      repostCount: playlist.repostCount
    };
    playRelease(releaseData);
  };

  // Create naddr for playlist
  const playlistUrl = playlist.authorPubkey ? nip19.naddrEncode({
    identifier: playlist.identifier,
    pubkey: playlist.authorPubkey,
    kind: MUSIC_KINDS.MUSIC_PLAYLIST
  }) : '';

  return (
    <Card className={className}>
      <CardContent className="p-4">
        <Link to={`/${playlistUrl}`} className="block">
          <div className="relative group">
            {/* Cover Art */}
            <div className="aspect-square rounded-lg overflow-hidden bg-muted mb-4 relative">
              {playlist.imageUrl ? (
                <img 
                  src={playlist.imageUrl} 
                  alt={playlist.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ListMusic className="w-12 h-12 text-muted-foreground" />
                </div>
              )}
              
              {/* Play Button Overlay */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Button
                  size="lg"
                  className="rounded-full w-12 h-12 p-0"
                  onClick={(e) => {
                    e.preventDefault();
                    handlePlay();
                  }}
                >
                  <Play className="w-6 h-6 ml-1" />
                </Button>
              </div>
            </div>

            {/* Playlist Info */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  Playlist
                </Badge>
              </div>
              
              <h3 className="font-medium text-sm line-clamp-2">{playlist.title}</h3>
              <p className="text-xs text-muted-foreground line-clamp-1">
                {playlist.tracks.length} tracks
              </p>
              
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{playlist.tracks.length} tracks</span>
                {playlist.createdAt && (
                  <span>{formatDistanceToNow(playlist.createdAt, { addSuffix: true })}</span>
                )}
              </div>
            </div>
          </div>
        </Link>
      </CardContent>
    </Card>
  );
}