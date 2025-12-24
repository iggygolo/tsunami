import { formatDistanceToNow } from 'date-fns';
import { Repeat, Heart, MoreHorizontal, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import { ExpandableContent } from './ExpandableContent';
import { RepostCard } from './RepostCard';
import { NoteContent } from '@/components/NoteContent';
import { PostActions } from './PostActions';
import { useAuthor } from '@/hooks/useAuthor';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useDeleteNote } from '@/hooks/useDeleteNote';
import { genUserName } from '@/lib/genUserName';
import { isArtist } from '@/lib/musicConfig';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import type { NostrEvent } from '@nostrify/nostrify';

const PREVIEW_CONTENT_LENGTH = 140; // Shorter limit for preview cards

// Estimate displayed content length (nostr: URIs render as ~10 char mentions)
function estimateDisplayedLength(content: string): number {
  // Replace nostr:npub/note/nevent/nprofile/naddr URIs with approximate displayed length
  return content.replace(/nostr:(npub|note|nevent|nprofile|naddr)[a-z0-9]+/gi, '@@mention@@').length;
}

interface PostCardProps {
  event: NostrEvent;
  isCompact?: boolean;
  previewMode?: boolean;
  className?: string;
}

export function PostCard({ event, isCompact = false, previewMode = false, className }: PostCardProps) {
  const { data: author } = useAuthor(event.pubkey);
  const { user } = useCurrentUser();
  const { mutate: deleteNote, isPending: isDeleting } = useDeleteNote();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Handle reposts with a specialized component
  if (event.kind === 6 || event.kind === 16) {
    return <RepostCard event={event} className={className} />;
  }

  // Check if current user can delete this note (must be the artist and the author)
  const canDelete = user && 
    isArtist(user.pubkey) && 
    event.pubkey === user.pubkey;

  const handleDelete = () => {
    deleteNote(event);
    setShowDeleteDialog(false);
  };

  const metadata = author?.metadata;
  const displayName = metadata?.name || metadata?.display_name || genUserName(event.pubkey);
  const postDate = new Date(event.created_at * 1000);

  const getPostTypeInfo = () => {
    switch (event.kind) {
      case 1:
        return { icon: null, label: null, bgColor: '' };
      case 6:
        return {
          icon: <Repeat className="w-4 h-4 text-violet-500" />,
          label: 'reposted',
          bgColor: 'bg-violet-950/30'
        };
      case 7:
        return {
          icon: <Heart className="w-4 h-4 text-pink-500" />,
          label: 'liked',
          bgColor: 'bg-pink-950/30'
        };
      default:
        return { icon: null, label: null, bgColor: '' };
    }
  };

  const { icon, label, bgColor } = getPostTypeInfo();

  // Check if content should show "Show more" in preview mode (using estimated displayed length)
  const shouldShowMore = previewMode && estimateDisplayedLength(event.content) > PREVIEW_CONTENT_LENGTH;

  // In preview mode, use a flex layout to pin actions at bottom
  if (previewMode) {
    return (
      <Card className={cn('flex flex-col', className, bgColor)}>
        <CardContent className="p-4 flex flex-col flex-1 min-h-0">
          <div className="flex items-start space-x-3 flex-1 min-h-0">
            <Avatar className="w-9 h-9 ring-2 ring-purple-500/20 flex-shrink-0">
              <AvatarImage src={metadata?.picture} alt={displayName} />
              <AvatarFallback className="bg-purple-500/10 text-purple-600 text-sm">
                {displayName.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0 flex flex-col min-h-0">
              <div className="flex items-center space-x-2 mb-2 flex-shrink-0">
                <p className="font-semibold truncate">{displayName}</p>
                <span className="text-sm text-muted-foreground flex-shrink-0">•</span>
                <time className="text-sm text-muted-foreground flex-shrink-0">
                  {formatDistanceToNow(postDate, { addSuffix: true })}
                </time>
              </div>

              {/* Content area - takes remaining space with overflow */}
              <div className="flex-1 min-h-0 overflow-hidden">
                <div className="prose prose-sm max-w-none">
                  <NoteContent event={event} className="text-sm line-clamp-2" />
                </div>
                {shouldShowMore && (
                  <Link 
                    to="/social" 
                    className="text-xs text-primary hover:underline mt-1 inline-block"
                  >
                    Show more
                  </Link>
                )}
              </div>
            </div>
          </div>
          
          {/* Actions pinned at bottom */}
          <div className="flex-shrink-0 pt-2 mt-auto">
            <PostActions event={event} />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(className, bgColor)}>
      <CardContent className="p-4">
        <div className="flex items-start space-x-3">
          <Avatar className="w-9 h-9 ring-2 ring-purple-500/20">
            <AvatarImage src={metadata?.picture} alt={displayName} />
            <AvatarFallback className="bg-purple-500/10 text-purple-600 text-sm">
              {displayName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <p className="font-semibold">{displayName}</p>
                {icon && (
                  <>
                    {icon}
                    <span className="text-sm text-muted-foreground">{label}</span>
                  </>
                )}
                <span className="text-sm text-muted-foreground">•</span>
                <time className="text-sm text-muted-foreground">
                  {formatDistanceToNow(postDate, { addSuffix: true })}
                </time>
              </div>

              {/* Delete menu - only show for artist's own notes */}
              {canDelete && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => setShowDeleteDialog(true)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete note
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            {/* Use ExpandableContent for the post content */}
            <ExpandableContent
              event={event}
              isCompact={isCompact}
            />
          </div>
        </div>
      </CardContent>

      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Note</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this note? This action cannot be undone and will remove the note from the network.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}