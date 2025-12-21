import { useState, useMemo } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { useSeoMeta } from '@unhead/react';
import { Clock, Calendar, ArrowLeft, Headphones, BookOpen, ExternalLink, ChevronDown, ChevronUp, Play } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { NoteContent } from '@/components/NoteContent';
import { ReleaseActions } from './ReleaseActions';
import { CommentsSection } from '@/components/comments/CommentsSection';
import { Layout } from '@/components/Layout';
import { Link, useNavigate } from 'react-router-dom';
import { useNostr } from '@nostrify/react';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import { usePodcastConfig } from '@/hooks/usePodcastConfig';
import { eventToPodcastRelease } from '@/hooks/usePodcastReleases';
import type { PodcastRelease } from '@/types/podcast';
import type { NostrEvent } from '@nostrify/nostrify';

interface AddressableEventParams {
  pubkey: string;
  kind: number;
  identifier: string;
}

interface ReleasePageProps {
  eventId?: string; // For note1/nevent1
  addressableEvent?: AddressableEventParams; // For naddr1
}

export function ReleasePage({ eventId, addressableEvent }: ReleasePageProps) {
  const { nostr } = useNostr();
  const navigate = useNavigate();
  const { playRelease, playTrack, state: playerState } = useAudioPlayer();
  const podcastConfig = usePodcastConfig();
  const [showComments, setShowComments] = useState(true);
  const [isTranscriptOpen, setIsTranscriptOpen] = useState(false);

  // Query for the release event
  const { data: releaseEvent, isLoading } = useQuery<NostrEvent | null>({
    queryKey: ['release', eventId || `${addressableEvent?.pubkey}:${addressableEvent?.kind}:${addressableEvent?.identifier}`],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(5000)]);

      if (eventId) {
        // Query by event ID (for note1/nevent1)
        const events = await nostr.query([{
          ids: [eventId],
          limit: 1
        }], { signal });
        return events[0] || null;
      } else if (addressableEvent) {
        // Query by addressable event coordinates (for naddr1)
        const events = await nostr.query([{
          kinds: [addressableEvent.kind],
          authors: [addressableEvent.pubkey],
          '#d': [addressableEvent.identifier],
          limit: 1
        }], { signal });
        
        // If we found the addressable event, return it
        if (events.length > 0) {
          return events[0];
        }
        
        // Fallback: For legacy releases that don't have 'd' tags,
        // try to find by event ID if the identifier looks like an event ID (64 hex chars)
        if (/^[0-9a-f]{64}$/.test(addressableEvent.identifier)) {
          const legacyEvents = await nostr.query([{
            ids: [addressableEvent.identifier],
            kinds: [addressableEvent.kind],
            authors: [addressableEvent.pubkey],
            limit: 1
          }], { signal });
          return legacyEvents[0] || null;
        }
        
        return null;
      }

      return null;
    },
    staleTime: 60000, // 1 minute
    enabled: !!(eventId || addressableEvent)
  });

  // Convert NostrEvent to PodcastRelease format with tracks - memoized to prevent unnecessary re-renders
  const release: PodcastRelease | null = useMemo(() => {
    if (!releaseEvent) return null;
    return eventToPodcastRelease(releaseEvent);
  }, [releaseEvent]);

  // Fetch transcript content if URL is available
  const { data: transcriptContent, isLoading: isLoadingTranscript } = useQuery<string | null>({
    queryKey: ['transcript', release?.transcriptUrl],
    queryFn: async () => {
      if (!release?.transcriptUrl) return null;

      try {
        const response = await fetch(release.transcriptUrl);
        if (!response.ok) throw new Error('Failed to fetch transcript');
        return await response.text();
      } catch (error) {
        console.error('Error fetching transcript:', error);
        return null;
      }
    },
    enabled: !!release?.transcriptUrl,
    staleTime: 300000, // 5 minutes
  });

  // Update document title when release loads
  useSeoMeta({
    title: release 
      ? `${release.title} | ${podcastConfig.podcast.artistName}`
      : `release | ${podcastConfig.podcast.artistName}`,
  });

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

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto space-y-6">
            <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>

            <Card>
              <CardHeader>
                <div className="flex items-start space-x-4">
                  <Skeleton className="w-32 h-32 rounded-lg" />
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center space-x-2">
                      <Skeleton className="h-6 w-24" />
                      <Skeleton className="h-6 w-16" />
                    </div>
                    <Skeleton className="h-8 w-3/4" />
                    <div className="flex items-center space-x-4">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-4/5" />
                  <Skeleton className="h-4 w-3/5" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </Layout>
    );
  }

  if (!release) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>

            <Card>
              <CardContent className="py-12 text-center">
                <h2 className="text-xl font-semibold mb-2">Release Not Found</h2>
                <p className="text-muted-foreground mb-4">
                  This release doesn't exist or hasn't been published yet.
                </p>
                <Button asChild>
                  <Link to="/releases">Browse All Releases</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Releases
          </Button>

          {/* release Header */}
          <Card>
            <CardHeader>
              <div className="flex flex-col lg:flex-row items-start lg:items-center gap-6">
                {release.imageUrl && (
                  <img
                    src={release.imageUrl}
                    alt={release.title}
                    className="w-32 h-32 lg:w-48 lg:h-48 rounded-lg object-cover flex-shrink-0 shadow-lg"
                  />
                )}

                <div className="flex-1 min-w-0 space-y-4">
                  <CardTitle className="text-2xl lg:text-3xl">
                    {release.title}
                  </CardTitle>

                  <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDistanceToNow(release.publishDate, { addSuffix: true })}</span>
                    </div>
                  </div>

                  {release.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {release.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          #{tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* release Description */}
              {release.description && (
                <div>
                  <p className="text-muted-foreground leading-relaxed">
                    {release.description}
                  </p>
                </div>
              )}

              {/* release Content */}
              {release.content && (
                <div className="prose prose-sm max-w-none">
                  <NoteContent
                    event={releaseEvent!}
                    className="text-sm"
                  />
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pt-4 border-t">
                <div className="flex items-center gap-3">
                  <Button
                    onClick={() => {
                      if (release.tracks && release.tracks.length > 0) {
                        playRelease(release);
                      }
                    }}
                    disabled={!release.tracks || release.tracks.length === 0}
                    className="flex items-center gap-2"
                  >
                    <Headphones className="w-4 h-4" />
                    Listen Now
                  </Button>

                  {!release.tracks || release.tracks.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      No tracks available
                    </p>
                  )}
                </div>

                {/* Social Actions */}
                <ReleaseActions
                  release={release}
                  showComments={showComments}
                  onToggleComments={() => setShowComments(!showComments)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Tracklist Section */}
          {release.tracks && release.tracks.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Tracklist ({release.tracks.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {release.tracks.map((track, index) => {
                    const isCurrentTrack = playerState.currentRelease?.eventId === release.eventId && playerState.currentTrackIndex === index;
                    const isPlaying = isCurrentTrack && playerState.isPlaying;

                    return (
                      <div
                        key={index}
                        onClick={() => playTrack(release, index)}
                        className={`flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors group cursor-pointer ${isCurrentTrack ? 'bg-primary/5 border-primary/20' : ''}`}
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className={`flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full ${isCurrentTrack ? 'bg-primary/10' : 'bg-muted group-hover:bg-primary/10'}`}>
                            {isPlaying ? (
                              <span className="text-primary animate-pulse">▶</span>
                            ) : (
                              <span className={`text-sm font-medium ${isCurrentTrack ? 'text-primary' : 'text-muted-foreground group-hover:text-primary'}`}>
                                {index + 1}
                              </span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium truncate ${isCurrentTrack ? 'text-primary' : ''}`}>
                              {track.title || `Track ${index + 1}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          {track.duration && (
                            <span className="text-xs text-muted-foreground">
                              {formatDuration(track.duration)}
                            </span>
                          )}
                          {track.explicit && (
                            <Badge variant="outline" className="text-xs">
                              Explicit
                            </Badge>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              playTrack(release, index);
                            }}
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Play className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Transcript Section */}
          {release.transcriptUrl && (
            <Card>
              <Collapsible open={isTranscriptOpen} onOpenChange={setIsTranscriptOpen}>
                <CardHeader className="pb-3">
                  <CollapsibleTrigger asChild>
                    <button className="flex items-center justify-between w-full text-left hover:opacity-80 transition-opacity">
                      <CardTitle className="flex items-center gap-2">
                        <BookOpen className="w-5 h-5" />
                        Transcript
                      </CardTitle>
                      {isTranscriptOpen ? (
                        <ChevronUp className="w-5 h-5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-muted-foreground" />
                      )}
                    </button>
                  </CollapsibleTrigger>
                </CardHeader>
                <CollapsibleContent>
                  <CardContent>
                    {isLoadingTranscript ? (
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-3/4" />
                      </div>
                    ) : transcriptContent ? (
                      <div className="prose prose-sm max-w-none">
                        <pre className="whitespace-pre-wrap text-sm bg-muted p-4 rounded-lg overflow-x-auto max-h-[600px] overflow-y-auto">
                          {transcriptContent}
                        </pre>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-muted-foreground mb-4">Failed to load transcript</p>
                        <a
                          href={release.transcriptUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-primary hover:underline"
                        >
                          <ExternalLink className="w-4 h-4" />
                          View Transcript File
                        </a>
                      </div>
                    )}
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          )}


          {/* Comments Section */}
          {showComments && (
            <Card>
              <CardContent className="pt-6">
                {release && releaseEvent ? (
                  <CommentsSection
                    root={releaseEvent}
                    title="Release Discussion"
                    emptyStateMessage="No comments yet"
                    emptyStateSubtitle="Be the first to share your thoughts about this release!"
                    limit={100}
                  />
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>Unable to load comments for this release.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </Layout>
  );
}