import { Crown, Zap, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthor } from '@/hooks/useAuthor';
import { useZapLeaderboard } from '@/hooks/useZapLeaderboard';
import { genUserName } from '@/lib/genUserName';
import type { ZapLeaderboardEntry } from '@/types/music';

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
        return <Crown className="w-5 h-5 text-muted-foreground" />;
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
    <div className="flex items-start space-x-3 py-3">
      <div className="flex-shrink-0">
        {getRankIcon(rank)}
      </div>
      
      <Avatar className="w-8 h-8">
        <AvatarImage src={metadata?.picture} alt={displayName} />
        <AvatarFallback className="text-xs">
          {displayName.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm font-medium">{displayName}</p>
          <Badge variant="secondary" className="text-xs bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30">
            <Zap className="w-3 h-3 mr-1" />
            {formatAmount(entry.totalAmount)}
          </Badge>
        </div>
        
        <div className="flex items-center space-x-1 text-xs text-muted-foreground">
          <span>{entry.zapCount} zaps</span>
          <span>•</span>
          <Clock className="w-3 h-3" />
          <span>{formatDistanceToNow(entry.lastZapDate, { addSuffix: true })}</span>
        </div>
      </div>
    </div>
  );
}

function LeaderboardSkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-start space-x-3 py-3">
          <Skeleton className="w-5 h-5" />
          <Skeleton className="w-8 h-8 rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-16" />
            </div>
            <Skeleton className="h-3 w-32" />
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
        <div className="space-y-1">
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