import { 
  Zap, 
  Volume2, 
  MessageSquare, 
  Repeat2, 
  Users 
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useMusicAnalytics } from '@/hooks/useMusicAnalytics';

const Analytics = () => {
  const { data: analytics, isLoading: analyticsLoading } = useMusicAnalytics();

  return (
    <div className="space-y-6">
      {/* Nostr Engagement Analytics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Zap className="w-5 h-5" />
            <span>Nostr Engagement</span>
          </CardTitle>
          <CardDescription>Social interactions from the Nostr network</CardDescription>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6 text-center">
            <Volume2 className="w-12 h-12 mx-auto mb-4 text-primary" />
            <div className="text-2xl font-bold">
              {analyticsLoading ? '...' : analytics?.totalReleases || 0}
            </div>
            <div className="text-sm text-muted-foreground">Releases</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center">
            <Zap className="w-12 h-12 mx-auto mb-4 text-yellow-500" />
            <div className="text-2xl font-bold">
              {analyticsLoading ? '...' : analytics?.totalZaps || 0}
            </div>
            <div className="text-sm text-muted-foreground">Total Zaps</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center">
            <MessageSquare className="w-12 h-12 mx-auto mb-4 text-blue-500" />
            <div className="text-2xl font-bold">
              {analyticsLoading ? '...' : analytics?.totalComments || 0}
            </div>
            <div className="text-sm text-muted-foreground">Comments</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center">
            <Repeat2 className="w-12 h-12 mx-auto mb-4 text-green-500" />
            <div className="text-2xl font-bold">
              {analyticsLoading ? '...' : analytics?.totalReposts || 0}
            </div>
            <div className="text-sm text-muted-foreground">Reposts</div>
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
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            ) : analytics?.topReleases && analytics.topReleases.length > 0 ? (
              <div className="space-y-4">
                {analytics.topReleases.slice(0, 5).map((release, index) => (
                  <div key={release.release.id} className="flex items-center space-x-3 p-3 rounded-lg bg-muted">
                    <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium truncate">
                        {release.release.title}
                      </h4>
                      <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                        <span className="flex items-center">
                          <Zap className="w-3 h-3 mr-1 text-yellow-500" />
                          {release.zaps}
                        </span>
                        <span className="flex items-center">
                          <MessageSquare className="w-3 h-3 mr-1 text-blue-500" />
                          {release.comments}
                        </span>
                        <span className="flex items-center">
                          <Repeat2 className="w-3 h-3 mr-1 text-green-500" />
                          {release.reposts}
                        </span>
                      </div>
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
                    <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                    <div className="flex-1">
                      <div className="h-3 bg-gray-200 rounded w-2/3 mb-1"></div>
                      <div className="h-2 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : analytics?.recentActivity && analytics.recentActivity.length > 0 ? (
              <div className="space-y-4">
                {analytics.recentActivity.slice(0, 8).map((activity, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      activity.type === 'zap' ? 'bg-yellow-100 text-yellow-700' :
                      activity.type === 'comment' ? 'bg-blue-100 text-blue-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {activity.type === 'zap' ? (
                        <Zap className="w-4 h-4" />
                      ) : activity.type === 'comment' ? (
                        <MessageSquare className="w-4 h-4" />
                      ) : (
                        <Repeat2 className="w-4 h-4" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">
                        <span className="font-medium">
                          {activity.type === 'zap' ? 'Zapped' :
                           activity.type === 'comment' ? 'Commented on' :
                           'Reposted'}
                        </span>{' '}
                        <span className="text-muted-foreground truncate">
                          {activity.releaseTitle}
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {activity.timestamp.toLocaleDateString()} at {activity.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
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