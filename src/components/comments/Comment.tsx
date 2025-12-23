import { useState } from 'react';
import { Link } from 'react-router-dom';
import { NostrEvent } from '@nostrify/nostrify';
import { nip19 } from 'nostr-tools';
import { useAuthor } from '@/hooks/useAuthor';
import { useComments } from '@/hooks/useComments';
import { CommentForm } from './CommentForm';
import { NoteContent } from '@/components/NoteContent';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { DropdownMenu, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MessageSquare, ChevronDown, ChevronRight, MoreHorizontal } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { genUserName } from '@/lib/genUserName';

interface CommentProps {
  root: NostrEvent | URL;
  comment: NostrEvent;
  depth?: number;
  maxDepth?: number;
  limit?: number;
}

export function Comment({ root, comment, depth = 0, maxDepth = 3, limit }: CommentProps) {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [showReplies, setShowReplies] = useState(depth < 2); // Auto-expand first 2 levels
  
  // Check if this is an optimistic comment
  const isOptimistic = comment.id.startsWith('optimistic-');
  
  const author = useAuthor(comment.pubkey);
  const { data: commentsData } = useComments(root, limit);
  
  const metadata = author.data?.metadata;
  const displayName = metadata?.name ?? genUserName(comment.pubkey)
  const timeAgo = formatDistanceToNow(new Date(comment.created_at * 1000), { addSuffix: true });

  // Get direct replies to this comment
  const replies = commentsData?.getDirectReplies(comment.id) || [];
  const hasReplies = replies.length > 0;

  return (
    <div className={`space-y-3 ${depth > 0 ? 'ml-6 border-l-2 border-white/20 pl-4' : ''}`}>
      <Card className={`bg-white/5 border-white/10 hover:bg-white/10 transition-all duration-200 ${isOptimistic ? 'opacity-70 border-dashed border-white/20' : ''}`}>
        <CardContent className="p-4">
          <div className="space-y-3">
            {/* Comment Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <Link to={`/${nip19.npubEncode(comment.pubkey)}`}>
                  <Avatar className="h-9 w-9 hover:ring-2 hover:ring-white/30 transition-all cursor-pointer">
                    <AvatarImage src={metadata?.picture} />
                    <AvatarFallback className="text-xs bg-white/20 text-white">
                      {displayName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                </Link>
                <div>
                  <Link 
                    to={`/${nip19.npubEncode(comment.pubkey)}`}
                    className="font-medium text-sm text-white hover:text-white/80 transition-colors"
                  >
                    {displayName}
                  </Link>
                  <p className="text-xs text-white/60">
                    {isOptimistic ? 'Posting...' : timeAgo}
                  </p>
                </div>
              </div>
            </div>

            {/* Comment Content */}
            <div className="text-sm overflow-hidden text-white/90">
              <NoteContent event={comment} className="text-sm" />
            </div>

            {/* Comment Actions */}
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowReplyForm(!showReplyForm)}
                  className="h-8 px-3 text-xs text-white/60 hover:text-white hover:bg-white/10"
                >
                  <MessageSquare className="h-3 w-3 mr-1" />
                  Reply
                </Button>
                
                {hasReplies && (
                  <Collapsible open={showReplies} onOpenChange={setShowReplies}>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 px-3 text-xs text-white/60 hover:text-white hover:bg-white/10">
                        {showReplies ? (
                          <ChevronDown className="h-3 w-3 mr-1" />
                        ) : (
                          <ChevronRight className="h-3 w-3 mr-1" />
                        )}
                        {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
                      </Button>
                    </CollapsibleTrigger>
                  </Collapsible>
                )}
              </div>

              {/* Comment menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-xs text-white/60 hover:text-white hover:bg-white/10"
                    aria-label="Comment options"
                  >
                    <MoreHorizontal className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
              </DropdownMenu>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reply Form */}
      {showReplyForm && (
        <div className="ml-6">
          <CommentForm
            root={root}
            reply={comment}
            onSuccess={() => setShowReplyForm(false)}
            placeholder="Write a reply..."
            compact
          />
        </div>
      )}

      {/* Replies */}
      {hasReplies && (
        <Collapsible open={showReplies} onOpenChange={setShowReplies}>
          <CollapsibleContent className="space-y-3">
            {replies.map((reply) => (
              <Comment
                key={reply.id}
                root={root}
                comment={reply}
                depth={depth + 1}
                maxDepth={maxDepth}
                limit={limit}
              />
            ))}
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}