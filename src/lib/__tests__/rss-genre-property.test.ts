import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { generateRSSFeed, type RSSConfig } from '../rssCore';
import type { PodcastRelease } from '@/types/podcast';
import { COMPREHENSIVE_GENRES } from '../musicMetadata';

describe('RSS Genre Property Tests', () => {
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

  /**
   * Property 2: Genre RSS Generation
   * Validates: Requirements 2.2, 2.3, 4.2, 4.3, 4.4
   */
  it('should generate valid iTunes categories for any valid genre', () => {
    fc.assert(fc.property(
      fc.oneof(
        fc.constantFrom(...COMPREHENSIVE_GENRES),
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
        fc.constant(null),
        fc.constant(undefined)
      ),
      (genre) => {
        const releases = [createMockRelease(genre)];
        const rssXml = generateRSSFeed(releases, [], mockConfig);
        
        // Should always contain Music category
        expect(rssXml).toContain('<itunes:category text="Music"');
        
        if (genre && typeof genre === 'string' && genre.trim()) {
          // Should contain the genre as subcategory (properly escaped)
          const escapedGenre = genre
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
          expect(rssXml).toContain(`<itunes:category text="${escapedGenre}" />`);
        }
        
        // Should be valid XML structure
        expect(rssXml).toMatch(/<itunes:category text="Music"[^>]*>/);
      }
    ));
  });

  /**
   * Property 5: Multiple Genre Aggregation
   * Validates: Requirements 2.2, 2.3, 4.3
   */
  it('should correctly aggregate and deduplicate multiple genres', () => {
    fc.assert(fc.property(
      fc.array(
        fc.oneof(
          fc.constantFrom(...COMPREHENSIVE_GENRES.slice(0, 20)), // Use subset for performance
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
          fc.constant(null)
        ),
        { minLength: 1, maxLength: 10 }
      ),
      (genres) => {
        const releases = genres.map((genre, index) => createMockRelease(genre, `id-${index}`));
        const rssXml = generateRSSFeed(releases, [], mockConfig);
        
        // Count unique non-null genres
        const uniqueGenres = Array.from(new Set(
          genres.filter((g): g is string => Boolean(g && typeof g === 'string'))
        ));
        
        // Should contain Music category
        expect(rssXml).toContain('<itunes:category text="Music"');
        
        // Each unique genre should appear exactly once
        uniqueGenres.forEach(genre => {
          const escapedGenre = genre
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
          const matches = rssXml.match(new RegExp(`text="${escapedGenre.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`, 'g'));
          expect(matches).toHaveLength(1);
        });
      }
    ));
  });

  /**
   * Property 6: iTunes Category Format Compliance
   * Validates: Requirements 4.2, 4.4
   */
  it('should maintain iTunes RSS specification compliance', () => {
    fc.assert(fc.property(
      fc.array(
        fc.oneof(
          fc.constantFrom(...COMPREHENSIVE_GENRES.slice(0, 15)),
          fc.constant(null)
        ),
        { minLength: 0, maxLength: 5 }
      ),
      (genres) => {
        const releases = genres.map((genre, index) => createMockRelease(genre, `id-${index}`));
        const rssXml = generateRSSFeed(releases, [], mockConfig);
        
        // Should have proper iTunes namespace
        expect(rssXml).toContain('xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd"');
        
        // Should have proper iTunes category structure
        if (genres.some(g => g && typeof g === 'string')) {
          // With genres: nested structure
          expect(rssXml).toMatch(/<itunes:category text="Music">\s*<itunes:category text="[^"]*" \/>/);
        } else {
          // Without genres: simple structure
          expect(rssXml).toContain('<itunes:category text="Music" />');
        }
        
        // All iTunes categories should be properly closed
        const openTags = (rssXml.match(/<itunes:category[^>]*>/g) || []).length;
        const closeTags = (rssXml.match(/<\/itunes:category>/g) || []).length;
        const selfClosingTags = (rssXml.match(/<itunes:category[^>]*\/>/g) || []).length;
        
        // Should have balanced tags (open tags should equal close tags + self-closing tags)
        expect(openTags).toBe(closeTags + selfClosingTags);
      }
    ));
  });

  /**
   * Property: XML Escaping for Special Characters
   * Validates: Requirements 4.4
   */
  it('should properly escape special characters in genre names', () => {
    fc.assert(fc.property(
      fc.string({ minLength: 1, maxLength: 30 }).filter(s => s.trim().length > 0),
      (genre) => {
        const releases = [createMockRelease(genre)];
        const rssXml = generateRSSFeed(releases, [], mockConfig);
        
        // Should not contain unescaped XML characters in attribute values
        // This regex looks for text="..." attributes that contain unescaped <, >, or & characters
        expect(rssXml).not.toMatch(/text="[^"]*[<>]|text="[^"]*&(?!amp;|lt;|gt;|quot;|#39;)[^"]*"/);
        
        // Should properly escape common characters
        if (genre.includes('&')) {
          expect(rssXml).toContain('&amp;');
        }
        if (genre.includes('<')) {
          expect(rssXml).toContain('&lt;');
        }
        if (genre.includes('>')) {
          expect(rssXml).toContain('&gt;');
        }
        if (genre.includes('"')) {
          expect(rssXml).toContain('&quot;');
        }
        if (genre.includes("'")) {
          expect(rssXml).toContain('&#39;');
        }
      }
    ));
  });
});