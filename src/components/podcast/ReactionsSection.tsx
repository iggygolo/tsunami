import { Heart, Calendar } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthor } from '@/hooks/useAuthor';
import { useReactions, type ReactionEntry } from '@/hooks/useReactions';
import { genUserName } from '@/lib/genUserName';

interface ReactionEntry {
  userPubkey: string;
  timestamp: Date;
  eventId: string;
}

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
    <div className="flex items-center space-x-4 py-4 px-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
      <Avatar className="w-10 h-10 ring-2 ring-white/20">
        <AvatarImage src={metadata?.picture} alt={displayName} />
        <AvatarFallback className="text-sm bg-white/20 text-white">
          {displayName.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-white truncate">{displayName}</p>
          <div className="flex items-center space-x-1 text-xs text-white/60">
            <Calendar className="w-3 h-3" />
            <span>
              {formatDistanceToNow(reaction.timestamp, { addSuffix: true })}
            </span>
          </div>
        </div>
        
        {metadata?.about && (
          <p className="text-xs text-white/60 mt-1 truncate">
            {metadata.about}
          </p>
        )}
      </div>

      <Heart className="w-5 h-5 text-red-500 fill-current flex-shrink-0" />
    </div>
  );
}

function ReactionItemSkeleton() {
  return (
    <div className="flex items-center space-x-4 py-4 px-4 rounded-lg bg-white/5">
      <Skeleton className="w-10 h-10 rounded-full bg-white/10" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-32 bg-white/10" />
        <Skeleton className="h-3 w-48 bg-white/10" />
      </div>
      <Skeleton className="w-5 h-5 bg-white/10" />
    </div>
  );
}

export function ReactionsSection({ eventId, className }: ReactionsSectionProps) {
  const { reactions, count, isLoading } = useReactions(eventId);

  if (isLoading) {
    return (
      <div className={className}>
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <ReactionItemSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (!reactions || reactions.length === 0) {
    return (
      <div className={className}>
        <div className="text-center text-white/70 py-8">
          <Heart className="w-12 h-12 mx-auto mb-4 text-white/30" />
          <p className="text-lg font-medium text-white mb-2">
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
    <div className={className}>
      <div className="space-y-2">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">
            {count} {count === 1 ? 'Like' : 'Likes'}
          </h3>
        </div>
        
        {console.log('ReactionsSection rendering:', { reactionsCount: count, reactions })}
        
        {reactions.map((reaction) => (
          <ReactionItem key={reaction.eventId} reaction={reaction} />
        ))}
      </div>
    </div>
  );
}