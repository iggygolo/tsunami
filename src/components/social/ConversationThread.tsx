import { PostCard } from './PostCard';
import { getArtistPubkeyHex } from '@/lib/podcastConfig';
import type { NostrEvent } from '@nostrify/nostrify';
import { cn } from '@/lib/utils';

interface ConversationThreadProps {
  event: NostrEvent;
  className?: string;
}

export function ConversationThread({ event, className }: ConversationThreadProps) {
  const isArtist_user = event.pubkey === getArtistPubkeyHex();
  const isReply = event.tags.some(tag => tag[0] === 'e');

  // Determine if this should be shown in compact mode
  // Replies in conversation threads should be compact by default
  const isCompact = isReply;

  return (
    <div className={cn("relative", className)}>
      {/* For artist replies, style them distinctly */}
      <div className={cn(
        "relative",
        isReply && isArtist_user && "ml-4 border-l-2 border-l-muted/40 pl-4"
      )}>
        <PostCard
          event={event}
          isCompact={isCompact}
        />
      </div>

      {/* Add connecting line between original and reply */}
      {isReply && isArtist_user && (
        <div className="absolute left-2 top-8 bottom-4 w-0.5 bg-muted/40"></div>
      )}
    </div>
  );
}