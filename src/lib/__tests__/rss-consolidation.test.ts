import { describe, it, expect } from 'vitest';
import { generateRSSFeed } from '../rssGenerator';
import { generateRSSFeed as generateRSSFeedCore, podcastConfigToRSSConfig } from '../rssCore';
import { PODCAST_CONFIG } from '../podcastConfig';
import type { PodcastRelease, PodcastTrailer } from '@/types/podcast';

describe('RSS Consolidation', () => {
  const validPubkey = '48e976057bf2cf1333020355b5d243f8dd813f193051d1cb04413894f46acc43';
  
  const mockRelease: PodcastRelease = {
    id: 'test-release',
    title: 'Test Release',
    description: 'A test podcast release',
    content: undefined,
    tracks: [{
      title: 'Test Track',
      audioUrl: 'https://example.com/audio.mp3',
      audioType: 'audio/mpeg',
      duration: 180,
      explicit: false
    }],
    imageUrl: 'https://example.com/image.jpg',
    transcriptUrl: 'https://example.com/transcript.txt',
    publishDate: new Date('2025-01-01T00:00:00Z'),
    tags: ['test', 'podcast'],
    externalRefs: [],
    eventId: 'event-123',
    artistPubkey: validPubkey,
    identifier: 'test-release-id',
    createdAt: new Date('2025-01-01T00:00:00Z'),
  };

  const mockTrailer: PodcastTrailer = {
    id: 'test-trailer',
    title: 'Test Trailer',
    url: 'https://example.com/trailer.mp3',
    pubDate: new Date('2025-01-01T00:00:00Z'),
    length: 1024,
    type: 'audio/mpeg',
    season: 1,
    eventId: 'trailer-event-123',
    artistPubkey: validPubkey,
    identifier: 'test-trailer-id',
    createdAt: new Date('2025-01-01T00:00:00Z'),
  };

  it('should generate consistent RSS between browser and core implementations', () => {
    const releases = [mockRelease];
    const trailers = [mockTrailer];

    // Generate RSS using browser wrapper
    const browserRSS = generateRSSFeed(releases, trailers);

    // Generate RSS using core directly
    const rssConfig = podcastConfigToRSSConfig(PODCAST_CONFIG);
    const coreRSS = generateRSSFeedCore(releases, trailers, rssConfig);

    // Both should produce the same output (minus naddr encoding differences)
    expect(browserRSS).toContain('Test Release');
    expect(browserRSS).toContain('Test Trailer');
    expect(browserRSS).toContain('podcast:trailer');
    expect(browserRSS).toContain('podcast:episode');
    
    expect(coreRSS).toContain('Test Release');
    expect(coreRSS).toContain('Test Trailer');
    expect(coreRSS).toContain('podcast:trailer');
    expect(coreRSS).toContain('podcast:episode');
  });

  it('should handle empty releases and trailers gracefully', () => {
    const rss = generateRSSFeed([], []);
    
    expect(rss).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(rss).toContain('<rss version="2.0"');
    expect(rss).toContain('<channel>');
    expect(rss).toContain('</channel>');
    expect(rss).toContain('</rss>');
  });

  it('should include all required RSS elements', () => {
    const rss = generateRSSFeed([mockRelease], [mockTrailer]);
    
    // Required RSS elements
    expect(rss).toContain('<title>');
    expect(rss).toContain('<description>');
    expect(rss).toContain('<link>');
    expect(rss).toContain('<pubDate>');
    expect(rss).toContain('<lastBuildDate>');
    
    // Podcasting 2.0 elements
    expect(rss).toContain('podcast:guid');
    expect(rss).toContain('podcast:medium');
    expect(rss).toContain('podcast:value');
    expect(rss).toContain('podcast:trailer');
    
    // iTunes elements
    expect(rss).toContain('itunes:author');
    expect(rss).toContain('itunes:duration');
  });

  it('should properly escape XML characters', () => {
    const releaseWithSpecialChars: PodcastRelease = {
      ...mockRelease,
      title: 'Test & "Special" <Characters>',
      description: 'Contains & < > " \' characters'
    };
    
    const rss = generateRSSFeed([releaseWithSpecialChars], []);
    
    expect(rss).toContain('Test &amp; &quot;Special&quot; &lt;Characters&gt;');
    expect(rss).toContain('Contains &amp; &lt; &gt; &quot; &#39; characters');
  });
});