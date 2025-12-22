import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { generateRSSFeed, releaseToRSSItem, type RSSConfig } from '../rssCore';
import type { PodcastRelease } from '@/types/podcast';

describe('RSS Language Generation Property Tests', () => {
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

  describe('Property 1: Language RSS Generation', () => {
    // Feature: music-metadata-enhancement, Property 1: Language RSS Generation
    it('should generate valid RSS for any valid language code', () => {
      fc.assert(fc.property(
        fc.oneof(
          fc.constant(null),
          fc.constant(undefined),
          fc.stringMatching(/^[a-z]{2}$/) // Valid ISO 639-1 codes
        ),
        (language) => {
          const release: PodcastRelease = {
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
          };

          const rssXml = generateRSSFeed([release], [], mockConfig);
          
          // RSS should be valid XML (basic check)
          expect(rssXml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
          expect(rssXml).toContain('<rss version="2.0"');
          expect(rssXml).toContain('</rss>');
          
          // Language handling should be consistent
          if (language && typeof language === 'string') {
            expect(rssXml).toContain(`<language>${language}</language>`);
          } else {
            expect(rssXml).not.toContain('<language>');
          }
        }
      ), { numRuns: 30 });
    });

    // Feature: music-metadata-enhancement, Property 1: Language RSS Generation
    it('should handle multiple releases with various language combinations', () => {
      fc.assert(fc.property(
        fc.array(
          fc.oneof(
            fc.constant(null),
            fc.constant(undefined),
            fc.constantFrom('en', 'es', 'fr', 'de', 'it', 'pt', 'ja', 'ko')
          ),
          { minLength: 1, maxLength: 5 }
        ),
        (languages) => {
          const releases: PodcastRelease[] = languages.map((language, index) => ({
            id: `test-id-${index}`,
            title: `Test Release ${index}`,
            description: 'Test Description',
            tracks: [{
              title: `Test Track ${index}`,
              audioUrl: `https://example.com/audio${index}.mp3`,
              audioType: 'audio/mpeg',
              duration: 180,
              language: language,
            }],
            publishDate: new Date('2024-01-01'),
            tags: ['test'],
            eventId: `event-id-${index}`,
            artistPubkey: 'pubkey',
            identifier: `identifier-${index}`,
            createdAt: new Date('2024-01-01'),
          }));

          const rssXml = generateRSSFeed(releases, [], mockConfig);
          
          // Should generate valid RSS
          expect(rssXml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
          expect(rssXml).toContain('<channel>');
          expect(rssXml).toContain('</channel>');
          
          // Count language elements should match non-null/undefined languages
          const validLanguages = languages.filter(lang => lang && typeof lang === 'string');
          const languageMatches = rssXml.match(/<language>/g);
          const expectedCount = validLanguages.length;
          
          if (expectedCount > 0) {
            expect(languageMatches).toHaveLength(expectedCount);
          } else {
            expect(languageMatches).toBeNull();
          }
        }
      ), { numRuns: 20 });
    });

    // Feature: music-metadata-enhancement, Property 1: Language RSS Generation
    it('should preserve RSS structure regardless of language metadata', () => {
      fc.assert(fc.property(
        fc.oneof(
          fc.constant(null),
          fc.constantFrom('en', 'es', 'fr', 'de')
        ),
        (language) => {
          const release: PodcastRelease = {
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
          };

          const rssXml = generateRSSFeed([release], [], mockConfig);
          
          // Essential RSS elements should always be present
          expect(rssXml).toContain('<title>');
          expect(rssXml).toContain('<description>');
          expect(rssXml).toContain('<enclosure');
          expect(rssXml).toContain('<guid');
          expect(rssXml).toContain('<pubDate>');
          expect(rssXml).toContain('<podcast:guid>');
          
          // Should have exactly one item
          const itemMatches = rssXml.match(/<item>/g);
          expect(itemMatches).toHaveLength(1);
        }
      ), { numRuns: 15 });
    });

    // Feature: music-metadata-enhancement, Property 1: Language RSS Generation
    it('should properly escape language codes in XML', () => {
      fc.assert(fc.property(
        fc.constantFrom('en', 'es', 'fr', 'de', 'zh', 'ja', 'ko'),
        (language) => {
          const release: PodcastRelease = {
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
          };

          const rssXml = generateRSSFeed([release], [], mockConfig);
          
          // Language should be properly formatted in XML
          expect(rssXml).toContain(`<language>${language}</language>`);
          
          // Should not contain unescaped characters (basic check)
          expect(rssXml).not.toContain('<language><');
          expect(rssXml).not.toContain('></language>');
        }
      ), { numRuns: 10 });
    });
  });
});