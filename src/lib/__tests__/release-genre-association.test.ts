import { describe, it, expect } from 'vitest';
import { generateRSSFeed, type RSSConfig } from '../rssCore';
import type { PodcastRelease } from '@/types/podcast';

describe('Release-Level Genre Association', () => {
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

  const createMockRelease = (
    genre?: string | null,
    id = 'test-id',
    trackCount = 1
  ): PodcastRelease => ({
    id,
    title: 'Test Release',
    description: 'Test Description',
    tracks: Array.from({ length: trackCount }, (_, index) => ({
      title: `Test Track ${index + 1}`,
      audioUrl: `https://example.com/audio${index + 1}.mp3`,
      audioType: 'audio/mpeg',
      duration: 180,
    })),
    publishDate: new Date('2024-01-01'),
    tags: ['test'],
    eventId: 'event-id',
    artistPubkey: 'pubkey',
    identifier: 'identifier',
    createdAt: new Date('2024-01-01'),
    genre,
  });

  describe('Genre association at release level', () => {
    it('should associate genre with the entire release', () => {
      const release = createMockRelease('Rock', 'rock-release', 3);
      const rssXml = generateRSSFeed([release], [], mockConfig);

      // Genre should be associated at channel level (release level)
      expect(rssXml).toContain('<itunes:category text="Music">');
      expect(rssXml).toContain('<itunes:category text="Rock" />');

      // Should not have genre information at individual track level
      const itemMatches = rssXml.match(/<item>[\s\S]*?<\/item>/g) || [];
      expect(itemMatches).toHaveLength(1); // Only one item for the release

      // The item should not contain genre-specific metadata
      // (genre is at channel level, not item level)
      const itemContent = itemMatches[0];
      expect(itemContent).not.toContain('<itunes:category text="Rock"');
    });

    it('should apply genre to all tracks within a release', () => {
      const release = createMockRelease('Jazz', 'jazz-release', 5);
      const rssXml = generateRSSFeed([release], [], mockConfig);

      // Genre should appear once at channel level
      expect(rssXml).toContain('<itunes:category text="Jazz" />');

      // Should have one RSS item representing the release
      const itemMatches = rssXml.match(/<item>[\s\S]*?<\/item>/g) || [];
      expect(itemMatches).toHaveLength(1);

      // The release has 5 tracks, but RSS represents it as one item
      // with the first track's audio as the enclosure
      expect(rssXml).toContain('<enclosure url="https://example.com/audio1.mp3"');
    });

    it('should handle multiple releases with different genres', () => {
      const releases = [
        createMockRelease('Rock', 'rock-release'),
        createMockRelease('Jazz', 'jazz-release'),
        createMockRelease('Electronic', 'electronic-release'),
      ];
      const rssXml = generateRSSFeed(releases, [], mockConfig);

      // All genres should be present at channel level
      expect(rssXml).toContain('<itunes:category text="Music">');
      expect(rssXml).toContain('<itunes:category text="Rock" />');
      expect(rssXml).toContain('<itunes:category text="Jazz" />');
      expect(rssXml).toContain('<itunes:category text="Electronic" />');

      // Should have three RSS items (one per release)
      const itemMatches = rssXml.match(/<item>[\s\S]*?<\/item>/g) || [];
      expect(itemMatches).toHaveLength(3);
    });

    it('should handle releases without genres', () => {
      const releases = [
        createMockRelease('Pop', 'pop-release'),
        createMockRelease(null, 'no-genre-release'),
        createMockRelease(undefined, 'undefined-genre-release'),
      ];
      const rssXml = generateRSSFeed(releases, [], mockConfig);

      // Only the Pop genre should be included
      expect(rssXml).toContain('<itunes:category text="Music">');
      expect(rssXml).toContain('<itunes:category text="Pop" />');
      expect(rssXml).not.toContain('text="null"');
      expect(rssXml).not.toContain('text="undefined"');

      // Should have three RSS items
      const itemMatches = rssXml.match(/<item>[\s\S]*?<\/item>/g) || [];
      expect(itemMatches).toHaveLength(3);
    });

    it('should deduplicate genres across multiple releases', () => {
      const releases = [
        createMockRelease('Hip Hop', 'hiphop-release-1'),
        createMockRelease('Hip Hop', 'hiphop-release-2'),
        createMockRelease('R&B', 'rnb-release'),
        createMockRelease('Hip Hop', 'hiphop-release-3'),
      ];
      const rssXml = generateRSSFeed(releases, [], mockConfig);

      // Hip Hop should appear only once despite multiple releases
      const hipHopMatches = rssXml.match(/text="Hip Hop"/g);
      expect(hipHopMatches).toHaveLength(1);

      // R&B should also appear once
      expect(rssXml).toContain('<itunes:category text="R&amp;B" />');

      // Should have four RSS items
      const itemMatches = rssXml.match(/<item>[\s\S]*?<\/item>/g) || [];
      expect(itemMatches).toHaveLength(4);
    });
  });

  describe('Data flow from release to RSS', () => {
    it('should properly flow genre data from release model to RSS output', () => {
      const release = createMockRelease('Synthwave');
      
      // Verify the release has the genre
      expect(release.genre).toBe('Synthwave');

      // Generate RSS and verify genre appears
      const rssXml = generateRSSFeed([release], [], mockConfig);
      expect(rssXml).toContain('<itunes:category text="Synthwave" />');
    });

    it('should handle special characters in genre names', () => {
      const release = createMockRelease('Drum & Bass');
      const rssXml = generateRSSFeed([release], [], mockConfig);

      // Should properly escape special characters
      expect(rssXml).toContain('<itunes:category text="Drum &amp; Bass" />');
      expect(rssXml).not.toContain('<itunes:category text="Drum & Bass" />');
    });

    it('should handle empty string genres', () => {
      const release = createMockRelease('');
      const rssXml = generateRSSFeed([release], [], mockConfig);

      // Empty string should be filtered out
      expect(rssXml).toContain('<itunes:category text="Music" />');
      expect(rssXml).not.toContain('text=""');
    });

    it('should handle whitespace-only genres', () => {
      const release = createMockRelease('   ');
      const rssXml = generateRSSFeed([release], [], mockConfig);

      // Whitespace-only should be filtered out
      expect(rssXml).toContain('<itunes:category text="Music" />');
      expect(rssXml).not.toContain('text="   "');
    });
  });

  describe('RSS specification compliance', () => {
    it('should place genre categories at channel level per iTunes specification', () => {
      const release = createMockRelease('Classical');
      const rssXml = generateRSSFeed([release], [], mockConfig);

      // Find the channel section
      const channelMatch = rssXml.match(/<channel>[\s\S]*?<item>/);
      expect(channelMatch).toBeTruthy();

      if (channelMatch) {
        const channelContent = channelMatch[0];
        // Genre should be in channel section, not in item section
        expect(channelContent).toContain('<itunes:category text="Classical" />');
      }

      // Find the item section
      const itemMatch = rssXml.match(/<item>[\s\S]*?<\/item>/);
      expect(itemMatch).toBeTruthy();

      if (itemMatch) {
        const itemContent = itemMatch[0];
        // Genre should NOT be in item section
        expect(itemContent).not.toContain('<itunes:category text="Classical"');
      }
    });

    it('should maintain proper iTunes category hierarchy', () => {
      const release = createMockRelease('Ambient');
      const rssXml = generateRSSFeed([release], [], mockConfig);

      // Should have proper nested structure: Music > Ambient
      expect(rssXml).toContain('<itunes:category text="Music">');
      expect(rssXml).toContain('<itunes:category text="Ambient" />');
      expect(rssXml).toContain('</itunes:category>');

      // Verify the nesting is correct
      const musicCategoryStart = rssXml.indexOf('<itunes:category text="Music">');
      const ambientCategory = rssXml.indexOf('<itunes:category text="Ambient" />');
      const musicCategoryEnd = rssXml.indexOf('</itunes:category>');

      expect(musicCategoryStart).toBeLessThan(ambientCategory);
      expect(ambientCategory).toBeLessThan(musicCategoryEnd);
    });
  });
});