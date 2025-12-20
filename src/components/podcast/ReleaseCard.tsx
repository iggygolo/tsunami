import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Clock, Calendar, MessageCircle, Share } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { NoteContent } from '@/components/NoteContent';
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

  // Create a mock NostrEvent for the CommentsSection
  const releaseEvent: NostrEvent = {
    id: release.eventId,
    pubkey: release.authorPubkey,
    created_at: Math.floor(release.createdAt.getTime() / 1000),
    kind: 30054, // Addressable podcast releases
    tags: [
      ['d', release.identifier], // Addressable event identifier
      ['title', release.title],
      ['audio', release.audioUrl, release.audioType || 'audio/mpeg'],
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
  const releaseNaddr = encodeReleaseAsNaddr(release.authorPubkey, release.identifier);

  const handleShare = async () => {
    try {
      const naddr = encodeReleaseAsNaddr(release.authorPubkey, release.identifier);
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
      <CardHeader className="pb-3">
        <div className="flex items-start space-x-4">
          {release.imageUrl && (
            <img
              src={release.imageUrl}
              alt={release.title}
              className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
            />
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                {release.explicit && (
                  <Badge variant="destructive">Explicit</Badge>
                )}
              </div>

              <div className="flex items-center space-x-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "text-muted-foreground hover:text-blue-500 h-6 px-1",
                    commentsVisible && "text-blue-500"
                  )}
                  onClick={() => setCommentsVisible(!commentsVisible)}
                >
                  <MessageCircle className={cn(
                    "w-3 h-3 mr-1",
                    commentsVisible && "fill-current"
                  )} />
                  <span className="text-xs">
                    {commentCount}
                  </span>
                </Button>
              </div>
            </div>

            <Link
              to={`/${releaseNaddr}`}
              className="block group"
            >
              <h3 className="font-semibold text-lg mb-2 line-clamp-2 group-hover:text-primary transition-colors cursor-pointer">
                {release.title}
              </h3>
            </Link>

            <div className="flex items-center space-x-4 text-sm text-muted-foreground mb-3">
              <div className="flex items-center space-x-1">
                <Calendar className="w-3 h-3" />
                <span>{formatDistanceToNow(release.publishDate, { addSuffix: true })}</span>
              </div>

              {release.duration && (
                <div className="flex items-center space-x-1">
                  <Clock className="w-3 h-3" />
                  <span>{formatDuration(release.duration)}</span>
                </div>
              )}
            </div>

            {release.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-3">
                {release.tags.slice(0, 5).map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    #{tag}
                  </Badge>
                ))}
                {release.tags.length > 5 && (
                  <Badge variant="outline" className="text-xs">
                    +{release.tags.length - 5} more
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {release.description && (
          <div className="mb-4">
            <p className="text-sm text-muted-foreground line-clamp-3">
              {release.description}
            </p>
          </div>
        )}

        {release.content && (
          <div className="mb-4 prose prose-sm max-w-none">
            <NoteContent
              event={releaseEvent}
              className="text-sm"
            />
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Button
              onClick={() => {
                playRelease(release);
                onPlayRelease?.(release);
              }}
              className="flex-shrink-0"
            >
              Play Release
            </Button>

            <ZapButton
              target={releaseEvent}
              className="text-xs"
              zapData={{
                count: release.zapCount || 0,
                totalSats: release.totalSats || 0,
                isLoading: false
              }}
              hideWhenEmpty={false}
            />
          </div>

          <Button variant="ghost" size="sm" onClick={handleShare}>
            <Share className="w-4 h-4" />
          </Button>
        </div>

        {commentsVisible && (
          <div className="mt-6 pt-6 border-t">
            <CommentsSection
              root={releaseEvent}
              title="release Discussion"
              emptyStateMessage="No comments yet"
              emptyStateSubtitle="Be the first to share your thoughts about this release!"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}