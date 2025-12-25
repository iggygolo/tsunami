import { useState } from 'react';
import { Search, SortAsc, SortDesc, Grid, List } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { GlassReleaseCard } from './GlassReleaseCard';
import { useReleases } from '@/hooks/useReleases';
import { useStaticReleaseCache } from '@/hooks/useStaticReleaseCache';
import type { MusicRelease, ReleaseSearchOptions } from '@/types/music';

interface ReleaseListProps {
  showSearch?: boolean;
  limit?: number;
  className?: string;
  onPlayRelease?: (release: MusicRelease) => void;
  useCache?: boolean; // Enable cache usage for better performance
}

export function ReleaseList({
  showSearch = true,
  limit = 50,
  className,
  onPlayRelease,
  useCache = false
}: ReleaseListProps) {
  const [searchOptions, setSearchOptions] = useState<ReleaseSearchOptions>({
    limit,
    sortBy: 'date',
    sortOrder: 'desc'
  });
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Use cache when enabled and no search/filtering is applied
  const shouldUseCache = useCache && !searchOptions.query && searchOptions.sortBy === 'date' && searchOptions.sortOrder === 'desc';
  
  const { data: cachedReleases, isLoading: isCacheLoading } = useStaticReleaseCache();
  const { data: liveReleases, isLoading: isLiveLoading, error } = useReleases(
    shouldUseCache ? { limit: 0 } : searchOptions // Skip live query if using cache
  );

  // Determine final data source
  const releases = shouldUseCache ? cachedReleases?.slice(0, limit) : liveReleases;
  const isLoading = shouldUseCache ? isCacheLoading : isLiveLoading;

  const handleSearch = (query: string) => {
    setSearchOptions(prev => ({ ...prev, query: query || undefined }));
  };

  const handleSortChange = (sortBy: string) => {
    setSearchOptions(prev => ({
      ...prev,
      sortBy: sortBy as ReleaseSearchOptions['sortBy']
    }));
  };

  const handleSortOrderChange = () => {
    setSearchOptions(prev => ({
      ...prev,
      sortOrder: prev.sortOrder === 'desc' ? 'asc' : 'desc'
    }));
  };

  const handlePlayRelease = (release: MusicRelease) => {
    if (onPlayRelease) {
      onPlayRelease(release);
    }
  };

  if (error) {
    return (
      <div className="col-span-full">
        <Card className="border-dashed">
          <CardContent className="py-12 px-8 text-center">
            <div className="max-w-sm mx-auto space-y-6">
              <p className="text-muted-foreground">
                Failed to load releases. Please try refreshing the page.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={className}>
      {showSearch && (
        <div className="mb-6 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search releases..."
                className="pl-10"
                onChange={(e) => handleSearch(e.target.value)}
              />
            </div>

            <div className="flex gap-2">
              <Select value={searchOptions.sortBy} onValueChange={handleSortChange}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">Date</SelectItem>
                  <SelectItem value="title">Title</SelectItem>
                  <SelectItem value="zaps">Zaps</SelectItem>
                  <SelectItem value="comments">Comments</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="icon"
                onClick={handleSortOrderChange}
              >
                {searchOptions.sortOrder === 'desc' ? (
                  <SortDesc className="h-4 w-4" />
                ) : (
                  <SortAsc className="h-4 w-4" />
                )}
              </Button>

              <Button
                variant="outline"
                size="icon"
                onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              >
                {viewMode === 'grid' ? (
                  <List className="h-4 w-4" />
                ) : (
                  <Grid className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className={`grid gap-4 ${
          viewMode === 'grid' 
            ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5' 
            : 'grid-cols-1 md:grid-cols-2'
        }`}>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="rounded-xl bg-card/30 border border-border/50 backdrop-blur-xl overflow-hidden animate-pulse">
              <div className="w-full aspect-square bg-muted" />
              <div className="p-2 space-y-1">
                <div className="h-3 bg-muted rounded w-3/4" />
                <div className="h-2 bg-muted rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : releases && releases.length > 0 ? (
        <div className={`grid gap-4 ${
          viewMode === 'grid' 
            ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5' 
            : 'grid-cols-1 md:grid-cols-2'
        }`}>
          {releases.map((release) => (
            <GlassReleaseCard
              key={release.id}
              release={release}
            />
          ))}
        </div>
      ) : (
        <div className="col-span-full">
          <div className="py-12 px-8 text-center rounded-xl bg-card/30 border border-border/50 backdrop-blur-xl">
            <div className="max-w-sm mx-auto space-y-6">
              <p className="text-muted-foreground">
                {searchOptions.query
                  ? `No releases found for "${searchOptions.query}"`
                  : "No releases published yet"
                }
              </p>
              {!searchOptions.query && (
                <p className="text-sm text-muted-foreground">
                  Releases will appear here once the artist publishes them.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}