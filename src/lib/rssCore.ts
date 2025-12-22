import type { PodcastRelease, PodcastTrailer, RSSItem } from '@/types/podcast';
import type { PodcastConfig } from './podcastConfig';

/**
 * Core RSS generation utilities that work in both browser and Node.js environments
 * This module contains the shared logic for RSS feed generation
 */

/**
 * Environment-agnostic configuration interface
 * This allows the same RSS generation logic to work with different config sources
 */
export interface RSSConfig {
  artistNpub: string;
  podcast: {
    artistName: string;
    description: string;
    image?: string;
    website?: string;
    copyright: string;
    funding?: string[];
    value?: {
      amount: number;
      currency?: string;
      recipients?: Array<{
        name: string;
        type: string;
        address: string;
        split: number;
        customKey?: string;
        customValue?: string;
        fee?: boolean;
      }>;
    };
    // Podcasting 2.0 fields
    guid?: string;
    medium?: string;
    publisher?: string;
    location?: {
      name: string;
      geo?: string;
      osm?: string;
    };
    person?: Array<{
      name: string;
      role: string;
      group?: string;
      img?: string;
      href?: string;
    }>;
    license?: {
      identifier: string;
      url?: string;
    };
    txt?: Array<{
      purpose: string;
      content: string;
    }>;
    remoteItem?: Array<{
      feedGuid: string;
      feedUrl?: string;
      itemGuid?: string;
      medium?: string;
    }>;
    block?: {
      id: string;
      reason?: string;
    };
    newFeedUrl?: string;
  };
  rss: {
    ttl: number;
  };
}

/**
 * Environment detection and base URL resolution
 */
export function getBaseUrl(): string {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  // Server-side fallback
  return process.env.BASE_URL || 'https://tsunami.example';
}

/**
 * Get package version from environment
 */
export function getPackageVersion(): string {
  if (typeof process !== 'undefined' && process.env.npm_package_version) {
    return process.env.npm_package_version;
  }
  return '1.0.0';
}

/**
 * Escapes XML special characters
 */
export function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Formats duration from seconds to HH:MM:SS format for iTunes
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Converts a PodcastRelease to an RSS item
 */
export function releaseToRSSItem(release: PodcastRelease, config: RSSConfig, naddrEncoder?: (pubkey: string, identifier: string) => string): RSSItem {
  // Get first track for RSS item
  const firstTrack = release.tracks?.[0];
  const baseUrl = getBaseUrl();
  
  // Generate link - use naddr encoder if provided, otherwise fallback to simple format
  const link = naddrEncoder 
    ? `${baseUrl}/${naddrEncoder(release.artistPubkey, release.identifier)}`
    : `${baseUrl}/release/${release.identifier}`;

  return {
    title: release.title,
    description: release.description || '',
    link,
    guid: `${release.artistPubkey}:${release.identifier}`,
    pubDate: release.publishDate.toUTCString(),
    author: config.podcast.artistName,
    category: release.tags,
    enclosure: {
      url: firstTrack?.audioUrl || '',
      length: firstTrack?.duration || 0,
      type: firstTrack?.audioType || 'audio/mpeg'
    },
    duration: firstTrack?.duration ? formatDuration(firstTrack.duration) : undefined,
    explicit: firstTrack?.explicit,
    image: release.imageUrl,
    transcriptUrl: release.transcriptUrl,
  };
}

/**
 * Core RSS feed generation function
 * Works in both browser and Node.js environments
 */
