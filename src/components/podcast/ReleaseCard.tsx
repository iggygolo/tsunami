import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Clock, Calendar, MessageCircle, Play, Share } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ZapButton } from '@/components/ZapButton';
import { CommentsSection } from '@/components/comments/CommentsSection';
import { Link } from 'react-router-dom';
import { encodeReleaseAsNaddr } from '@/lib/nip19Utils';
import { useComments } from '@/hooks/useComments';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import { useToast } from '@/hooks/useToast';
import { cn } from '@/lib/utils';
import type { PodcastRelease } from '@/types/podcast';
import type { NostrEvent } from '@nostrify/nostrify';

interface ReleaseCardProps {
  release: PodcastRelease;
  showPlayer?: boolean;
  showComments?: boolean;
  onPlayRelease?: (release: PodcastRelease) => void;
  className?: string;
}

export function ReleaseCard({
  release,
  showPlayer: _showPlayer = false,
  showComments = false,
  onPlayRelease,
  className
}: ReleaseCardProps) {
  const [commentsVisible, setCommentsVisible] = useState(showComments);
  const { playRelease } = useAudioPlayer();
  const { toast } = useToast();
  const formatDuration = (seconds?: number): string => {
    if (!seconds) return '';

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  // Get first track for explicit badge
  const firstTrack = release.tracks?.[0];
  
  // Calculate total duration from all tracks
  const totalDuration = release.tracks?.reduce((sum, track) => sum + (track.duration || 0), 0) || 0;
  
  // Create a mock NostrEvent for the CommentsSection
  const releaseEvent: NostrEvent = {
    id: release.eventId,
    pubkey: release.artistPubkey,
    created_at: Math.floor(release.createdAt.getTime() / 1000),
    kind: 30054, // Addressable podcast releases
    tags: [
      ['d', release.identifier], // Addressable event identifier
      ['title', release.title],
      ...(firstTrack ? [['audio', firstTrack.audioUrl, firstTrack.audioType || 'audio/mpeg']] : []),
      ...(release.description ? [['description', release.description]] : []),
      ...(release.imageUrl ? [['image', release.imageUrl]] : []),
      ...release.tags.map(tag => ['t', tag])
    ],
    content: release.content || '',
    sig: ''
  };

  // Get comment data for count - fallback to release.commentCount if available
  const { data: commentsData } = useComments(releaseEvent);
  const commentCount = commentsData?.topLevelComments?.length || release.commentCount || 0;

  // Generate naddr for release link with relay hints (releases are addressable events)
  const releaseNaddr = encodeReleaseAsNaddr(release.artistPubkey, release.identifier);

  const handleShare = async () => {
    try {
      const naddr = encodeReleaseAsNaddr(release.artistPubkey, release.identifier);
      const url = `${window.location.origin}/${naddr}`;

      await navigator.clipboard.writeText(url);

      toast({
        title: "Link copied!",
        description: "The release link has been copied to your clipboard.",
      });
    } catch {
      toast({
        title: "Failed to copy link",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className={className}>
      <CardContent className="p-4">
        <div className="flex gap-4">
          {/* Cover Image */}
          {release.imageUrl && (
            <Link to={`/${releaseNaddr}`} className="flex-shrink-0">
              <img
                src={release.imageUrl}
                alt={release.title}
                className="w-24 h-24 rounded-lg object-cover hover:opacity-90 transition-opacity"
              />
            </Link>
          )}

          {/* Release Info */}
          <div className="flex-1 min-w-0 flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <Link to={`/${releaseNaddr}`} className="block group">
                    <h3 className="font-semibold text-base leading-tight line-clamp-1 group-hover:text-primary transition-colors">
                      {release.title}
                    </h3>
                  </Link>
                  
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDistanceToNow(release.publishDate, { addSuffix: true })}
                    </span>
                    {totalDuration > 0 && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDuration(totalDuration)}
                      </span>
                    )}
                    {firstTrack?.explicit && (
                      <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4">E</Badge>
                    )}
                  </div>
                </div>

                {/* Social Actions - Right Side */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "text-muted-foreground hover:text-primary h-8 px-2",
                      commentsVisible && "text-primary"
                    )}
                    onClick={() => setCommentsVisible(!commentsVisible)}
                  >
                    <MessageCircle className={cn("w-4 h-4", commentsVisible && "fill-current")} />
                    <span className="text-xs ml-1">{commentCount}</span>
                  </Button>
                  <ZapButton
                    target={releaseEvent}
                    className="h-8 px-2"
                    zapData={{
                      count: release.zapCount || 0,
                      totalSats: release.totalSats || 0,
                      isLoading: false
                    }}
                    hideWhenEmpty={false}
                  />
                  <Button variant="ghost" size="sm" onClick={handleShare} className="h-8 px-2 text-muted-foreground hover:text-primary">
                    <Share className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Tags */}
              {release.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {release.tags.slice(0, 4).map((tag, index) => (
                    <span
                      key={tag}
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        index % 3 === 0 
                          ? 'bg-primary/10 text-primary' 
                          : index % 3 === 1 
                            ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
                            : 'bg-pink-500/10 text-pink-600 dark:text-pink-400'
                      }`}
                    >
                      {tag}
                    </span>
                  ))}
                  {release.tags.length > 4 && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-muted text-muted-foreground">
                      +{release.tags.length - 4}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Description - Compact */}
            {(release.description || release.content) && (
              <p className="text-xs text-muted-foreground line-clamp-1 mt-2">
                {release.description || release.content}
              </p>
            )}
          </div>
        </div>

        {/* Play Button - Full Width */}
        <Button
          onClick={() => {
            playRelease(release);
            onPlayRelease?.(release);
          }}
          className="w-full mt-3 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
          size="sm"
        >
          <Play className="w-4 h-4 fill-current mr-2" />
          Play Release
        </Button>

        {commentsVisible && (
          <div className="mt-4 pt-4 border-t">
            <CommentsSection
              root={releaseEvent}
              title="Release Discussion"
              emptyStateMessage="No comments yet"
              emptyStateSubtitle="Be the first to share your thoughts about this release!"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}