import { Crown, Zap, Calendar } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthor } from '@/hooks/useAuthor';
import { useZapLeaderboard } from '@/hooks/useZapLeaderboard';
import { genUserName } from '@/lib/genUserName';
import type { ZapLeaderboardEntry } from '@/types/podcast';

interface ZapLeaderboardProps {
  limit?: number;
  className?: string;
  showTitle?: boolean;
  eventId?: string; // For track-specific leaderboard
}

interface LeaderboardEntryProps {
  entry: ZapLeaderboardEntry;
  rank: number;
}

function LeaderboardEntry({ entry, rank }: LeaderboardEntryProps) {
  const { data: author } = useAuthor(entry.userPubkey);
  const metadata = author?.metadata;

  const displayName = metadata?.name || metadata?.display_name || genUserName(entry.userPubkey);
  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="w-5 h-5 text-yellow-400" />;
      case 2:
        return <Crown className="w-5 h-5 text-gray-300" />;
      case 3:
        return <Crown className="w-5 h-5 text-amber-600" />;
      default:
        return <div className="w-5 h-5 flex items-center justify-center text-sm font-bold text-white/60 bg-white/10 rounded-full">#{rank}</div>;
    }
  };

  const formatAmount = (sats: number): string => {
    if (sats >= 1000000) {
      return `${(sats / 1000000).toFixed(1)}M`;
    } else if (sats >= 1000) {
      return `${(sats / 1000).toFixed(1)}K`;
    }
    return sats.toString();
  };

  return (
    <div className="flex items-center space-x-4 py-4 px-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
      <div className="flex-shrink-0">
        {getRankIcon(rank)}
      </div>
      
      <Avatar className="w-10 h-10 ring-2 ring-white/20">
        <AvatarImage src={metadata?.picture} alt={displayName} />
        <AvatarFallback className="text-sm bg-white/20 text-white">
          {displayName.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-white truncate">{displayName}</p>
          <div className="flex items-center space-x-2">
            <Badge className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 text-yellow-300 border-yellow-500/30 hover:bg-yellow-500/30">
              <Zap className="w-3 h-3 mr-1" />
              {formatAmount(entry.totalAmount)}
            </Badge>
          </div>
        </div>
        
        <div className="flex items-center space-x-4 text-xs text-white/60 mt-1">
          <span>{entry.zapCount} zaps</span>
          <div className="flex items-center space-x-1">
            <Calendar className="w-3 h-3" />
            <span>
              {formatDistanceToNow(entry.lastZapDate, { addSuffix: true })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function LeaderboardSkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center space-x-4 py-4 px-4 rounded-lg bg-white/5">
          <Skeleton className="w-5 h-5 bg-white/20" />
          <Skeleton className="w-10 h-10 rounded-full bg-white/20" />
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-24 bg-white/20" />
              <Skeleton className="h-5 w-16 bg-white/20" />
            </div>
            <div className="flex items-center space-x-4">
              <Skeleton className="h-3 w-16 bg-white/20" />
              <Skeleton className="h-3 w-20 bg-white/20" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function ZapLeaderboard({ 
  limit = 10, 
  className,
  showTitle = true,
  eventId 
}: ZapLeaderboardProps) {
  const { data: leaderboard, isLoading, error } = useZapLeaderboard(limit, eventId);

  const content = () => {
    if (error) {
      return (
        <p className="text-sm text-muted-foreground text-center py-4">
          Failed to load leaderboard
        </p>
      );
    }

    if (isLoading) {
      return <LeaderboardSkeleton />;
    }

    if (leaderboard && leaderboard.length > 0) {
      return (
        <div className="space-y-2">
          {leaderboard.map((entry, index) => (
            <LeaderboardEntry
              key={entry.userPubkey}
              entry={entry}
              rank={index + 1}
            />
          ))}
        </div>
      );
    }

    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/10 flex items-center justify-center">
          <Zap className="w-8 h-8 text-white/40" />
        </div>
        <p className="text-lg font-medium text-white mb-2">No zaps yet</p>
        <p className="text-sm text-white/60">
          Be the first to support this track!
        </p>
      </div>
    );
  };

  // When showTitle is false, render without Card wrapper
  if (!showTitle) {
    return <div className={className}>{content()}</div>;
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Zap className="w-5 h-5" />
          <span>Top Supporters</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {content()}
      </CardContent>
    </Card>
  );
}