import { useComments } from '@/hooks/useComments';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { NostrEvent } from '@nostrify/nostrify';
import { CommentForm } from './CommentForm';
import { Comment } from './Comment';

interface CommentsSectionProps {
  root: NostrEvent | URL;
  title?: string;
  emptyStateMessage?: string;
  emptyStateSubtitle?: string;
  className?: string;
  limit?: number;
}

export function CommentsSection({ 
  root,
  title = "Comments",
  emptyStateMessage = "No comments yet",
  emptyStateSubtitle = "Be the first to share your thoughts!",
  className,
  limit = 500,
}: CommentsSectionProps) {
  const { data: commentsData, isLoading, error } = useComments(root, limit);
  const comments = commentsData?.topLevelComments || [];

  if (error) {
    return (
      <Card className="bg-transparent border-white/10 backdrop-blur-sm">
        <CardContent className="px-6 py-8">
          <div className="text-center text-white/70">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/10 flex items-center justify-center">
              <MessageSquare className="h-8 w-8 text-white/40" />
            </div>
            <p className="text-white">Failed to load comments</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("bg-transparent border-white/10 backdrop-blur-sm", className)}>
      <CardHeader className="px-6 pt-6 pb-4">
        <CardTitle className="flex items-center space-x-2 text-white">
          <MessageSquare className="h-5 w-5 text-white/70" />
          <span>{title}</span>
          {!isLoading && (
            <span className="text-sm font-normal text-white/60">
              ({comments.length})
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-6 pb-6 pt-0 space-y-6">
        {/* Comment Form */}
        <CommentForm root={root} />

        {/* Comments List */}
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="bg-white/5 border-white/10">
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <Skeleton className="h-8 w-8 rounded-full bg-white/20" />
                      <div className="space-y-1">
                        <Skeleton className="h-4 w-24 bg-white/20" />
                        <Skeleton className="h-3 w-16 bg-white/20" />
                      </div>
                    </div>
                    <Skeleton className="h-16 w-full bg-white/20" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-12 text-white/70">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/10 flex items-center justify-center">
              <MessageSquare className="h-8 w-8 text-white/40" />
            </div>
            <p className="text-lg font-medium mb-2 text-white">{emptyStateMessage}</p>
            <p className="text-sm text-white/60">{emptyStateSubtitle}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {comments.map((comment) => (
              <Comment
                key={comment.id}
                root={root}
                comment={comment}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}