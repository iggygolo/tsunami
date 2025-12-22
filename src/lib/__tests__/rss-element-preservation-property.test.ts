import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { generateRSSFeed, type RSSConfig } from '../rssCore';
import type { PodcastRelease, PodcastTrailer } from '@/types/podcast';
import { COMPREHENSIVE_GENRES, COMPREHENSIVE_LANGUAGES } from '../musicMetadata';

describe('RSS Element Preservation Property Tests', () => {
  const mockConfig: RSSConfig = {
    artistNpub: 'npub1test',
    podcast: {
      artistName: 'Test Artist',
      description: 'Test Description',
      copyright: 'Test Copyright',
      website: 'https://example.com',
      funding: ['https://example.com/support'],
      value: {
        amount: 100,
        recipients: [{
          name: 'Test Artist',
          type: 'node',
          address: 'test@example.com',
          split: 100,
        }],
      },
      guid: 'test-guid',
      medium: 'music',
      publisher: 'Test Publisher',
    },
    rss: {
      ttl: 60,
    },
  };

  // Generator for valid language codes
  const languageGenerator = fc.oneof(
    fc.constantFrom(...COMPREHENSIVE_LANGUAGES.map(lang => lang.code).filter(Boolean)),
    fc.constant(null),
    fc.constant(undefined)
  );

  // Generator for valid genres
  const genreGenerator = fc.oneof(
    fc.constantFrom(...COMPREHENSIVE_GENRES),
    fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
    fc.constant(null),
    fc.constant(undefined)
  );

  // Generator for mock releases
  const releaseGenerator = fc.record({
    language: languageGenerator,
    genre: genreGenerator,
    id: fc.string({ minLength: 1, maxLength: 20 }),
    title: fc.string({ minLength: 1, maxLength: 100 }),
    description: fc.string({ minLength: 0, maxLength: 500 }),
  }).map(({ language, genre, id, title, description }) => ({
    id,
    title,
    description,
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
    genre: genre,
  }));

  // Generator for mock trailers
  const trailerGenerator = fc.record({
    id: fc.string({ minLength: 1, maxLength: 20 }),
    title: fc.string({ minLength: 1, maxLength: 100 }),
  }).map(({ id, title }) => ({
    id,
    title,
    url: 'https://example.com/trailer.mp3',
    pubDate: new Date('2024-01-01'),
    length: 30,
    type: 'audio/mpeg',
    season: 1,
    eventId: 'trailer-event-id',
    artistPubkey: 'trailer-pubkey',
    identifier: 'trailer-identifier',
    createdAt: new Date('2024-01-01'),
  }));

  /**
   * Property 7: RSS Element Preservation
   * For any RSS generation with new metadata, all existing RSS elements should be preserved while adding the new language and genre metadata
   * Validates: Requirements 4.5
   */
  it('should preserve all essential RSS elements regardless of metadata', () => {
    fc.assert(fc.property(
      fc.array(releaseGenerator, { minLength: 0, maxLength: 5 }),
      fc.array(trailerGenerator, { minLength: 0, maxLength: 3 }),
      (releases, trailers) => {
        const rssXml = generateRSSFeed(releases, trailers, mockConfig);

        // Essential RSS 2.0 structure must always be present
        expect(rssXml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
        expect(rssXml).toContain('<rss version="2.0"');
        expect(rssXml).toContain('<channel>');
        expect(rssXml).toContain('</channel>');
        expect(rssXml).toContain('</rss>');

        // Required channel elements must always be present
        expect(rssXml).toContain('<title>Test Artist</title>');
        expect(rssXml).toContain('<description>Test Description</description>');
        expect(rssXml).toContain('<link>https://example.com</link>');
        expect(rssXml).toContain('<copyright>Test Copyright</copyright>');
        expect(rssXml).toContain('<pubDate>');
        expect(rssXml).toContain('<lastBuildDate>');
        expect(rssXml).toContain('<ttl>60</ttl>');
        expect(rssXml).toContain('<generator>');

        // iTunes namespace and elements must always be present
        expect(rssXml).toContain('xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd"');
        expect(rssXml).toContain('<itunes:author>Test Artist</itunes:author>');
        expect(rssXml).toContain('<itunes:category text="Music"');

        // Podcasting 2.0 namespace and elements must always be present
        expect(rssXml).toContain('xmlns:podcast="https://podcastindex.org/namespace/1.0"');
        expect(rssXml).toContain('<podcast:guid>test-guid</podcast:guid>');
        expect(rssXml).toContain('<podcast:medium>music</podcast:medium>');
        expect(rssXml).toContain('<podcast:publisher>Test Publisher</podcast:publisher>');
        expect(rssXml).toContain('<podcast:funding url="https://example.com/support">');
        expect(rssXml).toContain('<podcast:value type="lightning" method="keysend" suggested="100">');

        // For each release, essential item elements must be present
        releases.forEach((release, index) => {
          // Properly escape the title and description for XML
          const escapedTitle = release.title
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
          const escapedDescription = release.description
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
          
          expect(rssXml).toContain(`<title>${escapedTitle}</title>`);
          expect(rssXml).toContain(`<description>${escapedDescription}</description>`);
          expect(rssXml).toContain('<enclosure url="https://example.com/audio.mp3"');
          expect(rssXml).toContain('<podcast:episode>');
        });

        // For each trailer, trailer elements must be present
        trailers.forEach((trailer) => {
          expect(rssXml).toContain(`<podcast:trailer pubdate=`);
          expect(rssXml).toContain(`url="https://example.com/trailer.mp3"`);
        });
      }
    ), { numRuns: 100 });
  });

  /**
   * Property: XML Structure Validity
   * For any combination of metadata, the generated RSS should maintain valid XML structure
   * Validates: Requirements 4.5
   */
  it('should maintain valid XML structure with any metadata combination', () => {
    fc.assert(fc.property(
      fc.array(releaseGenerator, { minLength: 1, maxLength: 3 }),
      (releases) => {
        const rssXml = generateRSSFeed(releases, [], mockConfig);

        // Should have balanced XML tags
        const openChannelTags = (rssXml.match(/<channel>/g) || []).length;
        const closeChannelTags = (rssXml.match(/<\/channel>/g) || []).length;
        expect(openChannelTags).toBe(closeChannelTags);

        const openItemTags = (rssXml.match(/<item>/g) || []).length;
        const closeItemTags = (rssXml.match(/<\/item>/g) || []).length;
        expect(openItemTags).toBe(closeItemTags);

        // Should have proper RSS root element
        expect(rssXml).toMatch(/^<\?xml[^>]*\?>\s*<rss[^>]*>[\s\S]*<\/rss>\s*$/);

        // Should not have malformed XML entities
        expect(rssXml).not.toMatch(/&(?!amp;|lt;|gt;|quot;|#39;|#x[0-9a-fA-F]+;|#[0-9]+;)[a-zA-Z0-9]*;/);

        // Should have proper namespace declarations
        expect(rssXml).toContain('xmlns:podcast="https://podcastindex.org/namespace/1.0"');
        expect(rssXml).toContain('xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd"');
      }
    ), { numRuns: 100 });
  });

  /**
   * Property: Metadata Addition Without Corruption
   * For any valid metadata, adding language and genre should not corrupt existing elements
   * Validates: Requirements 4.5
   */
  it('should add metadata without corrupting existing elements', () => {
    fc.assert(fc.property(
      releaseGenerator,
      (release) => {
        const releases = [release];
        const rssXml = generateRSSFeed(releases, [], mockConfig);

        // Generate RSS without metadata for comparison
        const releaseWithoutMetadata = { ...release, genre: null, tracks: [{ ...release.tracks[0], language: null }] };
        const baseRssXml = generateRSSFeed([releaseWithoutMetadata], [], mockConfig);

        // Core elements should be identical between versions
        const extractCoreElements = (xml: string) => {
          const corePatterns = [
            /<title>Test Artist<\/title>/,
            /<description>Test Description<\/description>/,
            /<link>https:\/\/example\.com<\/link>/,
            /<copyright>Test Copyright<\/copyright>/,
            /<ttl>60<\/ttl>/,
            /<podcast:guid>test-guid<\/podcast:guid>/,
            /<podcast:medium>music<\/podcast:medium>/,
            /<enclosure url="https:\/\/example\.com\/audio\.mp3"/,
          ];
          return corePatterns.every(pattern => pattern.test(xml));
        };

        expect(extractCoreElements(rssXml)).toBe(true);
        expect(extractCoreElements(baseRssXml)).toBe(true);

        // Enhanced RSS should contain all base elements plus potentially new ones
        if (release.genre && typeof release.genre === 'string' && release.genre.trim()) {
          // Should have genre metadata
          expect(rssXml).toContain('<itunes:category text="Music">');
        }

        if (release.tracks[0].language && typeof release.tracks[0].language === 'string') {
          // Should have language metadata
          expect(rssXml).toContain(`<language>${release.tracks[0].language}</language>`);
        }
      }
    ), { numRuns: 100 });
  });

  /**
   * Property: Element Order Consistency
   * For any metadata, elements should appear in consistent order
   * Validates: Requirements 4.5
   */
  it('should maintain consistent element ordering', () => {
    fc.assert(fc.property(
      fc.array(releaseGenerator, { minLength: 1, maxLength: 3 }),
      (releases) => {
        const rssXml = generateRSSFeed(releases, [], mockConfig);

        // Channel-level elements should appear in expected order
        const channelStart = rssXml.indexOf('<channel>');
        const titleIndex = rssXml.indexOf('<title>Test Artist</title>');
        const descriptionIndex = rssXml.indexOf('<description>Test Description</description>');
        const itunesAuthorIndex = rssXml.indexOf('<itunes:author>');
        const itunesCategoryIndex = rssXml.indexOf('<itunes:category');
        const podcastGuidIndex = rssXml.indexOf('<podcast:guid>');
        const firstItemIndex = rssXml.indexOf('<item>');

        expect(channelStart).toBeLessThan(titleIndex);
        expect(titleIndex).toBeLessThan(descriptionIndex);
        expect(descriptionIndex).toBeLessThan(itunesAuthorIndex);
        expect(itunesAuthorIndex).toBeLessThan(itunesCategoryIndex);
        expect(itunesCategoryIndex).toBeLessThan(podcastGuidIndex);
        expect(podcastGuidIndex).toBeLessThan(firstItemIndex);

        // Item-level elements should appear in expected order for each item
        const itemMatches = rssXml.match(/<item>[\s\S]*?<\/item>/g) || [];
        itemMatches.forEach((itemXml) => {
          const itemTitleIndex = itemXml.indexOf('<title>');
          const itemDescIndex = itemXml.indexOf('<description>');
          const itemLinkIndex = itemXml.indexOf('<link>');
          const itemGuidIndex = itemXml.indexOf('<guid');
          const itemEnclosureIndex = itemXml.indexOf('<enclosure');

          expect(itemTitleIndex).toBeLessThan(itemDescIndex);
          expect(itemDescIndex).toBeLessThan(itemLinkIndex);
          expect(itemLinkIndex).toBeLessThan(itemGuidIndex);
          expect(itemGuidIndex).toBeLessThan(itemEnclosureIndex);
        });
      }
    ), { numRuns: 100 });
  });
});