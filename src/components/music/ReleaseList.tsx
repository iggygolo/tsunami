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
  limit?: number;
  className?: string;
  onPlayRelease?: (release: PodcastRelease) => void;
}

export function ReleaseList({
  showSearch = true,
  limit = 50,
  className,
  onPlayRelease
}: ReleaseListProps) {
  const [searchOptions, setSearchOptions] = useState<ReleaseSearchOptions>({
    limit,
    sortBy: 'date',
    sortOrder: 'desc'
  });

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
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <Skeleton className="w-full aspect-square" />
              <CardContent className="p-3">
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-3 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : releases && releases.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
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