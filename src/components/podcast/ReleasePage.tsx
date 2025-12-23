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
import { usePodcastRelease } from '@/hooks/usePodcastReleases';
import { 
  validateMusicTrack, 
  validateMusicPlaylist, 
  eventToMusicTrack, 
  eventToMusicPlaylist, 
  playlistToRelease, 
  trackToRelease,
  eventToPodcastRelease
} from '@/lib/eventConversions';
import { usePlaylistTrackResolution } from '@/hooks/usePlaylistTrackResolution';
import { PODCAST_KINDS } from '@/lib/podcastConfig';
import type { PodcastRelease, MusicTrackData, MusicPlaylistData } from '@/types/podcast';
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

  // Determine the release ID for the usePodcastRelease hook
  const releaseId = eventId || addressableEvent?.identifier;

  // Try to use the existing usePodcastRelease hook first
  const { data: hookRelease, isLoading: isLoadingHook, error: hookError } = usePodcastRelease(releaseId || '');

  // If the hook works, use it; otherwise fall back to manual querying
  const shouldUseManualQuery = !hookRelease && !isLoadingHook && releaseId;

  // Manual query for the release event (fallback when usePodcastRelease doesn't work)
  const { data: releaseEvent, isLoading: isLoadingManual } = useQuery<NostrEvent | null>({
    queryKey: ['release-manual', eventId || `${addressableEvent?.pubkey}:${addressableEvent?.kind}:${addressableEvent?.identifier}`],
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
    enabled: !!shouldUseManualQuery
  });

  // Convert NostrEvent to PodcastRelease format with proper track resolution
  const release: PodcastRelease | null = useMemo(() => {
    if (!releaseEvent) return null;

    // Handle new music playlist events (Kind 34139)
    if (releaseEvent.kind === PODCAST_KINDS.MUSIC_PLAYLIST && validateMusicPlaylist(releaseEvent)) {
      // For playlists, we need to resolve tracks separately
      // This will be handled by the track resolution hook below
      return null; // Will be set by the playlist resolution logic
    }

    // Handle new music track events (Kind 36787)
    if (releaseEvent.kind === PODCAST_KINDS.MUSIC_TRACK && validateMusicTrack(releaseEvent)) {
      const track = eventToMusicTrack(releaseEvent);
      return trackToRelease(track);
    }

    // Handle legacy events or other event types - try the old conversion function
    try {
      const legacyRelease = eventToPodcastRelease(releaseEvent);
      return legacyRelease;
    } catch (error) {
      console.error('ReleasePage - Legacy conversion failed:', error);
      return null;
    }
  }, [releaseEvent]);

  // For playlist events, resolve tracks and create release
  const playlistData = useMemo(() => {
    if (!releaseEvent || releaseEvent.kind !== PODCAST_KINDS.MUSIC_PLAYLIST || !validateMusicPlaylist(releaseEvent)) {
      return null;
    }
    return eventToMusicPlaylist(releaseEvent);
  }, [releaseEvent]);

  // Resolve playlist tracks if this is a playlist
  const { data: resolvedTracks, isLoading: isLoadingTracks } = usePlaylistTrackResolution(
    playlistData?.tracks || []
  );

  // Create final release object for playlists
  const playlistRelease: PodcastRelease | null = useMemo(() => {
    if (!playlistData || !resolvedTracks) {
      return null;
    }

    // Create tracks map from resolved tracks
    const tracksMap = new Map<string, MusicTrackData>();
    resolvedTracks.forEach(resolved => {
      if (resolved.trackData) {
        const key = `${resolved.trackData.artistPubkey}:${resolved.trackData.identifier}`;
        tracksMap.set(key, resolved.trackData);
      }
    });

    return playlistToRelease(playlistData, tracksMap);
  }, [playlistData, resolvedTracks]);

  // Create event object for comments (needed for CommentsSection)
  const commentEvent: NostrEvent | null = useMemo(() => {
    if (releaseEvent) {
      return releaseEvent;
    }
    
    // If we're using hookRelease, create a minimal event object for comments
    if (hookRelease && releaseId) {
      return {
        id: hookRelease.eventId,
        pubkey: hookRelease.artistPubkey,
        created_at: Math.floor(hookRelease.createdAt.getTime() / 1000),
        kind: PODCAST_KINDS.MUSIC_PLAYLIST, // Assume playlist for now
        tags: [
          ['d', hookRelease.identifier],
          ['title', hookRelease.title],
          ...(hookRelease.description ? [['description', hookRelease.description]] : []),
          ...(hookRelease.imageUrl ? [['image', hookRelease.imageUrl]] : []),
          ...hookRelease.tags.map(tag => ['t', tag])
        ],
        content: JSON.stringify(hookRelease.tracks || []),
        sig: ''
      };
    }
    
    return null;
  }, [releaseEvent, hookRelease, releaseId]);

  // Final release object (use hook result first, then manual conversion, then playlist conversion)
  const finalRelease = hookRelease || release || playlistRelease;

  // Fetch transcript content if URL is available
  const { data: transcriptContent, isLoading: isLoadingTranscript } = useQuery<string | null>({
    queryKey: ['transcript', finalRelease?.transcriptUrl],
    queryFn: async () => {
      if (!finalRelease?.transcriptUrl) return null;

      try {
        const response = await fetch(finalRelease.transcriptUrl);
        if (!response.ok) throw new Error('Failed to fetch transcript');
        return await response.text();
      } catch (error) {
        console.error('Error fetching transcript:', error);
        return null;
      }
    },
    enabled: !!finalRelease?.transcriptUrl,
    staleTime: 300000, // 5 minutes
  });

  // Update document title when release loads
  useSeoMeta({
    title: finalRelease 
      ? `${finalRelease.title} | ${podcastConfig.podcast.artistName}`
      : `Release | ${podcastConfig.podcast.artistName}`,
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

  if (isLoadingHook || isLoadingManual || isLoadingTracks) {
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

  if (!finalRelease) {
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
          <div className="flex flex-col md:flex-row gap-8 mb-10">
            {finalRelease.imageUrl && (
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-primary via-purple-500 to-pink-500 rounded-2xl blur-lg opacity-30 group-hover:opacity-50 transition-opacity" />
                <img
                  src={finalRelease.imageUrl}
                  alt={finalRelease.title}
                  className="relative w-full md:w-64 h-64 rounded-xl object-cover shadow-2xl flex-shrink-0"
                />
              </div>
            )}

            <div className="flex-1 space-y-4">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2 bg-gradient-to-r from-foreground via-primary to-purple-600 bg-clip-text text-transparent">
                  {finalRelease.title}
                </h1>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span>{formatDistanceToNow(finalRelease.publishDate, { addSuffix: true })}</span>
                </div>
              </div>

              {finalRelease.description && (
                <p className="text-muted-foreground leading-relaxed">
                  {finalRelease.description}
                </p>
              )}

              {finalRelease.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {finalRelease.tags.map((tag, index) => (
                    <span
                      key={tag}
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium transition-all cursor-default ${
                        index % 3 === 0 
                          ? 'bg-primary/10 text-primary hover:bg-primary/20' 
                          : index % 3 === 1 
                            ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 hover:bg-purple-500/20'
                            : 'bg-pink-500/10 text-pink-600 dark:text-pink-400 hover:bg-pink-500/20'
                      }`}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Button
                  size="lg"
                  onClick={() => {
                    if (finalRelease.tracks && finalRelease.tracks.length > 0) {
                      playRelease(finalRelease);
                    }
                  }}
                  disabled={!finalRelease.tracks || finalRelease.tracks.length === 0}
                  className="gap-2 bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 shadow-lg shadow-primary/25"
                >
                  <Headphones className="w-5 h-5" />
                  Listen Now
                </Button>

                <ReleaseActions
                  release={finalRelease}
                  showComments={showComments}
                  onToggleComments={() => setShowComments(!showComments)}
                />
              </div>
            </div>
          </div>

          {/* Tracklist Section */}
          {finalRelease.tracks && finalRelease.tracks.length > 0 && (
            <div className="mb-10">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <span className="bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">Tracklist</span>
                <span className="text-muted-foreground font-normal text-base">({finalRelease.tracks.length})</span>
              </h2>
              <div className="space-y-1 rounded-xl border bg-gradient-to-br from-card to-purple-500/5 overflow-hidden shadow-sm">
                {finalRelease.tracks.map((track, index) => {
                  const isCurrentTrack = playerState.currentRelease?.eventId === finalRelease.eventId && playerState.currentTrackIndex === index;
                  const isPlaying = isCurrentTrack && playerState.isPlaying;

                  return (
                    <div
                      key={index}
                      onClick={() => playTrack(finalRelease, index)}
                      className={`flex items-center justify-between px-4 py-3 hover:bg-gradient-to-r hover:from-primary/5 hover:to-purple-500/5 transition-all cursor-pointer group ${isCurrentTrack ? 'bg-gradient-to-r from-primary/10 to-purple-500/10' : ''} ${index !== 0 ? 'border-t border-border/50' : ''}`}
                    >
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-medium transition-all ${isCurrentTrack ? 'bg-gradient-to-r from-primary to-purple-600 text-primary-foreground shadow-lg shadow-primary/30' : 'bg-muted group-hover:bg-gradient-to-r group-hover:from-primary/20 group-hover:to-purple-500/20 text-muted-foreground group-hover:text-primary'}`}>
                          {isPlaying ? (
                            <span className="animate-pulse">▶</span>
                          ) : (
                            index + 1
                          )}
                        </div>
                        <span className={`font-medium truncate ${isCurrentTrack ? 'bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent' : ''}`}>
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
          {finalRelease.transcriptUrl && (
            <div className="mb-10">
              <Collapsible open={isTranscriptOpen} onOpenChange={setIsTranscriptOpen}>
                <CollapsibleTrigger asChild>
                  <button className="flex items-center justify-between w-full py-3 text-left hover:opacity-80 transition-opacity border-b border-gradient-to-r from-primary/20 to-purple-500/20">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-purple-500" />
                      <span className="bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">Transcript</span>
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
                          href={finalRelease.transcriptUrl}
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
          {showComments && finalRelease && commentEvent && (
            <div>
              <CommentsSection
                root={commentEvent}
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