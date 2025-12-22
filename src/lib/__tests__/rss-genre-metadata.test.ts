import { describe, it, expect } from 'vitest';
import { generateRSSFeed, type RSSConfig } from '../rssCore';
import type { PodcastRelease } from '@/types/podcast';

describe('RSS Genre Metadata Enhancement', () => {
  const mockConfig: RSSConfig = {
    artistNpub: 'npub1test',
    podcast: {
      artistName: 'Test Artist',
      description: 'Test Description',
      copyright: 'Test Copyright',
    },
    rss: {
      ttl: 60,
    },
  };

  const createMockRelease = (genre?: string | null, id = 'test-id'): PodcastRelease => ({
    id,
    title: 'Test Release',
    description: 'Test Description',
    tracks: [{
      title: 'Test Track',
      audioUrl: 'https://example.com/audio.mp3',
      audioType: 'audio/mpeg',
      duration: 180,
    }],
    publishDate: new Date('2024-01-01'),
    tags: ['test'],
    eventId: 'event-id',
    artistPubkey: 'pubkey',
    identifier: 'identifier',
    createdAt: new Date('2024-01-01'),
    genre,
  });

  describe('iTunes category generation', () => {
    it('should include default Music category when no genres', () => {
      const releases = [createMockRelease()];
      const rssXml = generateRSSFeed(releases, [], mockConfig);
      
      expect(rssXml).toContain('<itunes:category text="Music" />');
    });

    it('should include genre as subcategory under Music', () => {
      const releases = [createMockRelease('Rock')];
      const rssXml = generateRSSFeed(releases, [], mockConfig);
      
      expect(rssXml).toContain('<itunes:category text="Music">');
      expect(rssXml).toContain('<itunes:category text="Rock" />');
    });

    it('should handle multiple unique genres', () => {
      const releases = [
        createMockRelease('Rock', 'id1'),
        createMockRelease('Jazz', 'id2'),
        createMockRelease('Electronic', 'id3'),
      ];
      const rssXml = generateRSSFeed(releases, [], mockConfig);
      
      expect(rssXml).toContain('<itunes:category text="Music">');
      expect(rssXml).toContain('<itunes:category text="Rock" />');
      expect(rssXml).toContain('<itunes:category text="Jazz" />');
      expect(rssXml).toContain('<itunes:category text="Electronic" />');
    });

    it('should deduplicate identical genres', () => {
      const releases = [
        createMockRelease('Rock', 'id1'),
        createMockRelease('Rock', 'id2'),
        createMockRelease('Jazz', 'id3'),
      ];
      const rssXml = generateRSSFeed(releases, [], mockConfig);
      
      // Should only have one Rock category
      const rockMatches = rssXml.match(/text="Rock"/g);
      expect(rockMatches).toHaveLength(1);
      
      expect(rssXml).toContain('<itunes:category text="Jazz" />');
    });

    it('should ignore null and undefined genres', () => {
      const releases = [
        createMockRelease('Rock', 'id1'),
        createMockRelease(null, 'id2'),
        createMockRelease(undefined, 'id3'),
      ];
      const rssXml = generateRSSFeed(releases, [], mockConfig);
      
      expect(rssXml).toContain('<itunes:category text="Rock" />');
      expect(rssXml).not.toContain('text="null"');
      expect(rssXml).not.toContain('text="undefined"');
    });

    it('should properly escape genre names', () => {
      const releases = [createMockRelease('R&B')];
      const rssXml = generateRSSFeed(releases, [], mockConfig);
      
      expect(rssXml).toContain('<itunes:category text="R&amp;B" />');
    });
  });

  describe('RSS structure preservation', () => {
    it('should maintain all existing RSS elements when adding genres', () => {
      const releases = [createMockRelease('Hip Hop')];
      const rssXml = generateRSSFeed(releases, [], mockConfig);
      
      // Check that all essential RSS elements are still present
      expect(rssXml).toContain('<title>');
      expect(rssXml).toContain('<description>');
      expect(rssXml).toContain('<enclosure');
      expect(rssXml).toContain('<podcast:guid>');
      expect(rssXml).toContain('<itunes:category text="Music">');
      expect(rssXml).toContain('<itunes:category text="Hip Hop" />');
    });

    it('should place iTunes category in correct position', () => {
      const releases = [createMockRelease('Classical')];
      const rssXml = generateRSSFeed(releases, [], mockConfig);
      
      // iTunes category should appear after iTunes author
      const authorIndex = rssXml.indexOf('<itunes:author>');
      const categoryIndex = rssXml.indexOf('<itunes:category');
      
      expect(authorIndex).toBeGreaterThan(-1);
      expect(categoryIndex).toBeGreaterThan(authorIndex);
    });
  });
});