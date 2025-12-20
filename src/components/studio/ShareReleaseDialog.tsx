import { useState, useEffect } from 'react';
import { Share, Loader2, Send } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useToast } from '@/hooks/useToast';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { encodeReleaseAsNaddr } from '@/lib/nip19Utils';
import type { PodcastRelease } from '@/types/podcast';

interface ShareReleaseDialogProps {
  release: PodcastRelease | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShareReleaseDialog({ release, open, onOpenChange }: ShareReleaseDialogProps) {
  const { user } = useCurrentUser();
  const { toast } = useToast();
  const { mutateAsync: createEvent, isPending } = useNostrPublish();
  
  // Generate the default share message
  const defaultMessage = release ? 
    `Just published a new release: "${release.title}"\n\n${release.description || ''}\n\n${window.location.origin}/${encodeReleaseAsNaddr(release.authorPubkey, release.identifier)}\n\n#podcast #nostr` 
    : '';
    
  const [shareMessage, setShareMessage] = useState(defaultMessage);

  // Update the message when the release changes
  useEffect(() => {
    if (release) {
      const newMessage = `Just published a new release: "${release.title}"\n\n${release.description || ''}\n\n${window.location.origin}/${encodeReleaseAsNaddr(release.authorPubkey, release.identifier)}\n\n#podcast #nostr`;
      setShareMessage(newMessage);
    }
  }, [release]);

  const handleShare = async () => {
    if (!release || !user) return;

    try {
      // Create a kind 1 note (root post) sharing the release
      await createEvent({
        kind: 1,
        content: shareMessage,
        tags: [
          ['a', `30054:${release.authorPubkey}:${release.identifier}`], // Reference the release as addressable event (non-reply)
          ['t', 'podcast'], // Topic tag
          ['t', 'nostr'], // Topic tag
        ]
      });

      toast({
        title: "release shared!",
        description: "Your post has been published to Nostr.",
      });

      onOpenChange(false);
    } catch (error) {
      console.error('Failed to share release:', error);
      toast({
        title: "Failed to share release",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    }
  };

  if (!release) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Share className="w-5 h-5" />
            <span>Share Release</span>
          </DialogTitle>
          <DialogDescription>
            Share this release with your followers on Nostr.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="share-message">Post Content</Label>
            <Textarea
              id="share-message"
              placeholder="Write something about your release..."
              value={shareMessage}
              onChange={(e) => setShareMessage(e.target.value)}
              rows={8}
              className="mt-2"
            />
            <p className="text-sm text-muted-foreground mt-1">
              Share this release with your followers on Nostr. You can edit the message above.
            </p>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleShare}
              disabled={isPending || !shareMessage.trim() || !user}
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sharing...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Share release
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}