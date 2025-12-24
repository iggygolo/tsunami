import { useQueryClient } from '@tanstack/react-query';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useToast } from '@/hooks/useToast';
import { useComments } from '@/hooks/useComments';
import { useReactions } from '@/hooks/useReactions';
import { useZapCounts } from '@/hooks/useZapCounts';
import { encodeReleaseAsNaddr } from '@/lib/nip19Utils';
import type { MusicRelease } from '@/types/music';
import type { NostrEvent } from '@nostrify/nostrify';

interface UseReleaseInteractionsProps {
  release: MusicRelease | null;
  event: NostrEvent | null;
  commentEvent: NostrEvent | null;
}

export function useReleaseInteractions({ release, event, commentEvent }: UseReleaseInteractionsProps) {
  const { user } = useCurrentUser();
  const { mutate: createEvent } = useNostrPublish();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query for release comments (only when we have a valid event)
  const { data: commentsData } = useComments(
    event || commentEvent || new URL('about:blank'), // Fallback to dummy URL
    100
  );
  const commentCount = commentsData?.topLevelComments?.length || 0;

  // Use the reliable reactions hook for reactions data and user like status
  const { count: reactionsCount, hasUserLiked } = useReactions(release?.eventId || '');

  // Use the reliable zap counts hook for zap data
  const { count: zapCount, totalSats } = useZapCounts(release?.eventId || '');

  // Combine reactions and zaps data
  const interactionCounts = {
    likes: reactionsCount,
    zaps: zapCount,
    totalSats: totalSats
  };

  const handleLike = async () => {
    if (!user || !release) {
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

      createEvent({
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
        description: "Your like has been published.",
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
    if (!release) return;
    
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

  return {
    commentCount,
    interactionCounts,
    hasUserLiked,
    handleLike,
    handleShare
  };
}