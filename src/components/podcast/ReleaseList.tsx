import { useState } from 'react';
import { Search, SortAsc, SortDesc } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ReleaseCard } from './ReleaseCard';
import { useReleases } from '@/hooks/usePodcastReleases';
import type { PodcastRelease, ReleaseSearchOptions } from '@/types/podcast';

interface ReleaseListProps {
  showSearch?: boolean;
  _showPlayer?: boolean;
  limit?: number;
  className?: string;
  onPlayRelease?: (release: PodcastRelease) => void;
  _autoPlay?: boolean;
}

export function ReleaseList({
  showSearch = true,
  _showPlayer = true,
  limit = 50,
  className,
  onPlayRelease,
  _autoPlay = false
}: ReleaseListProps) {
  const [searchOptions, setSearchOptions] = useState<ReleaseSearchOptions>({
    limit,
    sortBy: 'date',
    sortOrder: 'desc'
  });
  const _currentRelease = useState<PodcastRelease | null>(null);

  const { data: releases, isLoading, error } = useReleases(searchOptions);

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

  const handlePlayRelease = (release: PodcastRelease) => {
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
            </div>
          </div>
        </div>
      )}


      {isLoading ? (
        <div className="space-y-6">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="flex items-start space-x-4">
                  <Skeleton className="w-20 h-20 rounded-lg" />
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center space-x-2">
                      <Skeleton className="h-5 w-20" />
                      <Skeleton className="h-5 w-16" />
                    </div>
                    <Skeleton className="h-6 w-3/4" />
                    <div className="flex items-center space-x-4">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : releases && releases.length > 0 ? (
        <div className="space-y-6">
          {releases.map((release) => (
            <ReleaseCard
              key={release.id}
              release={release}
              onPlayRelease={handlePlayRelease}
            />
          ))}
        </div>
      ) : (
        <div className="col-span-full">
          <Card className="border-dashed">
            <CardContent className="py-12 px-8 text-center">
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
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}