import { 
  Zap, 
  Volume2, 
  MessageSquare, 
  Heart, 
  Users 
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useMusicAnalytics } from '@/hooks/useMusicAnalytics';
import { useUsersMetadata } from '@/hooks/useUserMetadata';

const Analytics = () => {
  const { data: analytics, isLoading: analyticsLoading } = useMusicAnalytics();
  
  // Extract unique pubkeys from recent activity for user metadata fetching
  const activityPubkeys = analytics?.recentActivity?.map(activity => activity.authorPubkey) || [];
  const { data: usersMetadata } = useUsersMetadata(activityPubkeys);

  return (
    <div className="space-y-6">
      {/* Standardized Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
          <p className="text-muted-foreground text-sm">
            Social interactions from the Nostr network
          </p>
        </div>
      </div>
      {/* Nostr Engagement Analytics */}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Volume2 className="w-8 h-8 mx-auto mb-2 text-primary" />
            <div className="text-xl font-bold">
              {analyticsLoading ? '...' : analytics?.totalReleases || 0}
            </div>
            <div className="text-xs text-muted-foreground">Releases</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <Zap className="w-8 h-8 mx-auto mb-2 text-yellow-500" />
            <div className="text-xl font-bold">
              {analyticsLoading ? '...' : analytics?.totalZaps || 0}
            </div>
            <div className="text-xs text-muted-foreground">Zaps</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 text-blue-500" />
            <div className="text-xl font-bold">
              {analyticsLoading ? '...' : analytics?.totalComments || 0}
            </div>
            <div className="text-xs text-muted-foreground">Comments</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <Heart className="w-8 h-8 mx-auto mb-2 text-red-500" />
            <div className="text-xl font-bold">
              {analyticsLoading ? '...' : analytics?.totalLikes || 0}
            </div>
            <div className="text-xs text-muted-foreground">Likes</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Releases */}
        <Card>
          <CardHeader>
            <CardTitle>Top Releases by Engagement</CardTitle>
          </CardHeader>
          <CardContent>
            {analyticsLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            ) : analytics?.topReleases && analytics.topReleases.length > 0 ? (
              <div className="space-y-1">
                {analytics.topReleases.slice(0, 5).map((release, index) => (
                  <div key={release.release.id} className="group flex items-center justify-between py-4 px-1 hover:bg-muted/30 rounded-lg transition-colors">
                    {/* Left: Rank and Title */}
                    <div className="flex items-center space-x-4 flex-1 min-w-0">
                      <div className="w-6 h-6 flex items-center justify-center text-sm font-medium text-muted-foreground">
                        {index + 1}
                      </div>
                      <h4 className="text-sm font-medium text-foreground truncate">
                        {release.release.title}
                      </h4>
                    </div>
                    
                    {/* Right: Metrics */}
                    <div className="flex items-center space-x-6 text-xs text-muted-foreground">
                      <span className="flex items-center space-x-1">
                        <Zap className="w-3.5 h-3.5 text-yellow-500" />
                        <span>{release.zaps}</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <MessageSquare className="w-3.5 h-3.5 text-blue-500" />
                        <span>{release.comments}</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <Heart className="w-3.5 h-3.5 text-red-500" />
                        <span>{release.likes}</span>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Volume2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No release engagement data yet.</p>
                <p className="text-sm">Publish releases and engagement will appear here!</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {analyticsLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="animate-pulse flex items-center space-x-3">
                    <div className="w-8 h-8 bg-muted rounded-full"></div>
                    <div className="flex-1">
                      <div className="h-3 bg-muted rounded w-2/3 mb-1"></div>
                      <div className="h-2 bg-muted rounded w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : analytics?.recentActivity && analytics.recentActivity.length > 0 ? (
              <div className="space-y-1">
                {analytics.recentActivity.slice(0, 8).map((activity, index) => {
                  const user = usersMetadata?.get(activity.authorPubkey);
                  
                  return (
                    <div key={index} className="group flex items-center justify-between py-3 px-1 hover:bg-muted/30 rounded-lg transition-colors">
                      {/* Left: Icon, Avatar and Action */}
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        {/* Activity Icon */}
                        <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                          {activity.type === 'zap' ? (
                            <Zap className="w-4 h-4 text-yellow-500" />
                          ) : activity.type === 'comment' ? (
                            <MessageSquare className="w-4 h-4 text-blue-500" />
                          ) : (
                            <Heart className="w-4 h-4 text-red-500" />
                          )}
                        </div>

                        {/* User Avatar */}
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                          {user?.picture ? (
                            <img 
                              src={user.picture} 
                              alt={user.displayName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs font-medium text-muted-foreground">
                              {user?.displayName?.charAt(0)?.toUpperCase() || activity.authorShort.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        
                        {/* Activity Description */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground">
                            <span className="font-medium">{user?.displayName || activity.authorShort}</span>
                            <span className="text-muted-foreground mx-1">
                              {activity.type === 'zap' ? 'zapped' :
                               activity.type === 'comment' ? 'commented on' :
                               'liked'}
                            </span>
                            <span className="truncate">{activity.releaseTitle}</span>
                          </p>
                        </div>
                      </div>
                      
                      {/* Right: Timestamp */}
                      <div className="text-xs text-muted-foreground flex-shrink-0">
                        {activity.timestamp.toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No recent activity yet.</p>
                <p className="text-sm">Listener interactions will appear here!</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Analytics;