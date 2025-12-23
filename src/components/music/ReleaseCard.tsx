import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { MessageCircle, Play, Share } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ZapButton } from '@/components/ZapButton';
import { CommentsSection } from '@/components/comments/CommentsSection';
import { Link } from 'react-router-dom';
import { encodeReleaseAsNaddr } from '@/lib/nip19Utils';
import { PODCAST_KINDS } from '@/lib/podcastConfig';
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
    kind: PODCAST_KINDS.MUSIC_PLAYLIST, // Music playlist events (releases)
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
    <Card className={cn("overflow-hidden", className)}>
      {/* Cover Image - Top */}
      {release.imageUrl && (
        <Link to={`/${releaseNaddr}`} className="block relative group">
          <img
            src={release.imageUrl}
            alt={release.title}
            className="w-full aspect-square object-cover group-hover:opacity-90 transition-opacity"
          />
          {/* Play overlay on hover */}
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
            <div 
              className="w-12 h-12 rounded-full bg-gradient-to-r from-cyan-500 to-purple-500 flex items-center justify-center shadow-lg cursor-pointer"
              onClick={(e) => {
                e.preventDefault();
                playRelease(release);
                onPlayRelease?.(release);
              }}
            >
              <Play className="w-6 h-6 text-white fill-current ml-0.5" />
            </div>
          </div>
        </Link>
      )}

      <CardContent className="p-3">
        {/* Title & Meta */}
        <Link to={`/${releaseNaddr}`} className="block group">
          <h3 className="font-semibold text-sm leading-tight line-clamp-1 group-hover:text-primary transition-colors">
            {release.title}
          </h3>
        </Link>
        
        <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
          <span>{formatDistanceToNow(release.publishDate, { addSuffix: true })}</span>
          {totalDuration > 0 && (
            <>
              <span>•</span>
              <span>{formatDuration(totalDuration)}</span>
            </>
          )}
          {firstTrack?.explicit && (
            <Badge variant="destructive" className="text-[9px] px-1 py-0 h-3.5">E</Badge>
          )}
        </div>

        {/* Tags */}
        {release.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {release.tags.slice(0, 2).map((tag, index) => (
              <span
                key={tag}
                className={`inline-flex items-center px-1.5 py-0 rounded-full text-[10px] font-medium ${
                  index % 2 === 0 
                    ? 'bg-primary/10 text-primary' 
                    : 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
                }`}
              >
                {tag}
              </span>
            ))}
            {release.tags.length > 2 && (
              <span className="inline-flex items-center px-1.5 py-0 rounded-full text-[10px] font-medium bg-muted text-muted-foreground">
                +{release.tags.length - 2}
              </span>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between mt-3 pt-2 border-t">
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "text-muted-foreground hover:text-primary h-7 px-1.5",
                commentsVisible && "text-primary"
              )}
              onClick={() => setCommentsVisible(!commentsVisible)}
            >
              <MessageCircle className={cn("w-3.5 h-3.5", commentsVisible && "fill-current")} />
              <span className="text-[11px] ml-0.5">{commentCount}</span>
            </Button>
            <ZapButton
              target={releaseEvent}
              className="h-7 px-1.5"
              zapData={{
                count: release.zapCount || 0,
                totalSats: release.totalSats || 0,
                isLoading: false
              }}
              hideWhenEmpty={false}
            />
            <Button variant="ghost" size="sm" onClick={handleShare} className="h-7 px-1.5 text-muted-foreground hover:text-primary">
              <Share className="w-3.5 h-3.5" />
            </Button>
          </div>
          <Button
            onClick={() => {
              playRelease(release);
              onPlayRelease?.(release);
            }}
            size="sm"
            className="h-6 px-2.5 text-[11px] bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600"
          >
            <Play className="w-3 h-3 fill-current mr-1" />
            Play
          </Button>
        </div>

        {commentsVisible && (
          <div className="mt-3 pt-3 border-t">
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