import { Zap, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthor } from '@/hooks/useAuthor';
import { useCommunityRecentZapActivity } from '@/hooks/useCommunityZaps';
import { usePlaylist } from '@/hooks/useReleases';
import { genUserName } from '@/lib/genUserName';

interface ActivityItemProps {
  userPubkey: string;
  amount: number;
  releaseId?: string;
  targetArtistPubkey?: string;
  timestamp: Date;
}

function ActivityItem({ userPubkey, amount, releaseId, targetArtistPubkey, timestamp }: ActivityItemProps) {
  const { data: author } = useAuthor(userPubkey);
  const { data: targetArtist } = useAuthor(targetArtistPubkey || '');
  const { data: release } = usePlaylist(releaseId || '');
  const metadata = author?.metadata;
  const targetMetadata = targetArtist?.metadata;

  const displayName = metadata?.name || metadata?.display_name || genUserName(userPubkey);
  const targetArtistName = targetMetadata?.name || targetMetadata?.display_name || 
    (targetArtistPubkey ? genUserName(targetArtistPubkey) : 'Unknown Artist');

  const getActivityText = () => {
    if (release?.title) {
      return `zapped "${release.title}" by ${targetArtistName}`;
    } else {
      return `zapped ${targetArtistName}`;
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
      <Avatar className="w-8 h-8">
        <AvatarImage src={metadata?.picture} alt={displayName} />
        <AvatarFallback className="text-xs">
          {displayName.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm">
            <span className="font-medium text-foreground">{displayName}</span>{' '}
            <span className="text-muted-foreground">{getActivityText()}</span>
          </p>
          <Badge variant="secondary" className="text-xs bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30">
            <Zap className="w-3 h-3 mr-1" />
            {formatAmount(amount)}
          </Badge>
        </div>
        
        <div className="flex items-center space-x-1 text-xs text-muted-foreground">
          <Clock className="w-3 h-3" />
          <span>{formatDistanceToNow(timestamp, { addSuffix: true })}</span>
        </div>
      </div>
    </div>
  );
}

function ActivitySkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-start space-x-3 py-3">
          <Skeleton className="w-8 h-8 rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-12" />
            </div>
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}

interface CommunityRecentActivityProps {
  limit?: number;
  className?: string;
}

export function CommunityRecentActivity({ 
  limit = 20, 
  className
}: CommunityRecentActivityProps) {
  const { data: recentZaps, isLoading, error } = useCommunityRecentZapActivity(limit);

  if (error) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        Failed to load activity
      </p>
    );
  }

  if (isLoading) {
    return <ActivitySkeleton />;
  }

  if (recentZaps && recentZaps.length > 0) {
    return (
      <div className={`space-y-1 ${className}`}>
        {recentZaps.map((activity) => (
          <ActivityItem
            key={activity.id}
            userPubkey={activity.userPubkey}
            amount={activity.amount}
            releaseId={activity.releaseId || undefined}
            targetArtistPubkey={activity.targetArtistPubkey}
            timestamp={activity.timestamp}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="text-center py-8">
      <Clock className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
      <p className="text-sm text-muted-foreground">No recent activity</p>
      <p className="text-xs text-muted-foreground">
        Activity will appear here as people support artists
      </p>
    </div>
  );
}