import { Heart, Calendar } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthor } from '@/hooks/useAuthor';
import { useReactions } from '@/hooks/useReactions';
import { cn } from '@/lib/utils';
import type { ReactionEntry } from '@/hooks/useReactions';
import { genUserName } from '@/lib/genUserName';

interface ReactionsSectionProps {
  eventId: string;
  className?: string;
}

interface ReactionItemProps {
  reaction: ReactionEntry;
}

function ReactionItem({ reaction }: ReactionItemProps) {
  const { data: author } = useAuthor(reaction.userPubkey);
  const metadata = author?.metadata;

  const displayName = metadata?.name || metadata?.display_name || genUserName(reaction.userPubkey);

  return (
    <div className="flex items-center space-x-3 sm:space-x-4 py-3 sm:py-4 px-3 sm:px-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors w-full max-w-full overflow-hidden">
      <Avatar className="w-8 h-8 sm:w-10 sm:h-10 ring-2 ring-white/20 flex-shrink-0">
        <AvatarImage src={metadata?.picture} alt={displayName} />
        <AvatarFallback className="text-xs sm:text-sm bg-white/20 text-white">
          {displayName.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      
      <div className="flex-1 min-w-0 overflow-hidden max-w-full">
        <div className="flex items-center justify-between gap-2 w-full max-w-full overflow-hidden">
          <p className="text-xs sm:text-sm font-semibold text-white truncate flex-1 min-w-0">{displayName}</p>
          <div className="flex items-center space-x-1 text-xs text-white/60 flex-shrink-0">
            <Calendar className="w-3 h-3 flex-shrink-0" />
            <span className="hidden sm:inline whitespace-nowrap">
              {formatDistanceToNow(reaction.timestamp, { addSuffix: true })}
            </span>
            <span className="sm:hidden whitespace-nowrap">
              {formatDistanceToNow(reaction.timestamp, { addSuffix: true }).replace(' ago', '')}
            </span>
          </div>
        </div>
        
        {metadata?.about && (
          <p className="text-xs text-white/60 mt-1 truncate max-w-full">
            {metadata.about}
          </p>
        )}
      </div>

      <Heart className="w-4 h-4 sm:w-5 sm:h-5 text-red-500 fill-current flex-shrink-0" />
    </div>
  );
}

function ReactionItemSkeleton() {
  return (
    <div className="flex items-center space-x-3 sm:space-x-4 py-3 sm:py-4 px-3 sm:px-4 rounded-lg bg-white/5">
      <Skeleton className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/10 flex-shrink-0" />
      <div className="flex-1 space-y-2 min-w-0">
        <Skeleton className="h-3 sm:h-4 w-24 sm:w-32 bg-white/10" />
        <Skeleton className="h-3 w-32 sm:w-48 bg-white/10" />
      </div>
      <Skeleton className="w-4 h-4 sm:w-5 sm:h-5 bg-white/10 flex-shrink-0" />
    </div>
  );
}

export function ReactionsSection({ eventId, className }: ReactionsSectionProps) {
  const { reactions, count, isLoading } = useReactions(eventId);

  if (isLoading) {
    return (
      <div className={cn("w-full max-w-full overflow-hidden", className)}>
        <div className="space-y-2 max-w-full overflow-hidden">
          {[...Array(3)].map((_, i) => (
            <ReactionItemSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (!reactions || reactions.length === 0) {
    return (
      <div className={cn("w-full max-w-full overflow-hidden", className)}>
        <div className="text-center text-white/70 py-6 sm:py-8">
          <Heart className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4 text-white/30" />
          <p className="text-base sm:text-lg font-medium text-white mb-2">
            No reactions yet
          </p>
          <p className="text-sm">
            Be the first to show your support!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("w-full max-w-full overflow-hidden", className)}>
      <div className="space-y-2 max-w-full overflow-hidden">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <h3 className="text-base sm:text-lg font-semibold text-white">
            {count} {count === 1 ? 'Like' : 'Likes'}
          </h3>
        </div>
        
        <div className="space-y-2 max-w-full overflow-hidden">
          {reactions.map((reaction) => (
            <ReactionItem key={reaction.eventId} reaction={reaction} />
          ))}
        </div>
      </div>
    </div>
  );
}