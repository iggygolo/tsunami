import { describe, it, expect } from 'vitest';
import { generateRSSFeed, releaseToRSSItem, type RSSConfig } from '../rssCore';
import type { PodcastRelease } from '@/types/podcast';

describe('RSS Language Metadata Enhancement', () => {
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

  const createMockRelease = (language?: string | null): PodcastRelease => ({
    id: 'test-id',
    title: 'Test Release',
    description: 'Test Description',
    tracks: [{
      title: 'Test Track',
      audioUrl: 'https://example.com/audio.mp3',
      audioType: 'audio/mpeg',
      duration: 180,
      language: language,
    }],
    publishDate: new Date('2024-01-01'),
    tags: ['test'],
    eventId: 'event-id',
    artistPubkey: 'pubkey',
    identifier: 'identifier',
    createdAt: new Date('2024-01-01'),
  });

  describe('releaseToRSSItem language handling', () => {
    it('should include language when track has language', () => {
      const release = createMockRelease('en');
      const rssItem = releaseToRSSItem(release, mockConfig);
      
      expect(rssItem.language).toBe('en');
    });

    it('should include null language for instrumental tracks', () => {
      const release = createMockRelease(null);
      const rssItem = releaseToRSSItem(release, mockConfig);
      
      expect(rssItem.language).toBeNull();
    });

    it('should handle undefined language', () => {
      const release = createMockRelease(undefined);
      const rssItem = releaseToRSSItem(release, mockConfig);
      
      expect(rssItem.language).toBeUndefined();
    });
  });

  describe('RSS XML generation with language metadata', () => {
    it('should include language element when track has language', () => {
      const releases = [createMockRelease('es')];
      const rssXml = generateRSSFeed(releases, [], mockConfig);
      
      expect(rssXml).toContain('<language>es</language>');
    });

    it('should omit language element when track has no language', () => {
      const releases = [createMockRelease(undefined)];
      const rssXml = generateRSSFeed(releases, [], mockConfig);
      
      expect(rssXml).not.toContain('<language>');
    });

    it('should omit language element for instrumental tracks (null)', () => {
      const releases = [createMockRelease(null)];
      const rssXml = generateRSSFeed(releases, [], mockConfig);
      
      expect(rssXml).not.toContain('<language>');
    });

    it('should handle multiple releases with different languages', () => {
      const releases = [
        createMockRelease('en'),
        createMockRelease('fr'),
        createMockRelease(null), // instrumental
        createMockRelease(undefined), // no language specified
      ];
      const rssXml = generateRSSFeed(releases, [], mockConfig);
      
      expect(rssXml).toContain('<language>en</language>');
      expect(rssXml).toContain('<language>fr</language>');
      // Should only have 2 language elements (not for null or undefined)
      const languageMatches = rssXml.match(/<language>/g);
      expect(languageMatches).toHaveLength(2);
    });

    it('should properly escape language codes', () => {
      // Test with a hypothetical language code that might need escaping
      const release = createMockRelease('zh-CN');
      const rssXml = generateRSSFeed([release], [], mockConfig);
      
      expect(rssXml).toContain('<language>zh-CN</language>');
    });
  });

  describe('RSS structure preservation', () => {
    it('should maintain all existing RSS elements when adding language', () => {
      const releases = [createMockRelease('ja')];
      const rssXml = generateRSSFeed(releases, [], mockConfig);
      
      // Check that all essential RSS elements are still present
      expect(rssXml).toContain('<title>');
      expect(rssXml).toContain('<description>');
      expect(rssXml).toContain('<enclosure');
      expect(rssXml).toContain('<podcast:guid>');
      expect(rssXml).toContain('<language>ja</language>');
    });

    it('should place language element in correct position within item', () => {
      const releases = [createMockRelease('de')];
      const rssXml = generateRSSFeed(releases, [], mockConfig);
      
      // Language should appear after categories and before enclosure
      const itemMatch = rssXml.match(/<item>[\s\S]*?<\/item>/);
      expect(itemMatch).toBeTruthy();
      
      if (itemMatch) {
        const itemContent = itemMatch[0];
        const languageIndex = itemContent.indexOf('<language>de</language>');
        const enclosureIndex = itemContent.indexOf('<enclosure');
        
        expect(languageIndex).toBeGreaterThan(-1);
        expect(languageIndex).toBeLessThan(enclosureIndex);
      }
    });
  });
});