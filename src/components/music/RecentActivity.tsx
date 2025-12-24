import { MessageCircle, Zap, Share, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthor } from '@/hooks/useAuthor';
import { useRecentZapActivity } from '@/hooks/useZapLeaderboard';
import { usePodcastRelease } from '@/hooks/useReleases';
import { genUserName } from '@/lib/genUserName';

interface ActivityItemProps {
  userPubkey: string;
  type: 'zap' | 'comment' | 'repost';
  amount?: number;
  releaseId?: string;
  timestamp: Date;
}

function ActivityItem({ userPubkey, type, amount, releaseId, timestamp }: ActivityItemProps) {
  const { data: author } = useAuthor(userPubkey);
  const { data: release } = usePodcastRelease(releaseId || '');
  const metadata = author?.metadata;

  const displayName = metadata?.name || metadata?.display_name || genUserName(userPubkey);

  const getActivityIcon = () => {
    switch (type) {
      case 'zap':
        return null; // Icon shown in badge
      case 'comment':
        return <MessageCircle className="w-4 h-4 text-blue-500" />;
      case 'repost':
        return <Share className="w-4 h-4 text-green-500" />;
    }
  };

  const getActivityText = () => {
    const releaseTitle = release?.title ? `"${release.title}"` : '';
    
    switch (type) {
      case 'zap':
        return releaseTitle;
      case 'comment':
        return `commented on ${releaseTitle}`;
      case 'repost':
        return `reposted ${releaseTitle}`;
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
          <div className="flex items-center space-x-2">
            {getActivityIcon()}
            <p className="text-sm">
              <span className="font-medium">{displayName}</span>{' '}
              <span className="text-muted-foreground">{getActivityText()}</span>
            </p>
          </div>
          {type === 'zap' && amount && (
            <Badge variant="secondary" className="text-xs bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-500/30">
              <Zap className="w-3 h-3 mr-1" />
              {formatAmount(amount)}
            </Badge>
          )}
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
            <div className="flex items-center space-x-2">
              <Skeleton className="w-4 h-4" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-12" />
            </div>
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}

interface RecentActivityProps {
  limit?: number;
  className?: string;
  showTitle?: boolean;
}

export function RecentActivity({ 
  limit = 20, 
  className,
  showTitle = true 
}: RecentActivityProps) {
  const { data: recentZaps, isLoading, error } = useRecentZapActivity(limit);

  const content = () => {
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
        <div className="space-y-1">
          {recentZaps.map((activity) => (
            <ActivityItem
              key={activity.id}
              userPubkey={activity.userPubkey}
              type="zap"
              amount={activity.amount}
              releaseId={activity.releaseId || undefined}
              timestamp={activity.timestamp}
            />
          ))}
        </div>
      );
    }

    return (
      <div className="text-center py-8">
        <Clock className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">No recent activity</p>
        <p className="text-xs text-muted-foreground">
          Activity will appear here as people engage with the podcast
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
          <Clock className="w-5 h-5" />
          <span>Recent Activity</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {content()}
      </CardContent>
    </Card>
  );
}