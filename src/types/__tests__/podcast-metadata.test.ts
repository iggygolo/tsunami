import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { 
  isValidLanguageCode, 
  isValidGenre, 
  type ReleaseTrack,
  type PodcastRelease
} from '../podcast';

describe('Music Metadata Enhancement - Data Model Validation', () => {
  describe('Property 3: Language Code Validation', () => {
    // Feature: music-metadata-enhancement, Property 3: Language Code Validation
    it('should accept valid ISO 639-1 two-letter codes and null values', () => {
      fc.assert(fc.property(
        fc.oneof(
          fc.constant(null),
          fc.stringMatching(/^[a-z]{2}$/)
        ),
        (languageCode) => {
          expect(isValidLanguageCode(languageCode)).toBe(true);
        }
      ), { numRuns: 100 });
    });

    // Feature: music-metadata-enhancement, Property 3: Language Code Validation
    it('should reject invalid language codes', () => {
      fc.assert(fc.property(
        fc.oneof(
          fc.string().filter(s => s !== null && !/^[a-z]{2}$/.test(s)),
          fc.integer(),
          fc.boolean(),
          fc.object(),
          fc.array(fc.anything())
        ),
        (invalidCode) => {
          expect(isValidLanguageCode(invalidCode)).toBe(false);
        }
      ), { numRuns: 100 });
    });

    // Feature: music-metadata-enhancement, Property 3: Language Code Validation
    it('should validate language codes in ReleaseTrack objects', () => {
      const validLanguageGenerator = fc.oneof(
        fc.constant(undefined),
        fc.constant(null),
        fc.constantFrom('en', 'es', 'fr', 'de', 'it', 'pt', 'ja', 'ko', 'zh')
      );

      fc.assert(fc.property(
        fc.record({
          title: fc.string({ minLength: 1 }),
          audioUrl: fc.webUrl(),
          audioType: fc.option(fc.string(), { nil: undefined }),
          duration: fc.option(fc.nat(), { nil: undefined }),
          explicit: fc.option(fc.boolean(), { nil: undefined }),
          language: validLanguageGenerator
        }),
        (track: ReleaseTrack) => {
          expect(isValidLanguageCode(track.language)).toBe(true);
        }
      ), { numRuns: 100 });
    });
  });

  describe('Property 4: Genre Validation', () => {
    // Feature: music-metadata-enhancement, Property 4: Genre Validation
    it('should accept any non-empty string value or null values', () => {
      fc.assert(fc.property(
        fc.oneof(
          fc.constant(null),
          fc.string({ minLength: 1 }).filter(s => s.trim().length > 0)
        ),
        (genre) => {
          expect(isValidGenre(genre)).toBe(true);
        }
      ), { numRuns: 100 });
    });

    // Feature: music-metadata-enhancement, Property 4: Genre Validation
    it('should reject empty strings and invalid types', () => {
      fc.assert(fc.property(
        fc.oneof(
          fc.constant(''),
          fc.string().filter(s => s.trim().length === 0),
          fc.integer(),
          fc.boolean(),
          fc.object(),
          fc.array(fc.anything())
        ),
        (invalidGenre) => {
          expect(isValidGenre(invalidGenre)).toBe(false);
        }
      ), { numRuns: 100 });
    });

    // Feature: music-metadata-enhancement, Property 4: Genre Validation
    it('should validate genres in PodcastRelease objects', () => {
      const validGenreGenerator = fc.oneof(
        fc.constant(undefined),
        fc.constant(null),
        fc.constantFrom(
          'Pop', 'Rock', 'Hip Hop', 'Electronic', 'Jazz', 'Classical',
          'Alternative', 'Indie', 'Punk', 'Metal', 'EDM', 'House', 'Techno'
        )
      );

      const validLanguageGenerator = fc.oneof(
        fc.constant(undefined),
        fc.constant(null),
        fc.constantFrom('en', 'es', 'fr', 'de', 'it')
      );

      fc.assert(fc.property(
        fc.record({
          id: fc.string({ minLength: 1 }),
          title: fc.string({ minLength: 1 }),
          imageUrl: fc.option(fc.webUrl(), { nil: undefined }),
          description: fc.option(fc.string(), { nil: undefined }),
          content: fc.option(fc.string(), { nil: undefined }),
          tracks: fc.array(fc.record({
            title: fc.string({ minLength: 1 }),
            audioUrl: fc.webUrl(),
            audioType: fc.option(fc.string(), { nil: undefined }),
            duration: fc.option(fc.nat(), { nil: undefined }),
            explicit: fc.option(fc.boolean(), { nil: undefined }),
            language: validLanguageGenerator
          }), { minLength: 1 }),
          publishDate: fc.date(),
          tags: fc.array(fc.string()),
          transcriptUrl: fc.option(fc.webUrl(), { nil: undefined }),
          guests: fc.option(fc.array(fc.record({
            name: fc.string({ minLength: 1 }),
            role: fc.option(fc.string(), { nil: undefined }),
            group: fc.option(fc.string(), { nil: undefined }),
            img: fc.option(fc.webUrl(), { nil: undefined }),
            href: fc.option(fc.webUrl(), { nil: undefined }),
            npub: fc.option(fc.string(), { nil: undefined })
          })), { nil: undefined }),
          externalRefs: fc.option(fc.array(fc.record({
            type: fc.constantFrom('podcast:guid', 'podcast:item:guid', 'podcast:publisher:guid', 'apple:id', 'spotify:id'),
            value: fc.string({ minLength: 1 }),
            url: fc.option(fc.webUrl(), { nil: undefined })
          })), { nil: undefined }),
          genre: validGenreGenerator,
          eventId: fc.string({ minLength: 1 }),
          artistPubkey: fc.string({ minLength: 1 }),
          identifier: fc.string({ minLength: 1 }),
          createdAt: fc.date(),
          zapCount: fc.option(fc.nat(), { nil: undefined }),
          totalSats: fc.option(fc.nat(), { nil: undefined }),
          commentCount: fc.option(fc.nat(), { nil: undefined }),
          repostCount: fc.option(fc.nat(), { nil: undefined })
        }),
        (release: PodcastRelease) => {
          expect(isValidGenre(release.genre)).toBe(true);
          // Also validate that all tracks have valid languages
          release.tracks.forEach(track => {
            expect(isValidLanguageCode(track.language)).toBe(true);
          });
        }
      ), { numRuns: 100 });
    });
  });

  describe('Integration Tests', () => {
    it('should handle mixed language and genre metadata correctly', () => {
      const validLanguageGenerator = fc.oneof(
        fc.constant(undefined),
        fc.constant(null),
        fc.constantFrom('en', 'es', 'fr', 'de', 'it', 'pt', 'ja', 'ko', 'zh')
      );

      const validGenreGenerator = fc.oneof(
        fc.constant(undefined),
        fc.constant(null),
        fc.constantFrom(
          'Pop', 'Rock', 'Hip Hop', 'Electronic', 'Jazz', 'Classical',
          'Alternative', 'Indie', 'Punk', 'Metal', 'Folk', 'Country',
          'R&B', 'Blues', 'Reggae', 'World', 'EDM', 'House', 'Techno'
        )
      );

      fc.assert(fc.property(
        fc.record({
          release: fc.record({
            id: fc.string({ minLength: 1 }),
            title: fc.string({ minLength: 1 }),
            tracks: fc.array(fc.record({
              title: fc.string({ minLength: 1 }),
              audioUrl: fc.webUrl(),
              language: validLanguageGenerator
            }), { minLength: 1, maxLength: 10 }),
            publishDate: fc.date(),
            tags: fc.array(fc.string()),
            genre: validGenreGenerator,
            eventId: fc.string({ minLength: 1 }),
            artistPubkey: fc.string({ minLength: 1 }),
            identifier: fc.string({ minLength: 1 }),
            createdAt: fc.date()
          })
        }),
        ({ release }) => {
          // Validate release genre
          expect(isValidGenre(release.genre)).toBe(true);
          
          // Validate all track languages
          release.tracks.forEach(track => {
            expect(isValidLanguageCode(track.language)).toBe(true);
          });

          // Ensure data consistency
          expect(release.tracks.length).toBeGreaterThan(0);
          expect(release.title.length).toBeGreaterThan(0);
          expect(release.id.length).toBeGreaterThan(0);
        }
      ), { numRuns: 100 });
    });
  });
});