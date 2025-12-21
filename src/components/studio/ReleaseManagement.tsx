import { useState } from 'react';
import { format } from 'date-fns';
import {
  Edit,
  Trash2,
  Play,
  Pause,
  MoreHorizontal,
  Eye,
  ExternalLink,
  Calendar,
  Clock,
  Volume2,
  Tags,
  AlertTriangle,
  Plus,
  Share
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { encodeReleaseAsNaddr } from '@/lib/nip19Utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useReleases } from '@/hooks/usePodcastReleases';
import { useDeleteRelease } from '@/hooks/usePublishRelease';
import { useToast } from '@/hooks/useToast';
import { AudioPlayer } from '@/components/podcast/AudioPlayer';
import type { PodcastRelease, ReleaseSearchOptions } from '@/types/podcast';
import { genRSSFeed } from '@/lib/rssGenerator';
import { usePodcastConfig } from '@/hooks/usePodcastConfig';
import { ReleaseEditDialog } from './ReleaseEditDialog';
import { ShareReleaseDialog } from './ShareReleaseDialog';

interface ReleaseManagementProps {
  className?: string;
}

export function ReleaseManagement({ className }: ReleaseManagementProps) {
  const { toast } = useToast();
  const podcastConfig = usePodcastConfig();
  const { mutateAsync: deleteRelease, isPending: isDeleting } = useDeleteRelease();

  const [searchOptions, setSearchOptions] = useState<ReleaseSearchOptions>({
    limit: 50,
    sortBy: 'date',
    sortOrder: 'desc'
  });
  const [releaseToDelete, setReleaseToDelete] = useState<PodcastRelease | null>(null);
  const [releaseToEdit, setReleaseToEdit] = useState<PodcastRelease | null>(null);
  const [releaseToShare, setReleaseToShare] = useState<PodcastRelease | null>(null);
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);

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

  const handleSortOrderToggle = () => {
    setSearchOptions(prev => ({
      ...prev,
      sortOrder: prev.sortOrder === 'desc' ? 'asc' : 'desc'
    }));
  };

  const handleDeleteRelease = async (release: PodcastRelease) => {
    try {
      await deleteRelease(release.eventId);

      // Regenerate RSS feed after deletion
      const updatedReleases = releases?.filter(e => e.id !== release.id) || [];
      await genRSSFeed(updatedReleases, podcastConfig);

      toast({
        title: 'Release deleted',
        description: `"${release.title}" has been deleted and RSS feed updated.`,
      });

      setReleaseToDelete(null);
    } catch (error) {
      toast({
        title: 'Failed to delete release',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    }
  };

  const handlereleaseUpdated = async () => {
    console.log('handlereleaseUpdated called');
    try {
      // Regenerate RSS feed after update
      if (releases) {
        console.log('Regenerating RSS feed...');
        await genRSSFeed(releases, podcastConfig);
        console.log('RSS feed regenerated successfully');
      }
      setReleaseToEdit(null);
      console.log('Release edit dialog should close now');
    } catch (error) {
      console.error('Error in handlereleaseUpdated:', error);
      // Still close the dialog even if RSS generation fails
      setReleaseToEdit(null);
    }
  };

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

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="py-12 px-8 text-center">
          <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-destructive" />
          <h3 className="text-lg font-semibold mb-2">Failed to load releases</h3>
          <p className="text-muted-foreground mb-4">
            {error instanceof Error ? error.message : 'An error occurred while loading releases'}
          </p>
          <Button onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Volume2 className="w-5 h-5" />
              <span>Release Management</span>
              {releases && (
                <Badge variant="secondary">
                  {releases.length} release{releases.length !== 1 ? 's' : ''}
                </Badge>
              )}
            </CardTitle>
            <Button asChild size="sm" className="text-sm">
              <Link to="/publish">
                <Plus className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">New Release</span>
                <span className="sm:hidden">New</span>
              </Link>
            </Button>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mt-4">
            <div className="flex-1">
              <Input
                placeholder="Search releases..."
                onChange={(e) => handleSearch(e.target.value)}
                className="max-w-md"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Select value={searchOptions.sortBy} onValueChange={handleSortChange}>
                <SelectTrigger className="w-40">
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
                size="sm"
                onClick={handleSortOrderToggle}
              >
                {searchOptions.sortOrder === 'desc' ? '↓' : '↑'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="border">
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-4">
                      <Skeleton className="w-20 h-20 rounded-lg" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-6 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                        <Skeleton className="h-4 w-full" />
                      </div>
                      <Skeleton className="w-8 h-8" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : !releases || releases.length === 0 ? (
            <div className="text-center py-12">
              <Volume2 className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">
                {searchOptions.query ? 'No releases found' : 'No releases yet'}
              </h3>
              <p className="text-muted-foreground mb-6">
                {searchOptions.query
                  ? 'Try adjusting your search terms'
                  : 'Start by publishing your first release'
                }
              </p>
              <Button asChild size="sm" className="text-sm">
                <Link to="/publish">
                  <Plus className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Publish First release</span>
                  <span className="sm:hidden">Publish release</span>
                </Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {releases.map((release) => (
                <Card key={release.id} className="border transition-colors hover:bg-muted/50">
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-4">
                      {/* release Artwork */}
                      <div className="w-20 h-20 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                        {release.imageUrl ? (
                          <img
                            src={release.imageUrl}
                            alt={release.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Volume2 className="w-8 h-8 text-muted-foreground" />
                          </div>
                        )}
                      </div>

                      {/* release Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-lg truncate mb-1">
                              {release.title}
                            </h3>
                            <div className="flex items-center space-x-4 text-sm text-muted-foreground mb-2">
                              <span className="flex items-center space-x-1">
                                <Calendar className="w-3 h-3" />
                                <span>{format(release.publishDate, 'MMM d, yyyy')}</span>
                              </span>
                              {release.duration && (
                                <span className="flex items-center space-x-1">
                                  <Clock className="w-3 h-3" />
                                  <span>{formatDuration(release.duration)}</span>
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Actions Dropdown */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => setCurrentlyPlaying(
                                  currentlyPlaying === release.id ? null : release.id
                                )}
                              >
                                {currentlyPlaying === release.id ? (
                                  <Pause className="w-4 h-4 mr-2" />
                                ) : (
                                  <Play className="w-4 h-4 mr-2" />
                                )}
                                {currentlyPlaying === release.id ? 'Hide Player' : 'Play release'}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setReleaseToEdit(release)}>
                                <Edit className="w-4 h-4 mr-2" />
                                Edit release
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link to={`/${encodeReleaseAsNaddr(release.artistPubkey, release.identifier)}`}>
                                  <Eye className="w-4 h-4 mr-2" />
                                  View Public Page
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setReleaseToShare(release)}>
                                <Share className="w-4 h-4 mr-2" />
                                Share release
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  if (release.audioUrl) {
                                    window.open(release.audioUrl, '_blank');
                                  }
                                }}
                                disabled={!release.audioUrl}
                              >
                                <ExternalLink className="w-4 h-4 mr-2" />
                                Open Audio File
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => setReleaseToDelete(release)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete release
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        {/* release Description */}
                        {release.description && (
                          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                            {release.description}
                          </p>
                        )}

                        {/* Tags and Stats */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            {/* Tags */}
                            {release.tags.length > 0 && (
                              <div className="flex items-center space-x-1">
                                <Tags className="w-3 h-3 text-muted-foreground" />
                                <div className="flex flex-wrap gap-1">
                                  {release.tags.slice(0, 3).map((tag) => (
                                    <Badge key={tag} variant="outline" className="text-xs">
                                      {tag}
                                    </Badge>
                                  ))}
                                  {release.tags.length > 3 && (
                                    <Badge variant="outline" className="text-xs">
                                      +{release.tags.length - 3}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Stats */}
                          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                            {release.zapCount && release.zapCount > 0 && (
                              <span className="flex items-center space-x-1">
                                <span className="text-yellow-500">⚡</span>
                                <span>{release.zapCount}</span>
                              </span>
                            )}
                            {release.commentCount && release.commentCount > 0 && (
                              <span className="flex items-center space-x-1">
                                <span>💬</span>
                                <span>{release.commentCount}</span>
                              </span>
                            )}
                            {release.repostCount && release.repostCount > 0 && (
                              <span className="flex items-center space-x-1">
                                <span>🔄</span>
                                <span>{release.repostCount}</span>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Audio Player */}
                        {currentlyPlaying === release.id && (
                          <div className="mt-4 pt-4 border-t">
                            <AudioPlayer release={release} />
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!releaseToDelete}
        onOpenChange={() => setReleaseToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Eelease</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{releaseToDelete?.title}"?
              This action cannot be undone and will also update your RSS feed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => releaseToDelete && handleDeleteRelease(releaseToDelete)}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete release'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit release Dialog */}
      {releaseToEdit && (
        <ReleaseEditDialog
          release={releaseToEdit}
          open={!!releaseToEdit}
          onOpenChange={() => setReleaseToEdit(null)}
          onSuccess={handlereleaseUpdated}
        />
      )}

      {/* Share release Dialog */}
      <ShareReleaseDialog
        release={releaseToShare}
        open={!!releaseToShare}
        onOpenChange={() => setReleaseToShare(null)}
      />
    </div>
  );
}