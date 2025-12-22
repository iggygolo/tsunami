import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { generateRSSFeed, type RSSConfig } from '../rssCore';
import type { PodcastRelease } from '@/types/podcast';
import { COMPREHENSIVE_GENRES } from '../musicMetadata';

describe('Release-Level Genre Association Property Tests', () => {
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

  // Generator for valid genres (including edge cases)
  const genreGenerator = fc.oneof(
    fc.constantFrom(...COMPREHENSIVE_GENRES),
    fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
    fc.constant(null),
    fc.constant(undefined),
    fc.constant(''), // Empty string
    fc.constant('   '), // Whitespace only
  );

  // Generator for mock releases with varying track counts
  const releaseGenerator = fc.record({
    genre: genreGenerator,
    id: fc.string({ minLength: 1, maxLength: 20 }),
    title: fc.string({ minLength: 1, maxLength: 100 }),
    trackCount: fc.integer({ min: 1, max: 5 }),
  }).map(({ genre, id, title, trackCount }) => ({
    id,
    title,
    description: 'Test Description',
    tracks: Array.from({ length: trackCount }, (_, index) => ({
      title: `Track ${index + 1}`,
      audioUrl: `https://example.com/audio${index + 1}.mp3`,
      audioType: 'audio/mpeg',
      duration: 180,
    })),
    publishDate: new Date('2024-01-01'),
    tags: ['test'],
    eventId: 'event-id',
    artistPubkey: 'pubkey',
    identifier: `identifier-${id}`,
    createdAt: new Date('2024-01-01'),
    genre,
  }));

  /**
   * Property 8: Release-Level Genre Association
   * For any release with a genre, the genre should be associated with the release and apply to all tracks within that release
   * Validates: Requirements 2.5
   */
  it('should associate genre at release level for any valid genre', () => {
    fc.assert(fc.property(
      releaseGenerator,
      (release) => {
        const rssXml = generateRSSFeed([release], [], mockConfig);

        // Should always have Music category
        expect(rssXml).toContain('<itunes:category text="Music"');

        if (release.genre && typeof release.genre === 'string' && release.genre.trim().length > 0) {
          // Valid genre should appear at channel level
          const escapedGenre = release.genre
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
          
          expect(rssXml).toContain(`<itunes:category text="${escapedGenre}" />`);
          
          // Genre should be in channel section, not item section
          const channelMatch = rssXml.match(/<channel>[\s\S]*?<item>/);
          if (channelMatch) {
            expect(channelMatch[0]).toContain(`text="${escapedGenre}"`);
          }
          
          // Genre should NOT be in item section
          const itemMatch = rssXml.match(/<item>[\s\S]*?<\/item>/);
          if (itemMatch) {
            expect(itemMatch[0]).not.toContain(`text="${escapedGenre}"`);
          }
        } else {
          // Invalid/empty genres should result in default Music category only
          expect(rssXml).toContain('<itunes:category text="Music" />');
        }

        // Should have exactly one RSS item regardless of track count
        const itemMatches = rssXml.match(/<item>[\s\S]*?<\/item>/g) || [];
        expect(itemMatches).toHaveLength(1);

        // First track should be used for enclosure
        expect(rssXml).toContain('<enclosure url="https://example.com/audio1.mp3"');
      }
    ), { numRuns: 100 });
  });

  /**
   * Property: Genre Deduplication Across Releases
   * For any set of releases, each unique genre should appear exactly once in the RSS
   * Validates: Requirements 2.5
   */
  it('should deduplicate genres across multiple releases', () => {
    fc.assert(fc.property(
      fc.array(releaseGenerator, { minLength: 1, maxLength: 10 }),
      (releases) => {
        const rssXml = generateRSSFeed(releases, [], mockConfig);

        // Collect expected unique genres (filtering like the implementation does)
        const expectedGenres = Array.from(new Set(
          releases
            .map(r => r.genre)
            .filter((genre): genre is string => Boolean(genre && typeof genre === 'string' && genre.trim().length > 0))
        ));

        // Each unique genre should appear exactly once
        expectedGenres.forEach(genre => {
          const escapedGenre = genre
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
          
          const matches = rssXml.match(new RegExp(`text="${escapedGenre.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`, 'g'));
          expect(matches).toHaveLength(1);
        });

        // Should have correct number of RSS items (one per release)
        const itemMatches = rssXml.match(/<item>[\s\S]*?<\/item>/g) || [];
        expect(itemMatches).toHaveLength(releases.length);
      }
    ), { numRuns: 100 });
  });

  /**
   * Property: Genre Filtering and Validation
   * For any genre input, only valid non-empty genres should appear in RSS
   * Validates: Requirements 2.5
   */
  it('should filter out invalid genres consistently', () => {
    fc.assert(fc.property(
      fc.array(
        fc.oneof(
          fc.constantFrom(...COMPREHENSIVE_GENRES.slice(0, 10)), // Valid genres
          fc.constant(null),
          fc.constant(undefined),
          fc.constant(''),
          fc.constant('   '),
          fc.constant('\t\n'),
        ),
        { minLength: 1, maxLength: 5 }
      ),
      (genres) => {
        const releases = genres.map((genre, index) => ({
          id: `release-${index}`,
          title: `Release ${index}`,
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
          identifier: `identifier-${index}`,
          createdAt: new Date('2024-01-01'),
          genre,
        }));

        const rssXml = generateRSSFeed(releases, [], mockConfig);

        // Should not contain any invalid genre representations
        expect(rssXml).not.toContain('text="null"');
        expect(rssXml).not.toContain('text="undefined"');
        expect(rssXml).not.toContain('text=""');
        expect(rssXml).not.toContain('text="   "');
        expect(rssXml).not.toContain('text="\t\n"');

        // Should always have Music category
        expect(rssXml).toContain('<itunes:category text="Music"');

        // Count valid genres
        const validGenres = genres.filter((g): g is string => 
          Boolean(g && typeof g === 'string' && g.trim().length > 0)
        );
        const uniqueValidGenres = Array.from(new Set(validGenres));

        if (uniqueValidGenres.length > 0) {
          // Should have nested structure with subcategories
          expect(rssXml).toContain('<itunes:category text="Music">');
          uniqueValidGenres.forEach(genre => {
            const escapedGenre = genre
              .replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;')
              .replace(/'/g, '&#39;');
            expect(rssXml).toContain(`<itunes:category text="${escapedGenre}" />`);
          });
        } else {
          // Should have simple structure without subcategories
          expect(rssXml).toContain('<itunes:category text="Music" />');
        }
      }
    ), { numRuns: 100 });
  });

  /**
   * Property: Release-to-RSS Item Mapping
   * For any set of releases, each release should map to exactly one RSS item
   * Validates: Requirements 2.5
   */
  it('should map each release to exactly one RSS item regardless of track count', () => {
    fc.assert(fc.property(
      fc.array(
        fc.record({
          genre: fc.oneof(fc.constantFrom(...COMPREHENSIVE_GENRES.slice(0, 5)), fc.constant(null)),
          trackCount: fc.integer({ min: 1, max: 8 }),
          id: fc.string({ minLength: 1, maxLength: 10 }),
        }),
        { minLength: 1, maxLength: 5 }
      ),
      (releaseSpecs) => {
        const releases = releaseSpecs.map(({ genre, trackCount, id }) => ({
          id,
          title: `Release ${id}`,
          description: 'Test Description',
          tracks: Array.from({ length: trackCount }, (_, index) => ({
            title: `Track ${index + 1}`,
            audioUrl: `https://example.com/audio${index + 1}.mp3`,
            audioType: 'audio/mpeg',
            duration: 180,
          })),
          publishDate: new Date('2024-01-01'),
          tags: ['test'],
          eventId: 'event-id',
          artistPubkey: 'pubkey',
          identifier: `identifier-${id}`,
          createdAt: new Date('2024-01-01'),
          genre,
        }));

        const rssXml = generateRSSFeed(releases, [], mockConfig);

        // Should have exactly one RSS item per release
        const itemMatches = rssXml.match(/<item>[\s\S]*?<\/item>/g) || [];
        expect(itemMatches).toHaveLength(releases.length);

        // Each release should be represented by its first track in the RSS item
        releases.forEach((release, index) => {
          const expectedTitle = release.title
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
          
          expect(rssXml).toContain(`<title>${expectedTitle}</title>`);
          expect(rssXml).toContain(`<enclosure url="https://example.com/audio1.mp3"`);
        });

        // Genre should be at channel level, not duplicated per item
        const validGenres = Array.from(new Set(
          releases
            .map(r => r.genre)
            .filter((g): g is string => Boolean(g && typeof g === 'string' && g.trim().length > 0))
        ));

        validGenres.forEach(genre => {
          const escapedGenre = genre
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
          
          // Should appear exactly once at channel level
          const matches = rssXml.match(new RegExp(`text="${escapedGenre.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`, 'g'));
          expect(matches).toHaveLength(1);
        });
      }
    ), { numRuns: 100 });
  });
});