export function generateRSSFeed(
  releases: PodcastRelease[], 
  trailers: PodcastTrailer[], 
  config: RSSConfig,
  naddrEncoder?: (pubkey: string, identifier: string) => string
): string {
  const baseUrl = getBaseUrl();
  const rssItems = releases
    .sort((a, b) => b.publishDate.getTime() - a.publishDate.getTime())
    .map(release => releaseToRSSItem(release, config, naddrEncoder));

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
     xmlns:podcast="https://podcastindex.org/namespace/1.0"
     xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd"
     xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>${escapeXml(config.podcast.artistName)}</title>
    <description>${escapeXml(config.podcast.description)}</description>
    <link>${escapeXml(config.podcast.website || baseUrl)}</link>
    <copyright>${escapeXml(config.podcast.copyright)}</copyright>
    <pubDate>${new Date().toUTCString()}</pubDate>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <ttl>${config.rss.ttl}</ttl>

    <!-- iTunes tags -->
    <itunes:author>${escapeXml(config.podcast.artistName)}</itunes:author>

    <!-- Podcasting 2.0 tags -->
    <podcast:guid>${escapeXml(config.podcast.guid || config.artistNpub)}</podcast:guid>
    ${config.podcast.medium ? `<podcast:medium>${escapeXml(config.podcast.medium)}</podcast:medium>` : ''}
    ${config.podcast.publisher ? `<podcast:publisher>${escapeXml(config.podcast.publisher)}</podcast:publisher>` : ''}
    ${config.podcast.license ?
      `<podcast:license ${config.podcast.license.url ? `url="${escapeXml(config.podcast.license.url)}"` : ''}>${escapeXml(config.podcast.license.identifier)}</podcast:license>` : ''
    }
    ${config.podcast.location ?
      `<podcast:location ${config.podcast.location.geo ? `geo="${escapeXml(config.podcast.location.geo)}"` : ''} ${config.podcast.location.osm ? `osm="${escapeXml(config.podcast.location.osm)}"` : ''}>${escapeXml(config.podcast.location.name)}</podcast:location>` : ''
    }
    ${config.podcast.person && config.podcast.person.length > 0 ?
      config.podcast.person.map(person =>
        `<podcast:person role="${escapeXml(person.role)}" ${person.group ? `group="${escapeXml(person.group)}"` : ''} ${person.img ? `img="${escapeXml(person.img)}"` : ''} ${person.href ? `href="${escapeXml(person.href)}"` : ''}>${escapeXml(person.name)}</podcast:person>`
      ).join('\n    ') : ''
    }
    ${config.podcast.txt && config.podcast.txt.length > 0 ?
      config.podcast.txt.map(txt =>
        `<podcast:txt purpose="${escapeXml(txt.purpose)}">${escapeXml(txt.content)}</podcast:txt>`
      ).join('\n    ') : ''
    }
    ${config.podcast.remoteItem && config.podcast.remoteItem.length > 0 ?
      config.podcast.remoteItem.map(item =>
        `<podcast:remoteItem feedGuid="${escapeXml(item.feedGuid)}" ${item.feedUrl ? `feedUrl="${escapeXml(item.feedUrl)}"` : ''} ${item.itemGuid ? `itemGuid="${escapeXml(item.itemGuid)}"` : ''} ${item.medium ? `medium="${escapeXml(item.medium)}"` : ''} />`
      ).join('\n    ') : ''
    }
    ${config.podcast.block ?
      `<podcast:block id="${escapeXml(config.podcast.block.id)}" ${config.podcast.block.reason ? `reason="${escapeXml(config.podcast.block.reason)}"` : ''} />` : ''
    }
    ${config.podcast.newFeedUrl ? `<podcast:newFeedUrl>${escapeXml(config.podcast.newFeedUrl)}</podcast:newFeedUrl>` : ''}
    ${config.podcast.funding && config.podcast.funding.length > 0 ?
      config.podcast.funding.map(funding => {
        // Convert relative URLs to absolute URLs for RSS feed
        const absoluteUrl = funding.startsWith('/') || funding.startsWith('./') || funding.startsWith('../') 
          ? `${baseUrl}${funding.startsWith('/') ? funding : '/' + funding.replace(/^\.\//, '')}`
          : funding;
        return `<podcast:funding url="${escapeXml(absoluteUrl)}">Support this podcast</podcast:funding>`;
      }).join('\n    ') :
      `<podcast:funding url="${escapeXml(baseUrl)}">Support this podcast via Lightning</podcast:funding>`
    }
    ${config.podcast.value && config.podcast.value.amount > 0 ?
      `<podcast:value type="lightning" method="keysend" suggested="${config.podcast.value.amount}">
        ${config.podcast.value.recipients && config.podcast.value.recipients.length > 0 ?
          config.podcast.value.recipients.map(recipient =>
            `<podcast:valueRecipient name="${escapeXml(recipient.name)}" type="${escapeXml(recipient.type)}" address="${escapeXml(recipient.address)}" split="${recipient.split}"${recipient.customKey ? ` customKey="${escapeXml(recipient.customKey)}"` : ''}${recipient.customValue ? ` customValue="${escapeXml(recipient.customValue)}"` : ''}${recipient.fee ? ` fee="true"` : ''} />`
          ).join('\n        ') :
          `<podcast:valueRecipient name="${escapeXml(config.podcast.artistName)}" type="node" address="${escapeXml(config.podcast.funding?.[0] || '')}" split="100" />`
        }
      </podcast:value>` : ''
    }

    <!-- Trailers -->
    ${trailers.map(trailer => 
      `<podcast:trailer pubdate="${trailer.pubDate.toUTCString()}" url="${escapeXml(trailer.url)}"${trailer.length ? ` length="${trailer.length}"` : ''}${trailer.type ? ` type="${escapeXml(trailer.type)}"` : ''}${trailer.season ? ` season="${trailer.season}"` : ''}>${escapeXml(trailer.title)}</podcast:trailer>`
    ).join('\n    ')}

    <!-- Generator -->
    <generator>Tsunami - Nostr Podcast Platform v${getPackageVersion()}</generator>

    ${rssItems.map((item, index) => `
    <item>
      <title>${escapeXml(item.title)}</title>
      <description>${escapeXml(item.description)}</description>
      <link>${escapeXml(item.link)}</link>
      <guid isPermaLink="false">${escapeXml(item.guid)}</guid>
      <pubDate>${item.pubDate}</pubDate>
      <author>${escapeXml(item.author || config.podcast.artistName)}</author>
      ${item.category?.map(cat => `<category>${escapeXml(cat)}</category>`).join('\n      ') || ''}

      <!-- Enclosure (required for podcasts) -->
      <enclosure url="${escapeXml(item.enclosure.url)}"
                 length="${item.enclosure.length}"
                 type="${escapeXml(item.enclosure.type)}" />

      <!-- iTunes tags -->
      ${item.duration ? `<itunes:duration>${item.duration}</itunes:duration>` : ''}
      ${item.image ? `<itunes:image href="${escapeXml(item.image)}" />` : ''}

      <!-- Podcasting 2.0 tags -->
      <podcast:guid>${escapeXml(item.guid)}</podcast:guid>
      <podcast:episode>${index + 1}</podcast:episode>
      ${item.transcriptUrl ? `<podcast:transcript url="${escapeXml(item.transcriptUrl)}" type="text/plain" />` : ''}
    </item>`).join('')}
  </channel>
</rss>`;

  return xml;
}

/**
 * Convert PodcastConfig to RSSConfig format
 */
export function podcastConfigToRSSConfig(config: PodcastConfig): RSSConfig {
  return {
    artistNpub: config.artistNpub,
    podcast: {
      artistName: config.podcast.artistName,
      description: config.podcast.description,
      image: config.podcast.image,
      website: config.podcast.website,
      copyright: config.podcast.copyright,
      funding: config.podcast.funding,
      value: config.podcast.value,
      guid: config.podcast.guid,
      medium: config.podcast.medium,
      publisher: config.podcast.publisher,
      location: config.podcast.location,
      person: config.podcast.person,
      license: config.podcast.license,
      txt: config.podcast.txt,
      remoteItem: config.podcast.remoteItem,
      block: config.podcast.block,
      newFeedUrl: config.podcast.newFeedUrl,
    },
    rss: {
      ttl: config.rss.ttl,
    },
  };
}