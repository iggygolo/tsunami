import { describe, it, expect } from 'vitest';
import { generateRSSFeed, type RSSConfig } from '../rssCore';
import type { PodcastRelease, PodcastTrailer } from '@/types/podcast';

describe('RSS Element Preservation and Validation', () => {
  const mockConfig: RSSConfig = {
    artistNpub: 'npub1test',
    podcast: {
      artistName: 'Test Artist',
      description: 'Test Description',
      copyright: 'Test Copyright',
      website: 'https://example.com',
      image: 'https://example.com/image.jpg',
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
      location: {
        name: 'Test Location',
        geo: 'geo:40.7589,-73.9851',
        osm: 'R175905',
      },
      person: [{
        name: 'Test Person',
        role: 'host',
        group: 'cast',
        img: 'https://example.com/person.jpg',
        href: 'https://example.com/person',
      }],
      license: {
        identifier: 'CC-BY-4.0',
        url: 'https://creativecommons.org/licenses/by/4.0/',
      },
      txt: [{
        purpose: 'verify',
        content: 'test-verification',
      }],
      remoteItem: [{
        feedGuid: 'remote-guid',
        feedUrl: 'https://example.com/remote.xml',
        itemGuid: 'remote-item-guid',
        medium: 'music',
      }],
      block: {
        id: 'test-block',
        reason: 'test reason',
      },
      newFeedUrl: 'https://example.com/new-feed.xml',
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
      explicit: false,
      language: language,
    }],
    publishDate: new Date('2024-01-01'),
    tags: ['test', 'music'],
    eventId: 'event-id',
    artistPubkey: 'pubkey',
    identifier: 'identifier',
    createdAt: new Date('2024-01-01'),
    imageUrl: 'https://example.com/release.jpg',
    transcriptUrl: 'https://example.com/transcript.txt',
    genre,
  });

  const createMockTrailer = (): PodcastTrailer => ({
    id: 'trailer-id',
    title: 'Test Trailer',
    url: 'https://example.com/trailer.mp3',
    pubDate: new Date('2024-01-01'),
    length: 30,
    type: 'audio/mpeg',
    season: 1,
    eventId: 'trailer-event-id',
    artistPubkey: 'trailer-pubkey',
    identifier: 'trailer-identifier',
    createdAt: new Date('2024-01-01'),
  });

  describe('Core RSS structure preservation', () => {
    it('should maintain all required RSS 2.0 elements', () => {
      const releases = [createMockRelease('en', 'Rock')];
      const trailers = [createMockTrailer()];
      const rssXml = generateRSSFeed(releases, trailers, mockConfig);

      // RSS 2.0 required elements
      expect(rssXml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(rssXml).toContain('<rss version="2.0"');
      expect(rssXml).toContain('<channel>');
      expect(rssXml).toContain('</channel>');
      expect(rssXml).toContain('</rss>');

      // Channel required elements
      expect(rssXml).toContain('<title>Test Artist</title>');
      expect(rssXml).toContain('<description>Test Description</description>');
      expect(rssXml).toContain('<link>https://example.com</link>');
      expect(rssXml).toContain('<copyright>Test Copyright</copyright>');
      expect(rssXml).toContain('<pubDate>');
      expect(rssXml).toContain('<lastBuildDate>');
      expect(rssXml).toContain('<ttl>60</ttl>');
      expect(rssXml).toContain('<generator>');
    });

    it('should maintain all iTunes namespace elements', () => {
      const releases = [createMockRelease('es', 'Jazz')];
      const rssXml = generateRSSFeed(releases, [], mockConfig);

      expect(rssXml).toContain('xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd"');
      expect(rssXml).toContain('<itunes:author>Test Artist</itunes:author>');
      expect(rssXml).toContain('<itunes:category text="Music">');
      expect(rssXml).toContain('<itunes:category text="Jazz" />');
    });

    it('should maintain all Podcasting 2.0 namespace elements', () => {
      const releases = [createMockRelease('fr', 'Electronic')];
      const trailers = [createMockTrailer()];
      const rssXml = generateRSSFeed(releases, trailers, mockConfig);

      expect(rssXml).toContain('xmlns:podcast="https://podcastindex.org/namespace/1.0"');
      expect(rssXml).toContain('<podcast:guid>test-guid</podcast:guid>');
      expect(rssXml).toContain('<podcast:medium>music</podcast:medium>');
      expect(rssXml).toContain('<podcast:publisher>Test Publisher</podcast:publisher>');
      expect(rssXml).toContain('<podcast:license url="https://creativecommons.org/licenses/by/4.0/">CC-BY-4.0</podcast:license>');
      expect(rssXml).toContain('<podcast:location geo="geo:40.7589,-73.9851" osm="R175905">Test Location</podcast:location>');
      expect(rssXml).toContain('<podcast:person role="host" group="cast" img="https://example.com/person.jpg" href="https://example.com/person">Test Person</podcast:person>');
      expect(rssXml).toContain('<podcast:txt purpose="verify">test-verification</podcast:txt>');
      expect(rssXml).toContain('<podcast:remoteItem feedGuid="remote-guid" feedUrl="https://example.com/remote.xml" itemGuid="remote-item-guid" medium="music" />');
      expect(rssXml).toContain('<podcast:block id="test-block" reason="test reason" />');
      expect(rssXml).toContain('<podcast:newFeedUrl>https://example.com/new-feed.xml</podcast:newFeedUrl>');
      expect(rssXml).toContain('<podcast:funding url="https://example.com/support">Support this podcast</podcast:funding>');
      expect(rssXml).toContain('<podcast:value type="lightning" method="keysend" suggested="100">');
      expect(rssXml).toContain('<podcast:valueRecipient name="Test Artist" type="node" address="test@example.com" split="100" />');
      expect(rssXml).toContain('<podcast:trailer pubdate=');
    });

    it('should maintain all item-level elements', () => {
      const releases = [createMockRelease('de', 'Classical')];
      const rssXml = generateRSSFeed(releases, [], mockConfig);

      // Item required elements
      expect(rssXml).toContain('<item>');
      expect(rssXml).toContain('<title>Test Release</title>');
      expect(rssXml).toContain('<description>Test Description</description>');
      expect(rssXml).toContain('<link>');
      expect(rssXml).toContain('<guid isPermaLink="false">');
      expect(rssXml).toContain('<pubDate>');
      expect(rssXml).toContain('<author>Test Artist</author>');
      expect(rssXml).toContain('<category>test</category>');
      expect(rssXml).toContain('<category>music</category>');
      expect(rssXml).toContain('<enclosure url="https://example.com/audio.mp3"');
      expect(rssXml).toContain('<itunes:duration>');
      expect(rssXml).toContain('<itunes:image href="https://example.com/release.jpg" />');
      expect(rssXml).toContain('<podcast:guid>');
      expect(rssXml).toContain('<podcast:episode>');
      expect(rssXml).toContain('<podcast:transcript url="https://example.com/transcript.txt" type="text/plain" />');
      expect(rssXml).toContain('</item>');
    });
  });

  describe('Enhanced metadata integration', () => {
    it('should add language metadata without breaking existing structure', () => {
      const releases = [createMockRelease('ja', 'Pop')];
      const rssXml = generateRSSFeed(releases, [], mockConfig);

      // New language element should be present
      expect(rssXml).toContain('<language>ja</language>');

      // All existing elements should still be present
      expect(rssXml).toContain('<title>Test Release</title>');
      expect(rssXml).toContain('<enclosure url="https://example.com/audio.mp3"');
      expect(rssXml).toContain('<podcast:guid>');
    });

    it('should add genre metadata without breaking existing structure', () => {
      const releases = [createMockRelease('ko', 'Hip Hop')];
      const rssXml = generateRSSFeed(releases, [], mockConfig);

      // New genre category should be present
      expect(rssXml).toContain('<itunes:category text="Music">');
      expect(rssXml).toContain('<itunes:category text="Hip Hop" />');

      // All existing elements should still be present
      expect(rssXml).toContain('<itunes:author>Test Artist</itunes:author>');
      expect(rssXml).toContain('<podcast:guid>test-guid</podcast:guid>');
    });

    it('should handle both language and genre metadata together', () => {
      const releases = [createMockRelease('zh', 'R&B')];
      const rssXml = generateRSSFeed(releases, [], mockConfig);

      // Both new metadata types should be present
      expect(rssXml).toContain('<language>zh</language>');
      expect(rssXml).toContain('<itunes:category text="Music">');
      expect(rssXml).toContain('<itunes:category text="R&amp;B" />');

      // All existing elements should still be present
      expect(rssXml).toContain('<title>Test Release</title>');
      expect(rssXml).toContain('<enclosure url="https://example.com/audio.mp3"');
    });
  });

  describe('XML validation and escaping', () => {
    it('should properly escape special characters in all metadata', () => {
      const releases = [createMockRelease('en', 'Rock & Roll')];
      const rssXml = generateRSSFeed(releases, [], mockConfig);

      // Genre should be properly escaped
      expect(rssXml).toContain('<itunes:category text="Rock &amp; Roll" />');

      // Other elements should also be properly escaped
      expect(rssXml).toContain('<title>Test Artist</title>');
      expect(rssXml).not.toContain('<title>Test Artist & Co</title>');
    });

    it('should maintain valid XML structure with complex metadata', () => {
      const releases = [
        createMockRelease('en', 'Rock & Roll', 'id1'),
        createMockRelease('es', 'Pop/Dance', 'id2'),
        createMockRelease('fr', 'Jazz > Fusion', 'id3'),
      ];
      const rssXml = generateRSSFeed(releases, [], mockConfig);

      // Should be valid XML (no unclosed tags)
      expect(rssXml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(rssXml).toContain('</rss>');

      // All genres should be properly escaped
      expect(rssXml).toContain('text="Rock &amp; Roll"');
      expect(rssXml).toContain('text="Pop/Dance"');
      expect(rssXml).toContain('text="Jazz &gt; Fusion"');
    });

    it('should handle empty and null values gracefully', () => {
      const releases = [
        createMockRelease(null, null, 'id1'),
        createMockRelease(undefined, undefined, 'id2'),
        createMockRelease('', '', 'id3'),
      ];
      const rssXml = generateRSSFeed(releases, [], mockConfig);

      // Should not contain empty or null language elements
      expect(rssXml).not.toContain('<language></language>');
      expect(rssXml).not.toContain('<language>null</language>');
      expect(rssXml).not.toContain('<language>undefined</language>');

      // Should fall back to default Music category
      expect(rssXml).toContain('<itunes:category text="Music" />');
      expect(rssXml).not.toContain('text=""');
      expect(rssXml).not.toContain('text="null"');
    });
  });

  describe('Backward compatibility', () => {
    it('should generate valid RSS for releases without enhanced metadata', () => {
      const releases = [createMockRelease(undefined, undefined)];
      const rssXml = generateRSSFeed(releases, [], mockConfig);

      // Should still be valid RSS
      expect(rssXml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(rssXml).toContain('<channel>');
      expect(rssXml).toContain('<item>');
      expect(rssXml).toContain('<enclosure');
      expect(rssXml).toContain('</rss>');

      // Should have default category
      expect(rssXml).toContain('<itunes:category text="Music" />');

      // Should not have language elements
      expect(rssXml).not.toContain('<language>');
    });

    it('should maintain element order and structure', () => {
      const releases = [createMockRelease('pt', 'Samba')];
      const rssXml = generateRSSFeed(releases, [], mockConfig);

      // Check that elements appear in expected order
      const channelStart = rssXml.indexOf('<channel>');
      const titleIndex = rssXml.indexOf('<title>Test Artist</title>');
      const itunesAuthorIndex = rssXml.indexOf('<itunes:author>');
      const itunesCategoryIndex = rssXml.indexOf('<itunes:category');
      const podcastGuidIndex = rssXml.indexOf('<podcast:guid>');
      const itemStart = rssXml.indexOf('<item>');

      expect(channelStart).toBeLessThan(titleIndex);
      expect(titleIndex).toBeLessThan(itunesAuthorIndex);
      expect(itunesAuthorIndex).toBeLessThan(itunesCategoryIndex);
      expect(itunesCategoryIndex).toBeLessThan(podcastGuidIndex);
      expect(podcastGuidIndex).toBeLessThan(itemStart);
    });
  });
});