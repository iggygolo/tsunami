import { useState, useMemo } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { useSeoMeta } from '@unhead/react';
import { Calendar, ArrowLeft, Headphones, BookOpen, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
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

            {/* Loading skeleton matching new layout */}
            <div className="flex flex-col md:flex-row gap-8 mb-8">
              <Skeleton className="w-full md:w-64 h-64 rounded-xl" />
              <div className="flex-1 space-y-4">
                <Skeleton className="h-10 w-3/4" />
                <Skeleton className="h-4 w-32" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-4/5" />
                </div>
                <div className="flex gap-2">
                  <Skeleton className="h-6 w-16 rounded-full" />
                  <Skeleton className="h-6 w-16 rounded-full" />
                </div>
                <Skeleton className="h-10 w-32" />
              </div>
            </div>
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

            <div className="text-center py-16">
              <h2 className="text-2xl font-semibold mb-2">Release Not Found</h2>
              <p className="text-muted-foreground mb-6">
                This release doesn't exist or hasn't been published yet.
              </p>
              <Button asChild>
                <Link to="/releases">Browse All Releases</Link>
              </Button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Releases
          </Button>

          {/* Hero Section */}
          <div className="flex flex-col md:flex-row gap-8 mb-8">
            {release.imageUrl && (
              <img
                src={release.imageUrl}
                alt={release.title}
                className="w-full md:w-64 h-64 rounded-xl object-cover shadow-2xl flex-shrink-0"
              />
            )}

            <div className="flex-1 space-y-4">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">
                  {release.title}
                </h1>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span>{formatDistanceToNow(release.publishDate, { addSuffix: true })}</span>
                </div>
              </div>

              {release.description && (
                <p className="text-muted-foreground leading-relaxed">
                  {release.description}
                </p>
              )}

              {release.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {release.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      #{tag}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Button
                  size="lg"
                  onClick={() => {
                    if (release.tracks && release.tracks.length > 0) {
                      playRelease(release);
                    }
                  }}
                  disabled={!release.tracks || release.tracks.length === 0}
                  className="gap-2"
                >
                  <Headphones className="w-5 h-5" />
                  Listen Now
                </Button>

                <ReleaseActions
                  release={release}
                  showComments={showComments}
                  onToggleComments={() => setShowComments(!showComments)}
                />
              </div>
            </div>
          </div>

          {/* Tracklist Section */}
          {release.tracks && release.tracks.length > 0 && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4">
                Tracklist
                <span className="text-muted-foreground font-normal ml-2">({release.tracks.length})</span>
              </h2>
              <div className="space-y-1 rounded-xl border bg-card overflow-hidden">
                {release.tracks.map((track, index) => {
                  const isCurrentTrack = playerState.currentRelease?.eventId === release.eventId && playerState.currentTrackIndex === index;
                  const isPlaying = isCurrentTrack && playerState.isPlaying;

                  return (
                    <div
                      key={index}
                      onClick={() => playTrack(release, index)}
                      className={`flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors cursor-pointer group ${isCurrentTrack ? 'bg-primary/5' : ''} ${index !== 0 ? 'border-t border-border/50' : ''}`}
                    >
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-medium transition-colors ${isCurrentTrack ? 'bg-primary text-primary-foreground' : 'bg-muted group-hover:bg-primary/10 text-muted-foreground group-hover:text-primary'}`}>
                          {isPlaying ? (
                            <span className="animate-pulse">▶</span>
                          ) : (
                            index + 1
                          )}
                        </div>
                        <span className={`font-medium truncate ${isCurrentTrack ? 'text-primary' : ''}`}>
                          {track.title || `Track ${index + 1}`}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 flex-shrink-0">
                        {track.explicit && (
                          <Badge variant="outline" className="text-xs">E</Badge>
                        )}
                        <span className="text-sm text-muted-foreground tabular-nums">
                          {formatDuration(track.duration)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Transcript Section */}
          {release.transcriptUrl && (
            <div className="mb-8">
              <Collapsible open={isTranscriptOpen} onOpenChange={setIsTranscriptOpen}>
                <CollapsibleTrigger asChild>
                  <button className="flex items-center justify-between w-full py-3 text-left hover:opacity-80 transition-opacity border-b">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                      <BookOpen className="w-5 h-5" />
                      Transcript
                    </h2>
                    {isTranscriptOpen ? (
                      <ChevronUp className="w-5 h-5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-muted-foreground" />
                    )}
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="pt-4">
                    {isLoadingTranscript ? (
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-3/4" />
                      </div>
                    ) : transcriptContent ? (
                      <pre className="whitespace-pre-wrap text-sm bg-muted p-4 rounded-lg overflow-x-auto max-h-[600px] overflow-y-auto">
                        {transcriptContent}
                      </pre>
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
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          )}

          {/* Comments Section */}
          {showComments && release && releaseEvent && (
            <div>
              <CommentsSection
                root={releaseEvent}
                title="Discussion"
                emptyStateMessage="No comments yet"
                emptyStateSubtitle="Be the first to share your thoughts about this release!"
                limit={100}
              />
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}