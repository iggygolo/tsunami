import { describe, it, expect } from 'vitest';
import { generateRSSFeed, type RSSConfig } from '../rssCore';
import type { PodcastRelease } from '@/types/podcast';
import { validateLanguageCode, validateGenre, getLanguageName } from '../musicMetadata';

describe('Music Metadata Enhancement Integration', () => {
  const mockConfig: RSSConfig = {
    artistNpub: 'npub1test',
    podcast: {
      artistName: 'Test Artist',
      description: 'Test Description',
      copyright: 'Test Copyright',
      website: 'https://example.com',
    },
    rss: {
      ttl: 60,
    },
  };

  const createMockRelease = (
    language?: string | null,
    genre?: string | null,
    id = 'test-id'
  ): PodcastRelease => ({
    id,
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
    genre,
  });

  describe('End-to-end workflow', () => {
    it('should handle complete workflow from data models to RSS generation', () => {
      // Create releases with various language and genre combinations
      const releases = [
        createMockRelease('en', 'Rock', 'english-rock'),
        createMockRelease('es', 'Jazz', 'spanish-jazz'),
        createMockRelease(null, 'Electronic', 'instrumental-electronic'),
        createMockRelease('fr', null, 'french-no-genre'),
        createMockRelease(null, null, 'instrumental-no-genre'),
      ];

      // Generate RSS
      const rssXml = generateRSSFeed(releases, [], mockConfig);

      // Verify RSS structure
      expect(rssXml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(rssXml).toContain('<rss version="2.0"');
      expect(rssXml).toContain('<channel>');
      expect(rssXml).toContain('</channel>');
      expect(rssXml).toContain('</rss>');

      // Verify language metadata
      expect(rssXml).toContain('<language>en</language>');
      expect(rssXml).toContain('<language>es</language>');
      expect(rssXml).toContain('<language>fr</language>');

      // Verify genre metadata
      expect(rssXml).toContain('<itunes:category text="Music">');
      expect(rssXml).toContain('<itunes:category text="Rock" />');
      expect(rssXml).toContain('<itunes:category text="Jazz" />');
      expect(rssXml).toContain('<itunes:category text="Electronic" />');

      // Verify proper item count
      const itemMatches = rssXml.match(/<item>[\s\S]*?<\/item>/g) || [];
      expect(itemMatches).toHaveLength(5);

      // Verify no language elements for instrumental tracks
      const instrumentalItems = itemMatches.filter(item => 
        item.includes('instrumental-electronic') || item.includes('instrumental-no-genre')
      );
      instrumentalItems.forEach(item => {
        expect(item).not.toContain('<language>');
      });
    });

    it('should validate language codes correctly', () => {
      // Valid language codes
      expect(validateLanguageCode('en')).toBe(true);
      expect(validateLanguageCode('es')).toBe(true);
      expect(validateLanguageCode('fr')).toBe(true);
      expect(validateLanguageCode(null)).toBe(true);

      // Invalid language codes
      expect(validateLanguageCode('english')).toBe(false);
      expect(validateLanguageCode('EN')).toBe(false);
      expect(validateLanguageCode('123')).toBe(false);
      expect(validateLanguageCode('')).toBe(false);
    });

    it('should validate genres correctly', () => {
      // Valid genres
      expect(validateGenre('Rock')).toBe(true);
      expect(validateGenre('Hip Hop')).toBe(true);
      expect(validateGenre('R&B')).toBe(true);
      expect(validateGenre(null)).toBe(true);

      // Invalid genres
      expect(validateGenre('')).toBe(false);
      expect(validateGenre('   ')).toBe(false);
      expect(validateGenre('\t\n')).toBe(false);
    });

    it('should get language names correctly', () => {
      expect(getLanguageName('en')).toBe('English');
      expect(getLanguageName('es')).toBe('Spanish');
      expect(getLanguageName('fr')).toBe('French');
      expect(getLanguageName('invalid')).toBe('INVALID'); // Returns uppercase if not found
    });

    it('should handle complex metadata combinations', () => {
      const releases = [
        createMockRelease('zh', 'K-Pop', 'chinese-kpop'),
        createMockRelease('ja', 'J-Pop', 'japanese-jpop'),
        createMockRelease('ko', 'K-Pop', 'korean-kpop'), // Duplicate genre
        createMockRelease('ar', 'World', 'arabic-world'),
      ];

      const rssXml = generateRSSFeed(releases, [], mockConfig);

      // Verify all languages are present
      expect(rssXml).toContain('<language>zh</language>');
      expect(rssXml).toContain('<language>ja</language>');
      expect(rssXml).toContain('<language>ko</language>');
      expect(rssXml).toContain('<language>ar</language>');

      // Verify genres are deduplicated
      expect(rssXml).toContain('<itunes:category text="K-Pop" />');
      expect(rssXml).toContain('<itunes:category text="J-Pop" />');
      expect(rssXml).toContain('<itunes:category text="World" />');

      // K-Pop should appear only once despite two releases
      const kpopMatches = rssXml.match(/text="K-Pop"/g);
      expect(kpopMatches).toHaveLength(1);
    });

    it('should handle special characters in metadata', () => {
      const releases = [
        createMockRelease('en', 'Rock & Roll', 'rock-and-roll'),
        createMockRelease('es', 'Pop/Dance', 'pop-dance'),
        createMockRelease('fr', 'Jazz > Fusion', 'jazz-fusion'),
      ];

      const rssXml = generateRSSFeed(releases, [], mockConfig);

      // Verify proper XML escaping
      expect(rssXml).toContain('<itunes:category text="Rock &amp; Roll" />');
      expect(rssXml).toContain('<itunes:category text="Pop/Dance" />');
      expect(rssXml).toContain('<itunes:category text="Jazz &gt; Fusion" />');

      // Should not contain unescaped characters
      expect(rssXml).not.toContain('text="Rock & Roll"');
      expect(rssXml).not.toContain('text="Jazz > Fusion"');
    });

    it('should maintain backward compatibility', () => {
      // Create releases without enhanced metadata (like existing data)
      const legacyReleases = [
        {
          id: 'legacy-1',
          title: 'Legacy Release 1',
          description: 'Legacy Description',
          tracks: [{
            title: 'Legacy Track',
            audioUrl: 'https://example.com/legacy.mp3',
            audioType: 'audio/mpeg',
            duration: 180,
            // No language field
          }],
          publishDate: new Date('2024-01-01'),
          tags: ['legacy'],
          eventId: 'legacy-event',
          artistPubkey: 'legacy-pubkey',
          identifier: 'legacy-identifier',
          createdAt: new Date('2024-01-01'),
          // No genre field
        } as PodcastRelease,
      ];

      const rssXml = generateRSSFeed(legacyReleases, [], mockConfig);

      // Should generate valid RSS
      expect(rssXml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(rssXml).toContain('<channel>');
      expect(rssXml).toContain('<item>');
      expect(rssXml).toContain('</rss>');

      // Should have default Music category
      expect(rssXml).toContain('<itunes:category text="Music" />');

      // Should not have language elements
      expect(rssXml).not.toContain('<language>');

      // Should have proper item structure
      expect(rssXml).toContain('<title>Legacy Release 1</title>');
      expect(rssXml).toContain('<enclosure url="https://example.com/legacy.mp3"');
    });
  });

  describe('Error handling and edge cases', () => {
    it('should handle empty releases array', () => {
      const rssXml = generateRSSFeed([], [], mockConfig);

      // Should still generate valid RSS structure
      expect(rssXml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(rssXml).toContain('<channel>');
      expect(rssXml).toContain('<itunes:category text="Music" />');
      expect(rssXml).toContain('</channel>');
      expect(rssXml).toContain('</rss>');

      // Should not have any items
      expect(rssXml).not.toContain('<item>');
    });

    it('should handle releases with empty tracks array', () => {
      const releaseWithoutTracks = {
        ...createMockRelease('en', 'Rock'),
        tracks: [],
      };

      const rssXml = generateRSSFeed([releaseWithoutTracks], [], mockConfig);

      // Should still generate RSS but with empty enclosure
      expect(rssXml).toContain('<item>');
      expect(rssXml).toContain('<enclosure url=""');
      expect(rssXml).toContain('<itunes:category text="Rock" />');
    });

    it('should handle malformed metadata gracefully', () => {
      const releases = [
        createMockRelease('INVALID', '!!!', 'malformed'),
        createMockRelease('en', 'Rock', 'valid'),
      ];

      const rssXml = generateRSSFeed(releases, [], mockConfig);

      // Should include all metadata as provided (RSS generation is permissive)
      expect(rssXml).toContain('<language>INVALID</language>');
      expect(rssXml).toContain('<language>en</language>');
      expect(rssXml).toContain('<itunes:category text="Rock" />');
      expect(rssXml).toContain('<itunes:category text="!!!" />'); // Genre allows any string

      // Validation should happen at the UI/input level, not RSS generation level
      // RSS generation should be permissive and include whatever data is provided
    });
  });
});