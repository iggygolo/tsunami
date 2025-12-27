import { useState } from 'react';
import { Search, SortAsc, SortDesc, Grid, List } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { UnifiedMusicCard } from './UnifiedMusicCard';
import { ArtistFilter } from './ArtistFilter';
import { useReleases } from '@/hooks/useReleases';
import { useLatestReleaseCache, useStaticRecentReleasesCache, useStaticAllReleasesCache } from '@/hooks/useStaticReleaseCache';
import { useRecentReleases } from '@/hooks/useRecentReleases';
import { filterRecentReleases, filterAllReleases } from '@/lib/releaseFiltering';
import type { MusicRelease, ReleaseSearchOptions } from '@/types/music';

interface ReleaseListProps {
  showSearch?: boolean;
  showArtistFilter?: boolean;
  limit?: number;
  className?: string;
  onPlayRelease?: (release: MusicRelease) => void;
  useCache?: boolean; // Enable cache usage for better performance
  excludeLatest?: boolean; // Exclude the latest release to avoid duplication
  cacheType?: 'recent' | 'all'; // Specify which cache to use
}

export function ReleaseList({
  showSearch = true,
  showArtistFilter = true,
  limit = 50,
  className,
  onPlayRelease,
  useCache = false,
  excludeLatest = false,
  cacheType = 'all'
}: ReleaseListProps) {
  const [searchOptions, setSearchOptions] = useState<ReleaseSearchOptions>({
    limit,
    sortBy: 'date',
    sortOrder: 'desc'
  });
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedArtist, setSelectedArtist] = useState<string | undefined>();

  // Use specialized hook for recent releases (homepage) that handles filtering intelligently
  const shouldUseRecentReleasesHook = excludeLatest && useCache;
  
  const { data: recentReleases, isLoading: isRecentLoading } = useRecentReleases({
    limit,
    excludeLatest: true,
    requireImages: true // Now we overfetch enough to handle image filtering
  });

  // Use static recent releases cache for main page
  const { data: staticRecentReleases, isLoading: isStaticRecentLoading } = useStaticRecentReleasesCache();

  // Use static all releases cache for releases page
  const { data: staticAllReleases, isLoading: isStaticAllLoading } = useStaticAllReleasesCache();

  // Use cache when enabled and no search/filtering is applied
  const shouldUseCache = useCache && !searchOptions.query && !selectedArtist && searchOptions.sortBy === 'date' && searchOptions.sortOrder === 'desc';
  
  const { data: latestRelease } = useLatestReleaseCache();
  const { data: liveReleases, isLoading: isLiveLoading, error } = useReleases(
    shouldUseCache ? { limit: 0 } : searchOptions // Skip live query if using cache
  );

  // Determine final data source and apply filtering
  let releases: MusicRelease[] | undefined;
  let isLoading: boolean;

  if (shouldUseRecentReleasesHook && cacheType === 'recent') {
    // Use static recent releases cache for main page (better performance)
    releases = staticRecentReleases?.slice(0, limit);
    isLoading = isStaticRecentLoading;
  } else if (useCache && cacheType === 'all') {
    // Use static all releases cache for releases page
    releases = staticAllReleases?.slice(0, limit);
    isLoading = isStaticAllLoading;
  } else {
    // Use live releases
    releases = liveReleases;
    isLoading = isLiveLoading;
  }

  // Apply additional filtering using shared logic
  if (releases) {
    if (cacheType === 'recent') {
      // For recent releases, apply additional filtering if needed
      releases = filterRecentReleases(releases, {
        excludeLatest: false, // Already handled by cache
        requireImages: false, // Already handled by cache
        limit: releases.length, // Don't re-limit
        selectedArtist,
        latestRelease
      });
    } else {
      // For all releases or live data, apply full filtering
      releases = filterAllReleases(releases, {
        excludeLatest: excludeLatest,
        requireImages: false,
        limit: releases.length, // Don't re-limit here
        selectedArtist,
        latestRelease
      });
    }
  }

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
              {/* Artist Filter */}
              {showArtistFilter && releases && (
                <ArtistFilter
                  releases={releases}
                  selectedArtist={selectedArtist}
                  onArtistChange={setSelectedArtist}
                />
              )}

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
            <UnifiedMusicCard
              key={release.id}
              content={release}
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
                  : selectedArtist
                  ? "No releases found for this artist"
                  : "No releases published yet"
                }
              </p>
              {!searchOptions.query && !selectedArtist && (
                <p className="text-sm text-muted-foreground">
                  Releases will appear here once artists publish them.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}