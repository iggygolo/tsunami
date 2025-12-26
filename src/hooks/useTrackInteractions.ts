import { useQueryClient } from '@tanstack/react-query';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useToast } from '@/hooks/useToast';
import { useReactions } from '@/hooks/useReactions';
import { useZapCounts } from '@/hooks/useZapCounts';
import { encodeMusicTrackAsNaddr } from '@/lib/nip19Utils';
import type { MusicTrackData } from '@/types/music';
import type { NostrEvent } from '@nostrify/nostrify';

interface UseTrackInteractionsProps {
  track: MusicTrackData | null;
  event: NostrEvent | null;
}

export function useTrackInteractions({ track, event }: UseTrackInteractionsProps) {
  const { user } = useCurrentUser();
  const { mutate: createEvent } = useNostrPublish();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Use the reliable reactions hook for reactions data and user like status
  const { count: reactionsCount, hasUserLiked } = useReactions(track?.eventId || '');

  // Use the reliable zap counts hook for zap data
  const { count: zapCount, totalSats } = useZapCounts(track?.eventId || '');

  // Combine reactions and zaps data
  const interactionCounts = {
    likes: reactionsCount,
    zaps: zapCount,
    totalSats: totalSats
  };

  const handleLike = async () => {
    if (!user || !track) {
      toast({
        title: "Login required",
        description: "Please log in to like this track.",
        variant: "destructive",
      });
      return;
    }

    if (!track.eventId) {
      toast({
        title: "Cannot like track",
        description: "This track doesn't have a valid event ID.",
        variant: "destructive",
      });
      return;
    }

    try {
      if (hasUserLiked) {
        // Unlike: Find the user's like event and delete it
        const userReaction = reactionsCount > 0 ? 
          queryClient.getQueryData<any[]>(['release-reactions', track.eventId])?.find(
            (r: any) => r.userPubkey === user.pubkey
          ) : null;

        if (userReaction?.eventId) {
          // Optimistically remove the like
          queryClient.setQueryData(['release-reactions', track.eventId], (old: any) => {
            if (!old) return [];
            return old.filter((r: any) => r.userPubkey !== user.pubkey);
          });

          // Publish deletion event
          createEvent({
            kind: 5, // Deletion event
            content: 'Unlike',
            tags: [
              ['e', userReaction.eventId], // Reference to the like event to delete
              ['k', '7'] // Kind of event being deleted (like)
            ]
          });

          toast({
            title: "Unliked",
            description: `Removed like from "${track.title}".`,
          });
        }
      } else {
        // Like: Create new like event
        // Optimistically add the like
        queryClient.setQueryData(['release-reactions', track.eventId], (old: any) => {
          if (!old) return [];
          const newReaction = {
            userPubkey: user.pubkey,
            timestamp: new Date(),
            eventId: `temp-${Date.now()}`
          };
          return [newReaction, ...old];
        });

        createEvent({
          kind: 7, // Like/reaction event
          content: '+',
          tags: [
            ['e', track.eventId],
            ['p', track.artistPubkey || ''],
            ['k', '36787'] // Music track kind
          ]
        });

        toast({
          title: "Liked!",
          description: `Added "${track.title}" to your likes.`,
        });
      }

      // Delay invalidation to allow network propagation
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['release-reactions', track.eventId] });
      }, 2000);
    } catch (error) {
      // Revert optimistic updates on error
      queryClient.invalidateQueries({ queryKey: ['release-reactions', track.eventId] });

      toast({
        title: hasUserLiked ? "Failed to unlike" : "Failed to like",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleShare = async () => {
    if (!track) return;
    
    try {
      let url: string;
      
      // Try to create naddr URL if we have the required data
      if (track.artistPubkey && track.identifier) {
        const naddr = encodeMusicTrackAsNaddr(track.artistPubkey, track.identifier);
        url = `${window.location.origin}/track/${naddr}`;
      } else {
        // Fallback to current page URL
        url = window.location.href;
      }

      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({
          title: track.title,
          text: `Check out "${track.title}" by ${track.artist}`,
          url: url,
        });
        
        toast({
          title: "Shared!",
          description: "Track shared successfully.",
        });
      } else {
        await navigator.clipboard.writeText(url);
        
        toast({
          title: "Link copied!",
          description: "The track link has been copied to your clipboard.",
        });
      }
    } catch (error) {
      toast({
        title: "Failed to share",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  return {
    interactionCounts,
    hasUserLiked,
    handleLike,
    handleShare
  };
}