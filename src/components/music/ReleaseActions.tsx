import { MessageCircle, Heart, Share } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ZapButton } from '@/components/ZapButton';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useToast } from '@/hooks/useToast';
import { useQueryClient } from '@tanstack/react-query';
import { useComments } from '@/hooks/useComments';
import { useReactions } from '@/hooks/useReactions';
import { useZapCounts } from '@/hooks/useZapCounts';
import { encodeMusicPlaylistAsNaddr } from '@/lib/nip19Utils';
import { MUSIC_KINDS } from '@/lib/musicConfig';
import type { NostrEvent } from '@nostrify/nostrify';
import type { MusicRelease } from '@/types/music';
import { cn } from '@/lib/utils';

interface ReleaseActionsProps {
  release: MusicRelease;
  className?: string;
  showComments?: boolean;
  onToggleComments?: () => void;
}

// Create a NostrEvent-like object from MusicRelease
function createEventFromrelease(release: MusicRelease): NostrEvent {
  return {
    id: release.eventId,
    kind: MUSIC_KINDS.MUSIC_PLAYLIST, // Music playlist events (releases)
    pubkey: release.artistPubkey,
    created_at: Math.floor(release.createdAt.getTime() / 1000),
    tags: [
      ['d', release.identifier], // Addressable event identifier
      ['title', release.title],
      ['t', 'playlist'],
    ],
    content: release.content || release.description || '',
    sig: '' // Not needed for actions
  } as NostrEvent;
}

export function ReleaseActions({ release, className, showComments, onToggleComments }: ReleaseActionsProps) {
  const { user } = useCurrentUser();
  const { mutate: createEvent } = useNostrPublish();
  const { toast } = useToast();
  const queryClient = useQueryClient();


  const event = createEventFromrelease(release);

  // Query for release comments (NIP-22 comments)
  const { data: commentsData } = useComments(event);
  const commentCount = commentsData?.topLevelComments?.length || 0;

  // Use the reliable reactions hook for reactions data and user like status
  const { count: likesCount, hasUserLiked } = useReactions(release.eventId);

  // Use the reliable zap counts hook for zap data
  const { count: zapCount, totalSats } = useZapCounts(release.eventId);


  const handleLike = async () => {
    if (!user) {
      toast({
        title: "Login required",
        description: "Please log in to like.",
        variant: "destructive",
      });
      return;
    }

    if (hasUserLiked) {
      toast({
        title: "Already liked",
        description: "You have already liked this release.",
      });
      return;
    }

    try {
      // Optimistically update reactions data
      queryClient.setQueryData(['release-reactions', release.eventId], (old: any) => {
        if (!old) return [];
        // Add new reaction entry
        const newReaction = {
          userPubkey: user.pubkey,
          timestamp: new Date(),
          eventId: `temp-${Date.now()}`
        };
        return [newReaction, ...old];
      });

      // Publish the like
      await createEvent({
        kind: 7,
        content: '+',
        tags: [
          ['e', release.eventId],
          ['p', release.artistPubkey],
          ['k', release.tracks.length === 1 ? '36787' : '34139'] // Music track or playlist
        ]
      });

      toast({
        title: "Liked!",
        description: "Your like has been published to the network.",
      });

      // Delay invalidation to allow network propagation
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['release-reactions', release.eventId] });
      }, 2000);
    } catch {
      // Revert optimistic updates on error
      queryClient.invalidateQueries({ queryKey: ['release-reactions', release.eventId] });

      toast({
        title: "Failed to like",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleShare = async () => {
    try {
      // Use naddr format for sharing (canonical Nostr format)
      const naddr = encodeMusicPlaylistAsNaddr(release.artistPubkey, release.identifier);
      const url = `${window.location.origin}/release/${naddr}`;

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
    <div className={cn("flex items-center space-x-3 sm:space-x-2", className)}>
      {/* Comment Button */}
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "text-muted-foreground hover:text-purple-500 h-10 px-3 sm:h-8 sm:px-2",
          showComments && "text-purple-500"
        )}
        onClick={onToggleComments}
      >
        <MessageCircle className={cn(
          "w-5 h-5 sm:w-4 sm:h-4 mr-1.5 sm:mr-1",
          showComments && "fill-current"
        )} />
        <span className="text-sm sm:text-xs">
          {commentCount}
        </span>
      </Button>

      {/* Like Button */}
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "text-muted-foreground hover:text-red-500 h-10 px-3 sm:h-8 sm:px-2",
          hasUserLiked && "text-red-500"
        )}
        onClick={handleLike}
      >
        <Heart className={cn(
          "w-5 h-5 sm:w-4 sm:h-4 mr-1.5 sm:mr-1",
          hasUserLiked && "fill-current"
        )} />
        <span className="text-sm sm:text-xs">
          {likesCount}
        </span>
      </Button>

      {/* Zap Button */}
      <ZapButton
        target={event}
        className="text-sm sm:text-xs h-10 px-3 sm:h-8 sm:px-2"
        zapData={{
          count: zapCount,
          totalSats: totalSats,
          isLoading: false
        }}
        hideWhenEmpty={false}
        onZapSuccess={(amount: number) => {
          // Optimistically update zap counts when zap succeeds
          queryClient.setQueryData(['release-zap-counts', release.eventId], (old: any) => {
            if (!old) return [];
            // Add new zap entry
            const newZap = {
              userPubkey: user?.pubkey || '',
              amount,
              timestamp: new Date(),
              eventId: `temp-${Date.now()}`
            };
            return [newZap, ...old];
          });
        }}
      />

      {/* Share Button */}
      <Button
        variant="ghost"
        size="sm"
        className="text-muted-foreground hover:text-purple-500 h-10 px-3 sm:h-8 sm:px-2"
        onClick={handleShare}
      >
        <Share className="w-5 h-5 sm:w-4 sm:h-4" />
      </Button>

    </div>
  );
}