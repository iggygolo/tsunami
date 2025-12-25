import { formatDistanceToNow } from 'date-fns';
import { Play, Pause } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { useUniversalTrackPlayback } from '@/hooks/useUniversalTrackPlayback';
import { useReleasePrefetch } from '@/hooks/useReleasePrefetch';
import { cn } from '@/lib/utils';
import type { MusicRelease } from '@/types/music';

interface ReleaseCardProps {
  release: MusicRelease;
  showPlayer?: boolean;
  showComments?: boolean;
  className?: string;
}

export function ReleaseCard({
  release,
  showPlayer: _showPlayer = false,
  className
}: ReleaseCardProps) {
  const trackPlayback = useUniversalTrackPlayback(release);
  const { prefetchRelease } = useReleasePrefetch();
  const formatDuration = (seconds?: number): string => {
    if (!seconds) return '';

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  // Get first track for explicit badge
  const firstTrack = release.tracks?.[0];
  
  // Calculate total duration from all tracks
  const totalDuration = release.tracks?.reduce((sum, track) => sum + (track.duration || 0), 0) || 0;

  // Generate release URL - prefer explicit route for better SEO
  // Use consistent /releases/:eventId format for all release links
  const releaseId = release.eventId || release.id;
  const releaseUrl = `/releases/${releaseId}`;

  const handleMouseEnter = () => {
    // Prefetch release data when hovering for instant navigation
    prefetchRelease(release);
  };

  return (
    <Card className={cn("overflow-hidden", className)} onMouseEnter={handleMouseEnter}>
      {/* Cover Image - Top */}
      {release.imageUrl && (
        <Link to={releaseUrl} className="block relative group">
          <img
            src={release.imageUrl}
            alt={release.title}
            className="w-full aspect-square object-cover group-hover:opacity-90 transition-opacity"
          />
          {/* Play overlay on hover */}
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
            <div 
              className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-lg cursor-pointer"
              onClick={(e) => {
                e.preventDefault();
                trackPlayback.handleReleasePlay();
              }}
            >
              {trackPlayback.isReleasePlaying ? (
                <Pause className="w-6 h-6 text-black fill-current" />
              ) : (
                <Play className="w-6 h-6 text-black fill-current ml-0.5" />
              )}
            </div>
          </div>
        </Link>
      )}

      <CardContent className="p-3">
        {/* Title & Meta */}
        <Link to={releaseUrl} className="block group" onMouseEnter={handleMouseEnter}>
          <h3 className="font-semibold text-sm leading-tight line-clamp-1 group-hover:text-primary transition-colors">
            {release.title}
          </h3>
        </Link>
        
        <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
          <span>{formatDistanceToNow(release.publishDate, { addSuffix: true })}</span>
          {totalDuration > 0 && (
            <>
              <span>•</span>
              <span>{formatDuration(totalDuration)}</span>
            </>
          )}
          {firstTrack?.explicit && (
            <Badge variant="destructive" className="text-[9px] px-1 py-0 h-3.5">E</Badge>
          )}
        </div>

        {/* Tags */}
        {release.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {release.tags.slice(0, 2).map((tag, index) => (
              <span
                key={tag}
                className={`inline-flex items-center px-1.5 py-0 rounded-full text-[10px] font-medium ${
                  index % 2 === 0 
                    ? 'bg-primary/10 text-primary' 
                    : 'bg-purple-500/10 text-purple-400'
                }`}
              >
                {tag}
              </span>
            ))}
            {release.tags.length > 2 && (
              <span className="inline-flex items-center px-1.5 py-0 rounded-full text-[10px] font-medium bg-muted text-muted-foreground">
                +{release.tags.length - 2}
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}