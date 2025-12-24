import { useState } from 'react';
import { X, Repeat2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
  DrawerClose,
} from '@/components/ui/drawer';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useToast } from '@/hooks/useToast';
import { encodeMusicTrackAsNaddr, encodeMusicPlaylistAsNaddr } from '@/lib/nip19Utils';
import type { NostrEvent } from '@nostrify/nostrify';
import type { MusicTrackData, MusicPlaylistData } from '@/types/music';

interface RepostDialogProps {
  target: NostrEvent;
  item: MusicTrackData | MusicPlaylistData;
  type: 'track' | 'playlist';
  children?: React.ReactNode;
  className?: string;
}

export function RepostDialog({ target, item, type, children, className }: RepostDialogProps) {
  const [open, setOpen] = useState(false);
  const [comment, setComment] = useState(`Check out this ${type}`);
  const [isPosting, setIsPosting] = useState(false);
  
  const { user } = useCurrentUser();
  const { mutateAsync: publishEvent } = useNostrPublish();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const handleRepost = async () => {
    if (!user) {
      toast({
        title: 'Login required',
        description: 'You need to be logged in to share.',
        variant: 'destructive'
      });
      return;
    }

    setIsPosting(true);
    try {
      // Generate the appropriate naddr link
      let naddr: string;
      let itemTitle: string;
      let itemArtist: string;
      
      if (type === 'track') {
        const track = item as MusicTrackData;
        naddr = encodeMusicTrackAsNaddr(
          track.artistPubkey || target.pubkey, 
          track.identifier
        );
        itemTitle = track.title;
        itemArtist = track.artist;
      } else {
        const playlist = item as MusicPlaylistData;
        naddr = encodeMusicPlaylistAsNaddr(
          playlist.authorPubkey || target.pubkey, 
          playlist.identifier
        );
        itemTitle = playlist.title;
        itemArtist = `${playlist.tracks.length} tracks`;
      }

      // Create the full URL
      const url = `${window.location.origin}/${naddr}`;
      
      // Create the post content with the link
      const postContent = `${comment.trim()}\n\n🎵 ${itemTitle} - ${itemArtist}\n${url}`;

      // Create a regular text post (kind 1) with the link
      await publishEvent({
        kind: 1, // Regular text note
        content: postContent,
        tags: [
          ['r', url], // Reference to the URL
          ['t', 'music'], // Music hashtag
          ...(type === 'track' ? [['t', 'track']] : [['t', 'playlist']]),
        ]
      });

      toast({
        title: 'Shared!',
        description: `Successfully shared this ${type} to your feed.`,
      });
      
      setOpen(false);
      setComment(`Check out this ${type}`); // Reset comment
    } catch (error) {
      console.error('Failed to share:', error);
      toast({
        title: 'Share failed',
        description: 'Failed to share. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsPosting(false);
    }
  };

  const handleCancel = () => {
    setOpen(false);
    setComment(`Check out this ${type}`); // Reset comment
  };

  const title = type === 'track' ? 'Share Track' : 'Share Playlist';
  const subtitle = `Add your message about this ${type}`;

  const content = (
    <div className="space-y-4">
      {/* Comment Input */}
      <div className="space-y-2">
        <Textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder={`Add your message about this ${type}...`}
          className="min-h-[120px] resize-none text-sm bg-background/50 border-2 rounded-2xl"
          maxLength={280}
        />
        <div className="text-xs text-muted-foreground text-right">
          {comment.length}/280
        </div>
      </div>

      {/* Item Preview */}
      <div className="p-4 rounded-2xl border-2 bg-background/30">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted flex-shrink-0">
            {item.imageUrl ? (
              <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                {type === 'track' ? (
                  <Repeat2 className="w-5 h-5 text-muted-foreground" />
                ) : (
                  <Repeat2 className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium truncate">{item.title}</h3>
            <p className="text-sm text-muted-foreground truncate">
              {type === 'track' 
                ? (item as MusicTrackData).artist 
                : `${(item as MusicPlaylistData).tracks.length} tracks`
              }
            </p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 justify-end">
        <Button
          variant="outline"
          onClick={handleCancel}
          disabled={isPosting}
          className="px-6"
        >
          Cancel
        </Button>
        <Button
          onClick={handleRepost}
          disabled={isPosting || !comment.trim()}
          className="px-6"
        >
          {isPosting ? 'Sharing...' : 'Share'}
        </Button>
      </div>
    </div>
  );

  if (!user) {
    return null;
  }

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>
          <div className={`cursor-pointer ${className || ''}`}>
            {children}
          </div>
        </DrawerTrigger>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader className="text-center relative">
            <DrawerClose asChild>
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-4 top-4"
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </Button>
            </DrawerClose>
            <DrawerTitle className="text-lg">{title}</DrawerTitle>
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          </DrawerHeader>
          <div className="px-4 pb-4">
            {content}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <div className={`cursor-pointer ${className || ''}`}>
          {children}
        </div>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-lg">{title}</DialogTitle>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </DialogHeader>
        <div className="mt-4">
          {content}
        </div>
      </DialogContent>
    </Dialog>
  );
}