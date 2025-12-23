import type { MusicTrackData, MusicPlaylistData, RSSItem } from '@/types/podcast';
import type { PodcastConfig } from './podcastConfig';
import { formatToAudioType } from '@/lib/audioUtils';

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

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Converts a MusicTrackData to an RSS item
 */
export function trackToRSSItem(track: MusicTrackData, config: RSSConfig, naddrEncoder?: (pubkey: string, identifier: string) => string): RSSItem {
  const baseUrl = config.podcast.website;
  
  // Generate link - use naddr encoder if provided, otherwise fallback to simple format
  const link = naddrEncoder && track.artistPubkey
    ? `${baseUrl}/${naddrEncoder(track.artistPubkey, track.identifier)}`
    : `${baseUrl}/track/${track.identifier}`;

  return {
    title: track.title,
    description: track.lyrics || track.credits || "",
    link,
    guid: track.artistPubkey ? `${track.artistPubkey}:${track.identifier}` : track.identifier,
    pubDate: track.createdAt ? track.createdAt.toUTCString() : new Date().toUTCString(),
    author: track.artist,
    category: track.genres || [],
    enclosure: {
      url: track.audioUrl,
      length: track.duration || 0,
      type: formatToAudioType(track.format || 'mp3')
    },
    duration: track.duration ? formatDuration(track.duration) : undefined,
    explicit: track.explicit,
    image: track.imageUrl,
    language: track.language,
  };
}

/**
 * Converts a MusicPlaylistData to multiple RSS items (one for each track)
 */
export function releaseToRSSItems(
  release: MusicPlaylistData, 
  tracks: MusicTrackData[], 
  config: RSSConfig, 
  trackNaddrEncoder?: (pubkey: string, identifier: string) => string
): RSSItem[] {
  const baseUrl = config.podcast.website;
  
  // Create RSS items for each track in the release
  return release.tracks.map((trackRef, index) => {
    // Find the actual track data
    const trackData = tracks.find(t => 
      t.identifier === trackRef.identifier && 
      t.artistPubkey === trackRef.pubkey
    );
    
    if (!trackData) {
      // Create a placeholder item if track data is not found
      return {
        title: trackRef.title || `Track ${index + 1}`,
        description: `Track from release: ${release.title}`,
        link: `${baseUrl}/release/${release.identifier}`,
        guid: `${release.identifier}:track:${index}`,
        pubDate: release.createdAt ? release.createdAt.toUTCString() : new Date().toUTCString(),
        author: trackRef.artist || config.podcast.artistName,
        category: release.categories || [],
        enclosure: {
          url: '',
          length: 0,
          type: 'audio/mpeg'
        }
      };
    }
    
    // Convert track to RSS item
    const rssItem = trackToRSSItem(trackData, config, trackNaddrEncoder);
    
    // Add release context to the description
    rssItem.description = `From release "${release.title}": ${rssItem.description}`;
    
    return rssItem;
  });
}

/**
 * Generate single RSS feed with multiple channels - one channel per release
 * Each channel contains tracks from that specific release as items
 */
export function generateRSSFeed(
  tracks: MusicTrackData[], 
  releases: MusicPlaylistData[], 
  config: RSSConfig,
  trackNaddrEncoder?: (pubkey: string, identifier: string) => string,
  releaseNaddrEncoder?: (pubkey: string, identifier: string) => string
): string {
  const baseUrl = config.podcast.website || "";
  
  // Generate channels for each release
  const channels = releases.map(release => {
    // Generate RSS items for tracks in this specific release
    const releaseItems = releaseToRSSItems(release, tracks, config, trackNaddrEncoder);
    
    // Get release-specific information
    const releaseLink = releaseNaddrEncoder && release.authorPubkey
      ? `${baseUrl}/${releaseNaddrEncoder(release.authorPubkey, release.identifier)}`
      : `${baseUrl}/release/${release.identifier}`;

    // Collect genres from tracks in this release
    const releaseGenres = Array.from(new Set(
      releaseItems
        .flatMap(item => item.category || [])
        .filter((genre): genre is string => Boolean(genre && typeof genre === 'string' && genre.trim().length > 0))
    ));

    return `<channel>
    <title>${escapeXml(release.title)}</title>
    <description>${escapeXml(release.description || `Music release: ${release.title}`)}</description>
    <link>${escapeXml(releaseLink)}</link>
    <copyright>${escapeXml(config.podcast.copyright)}</copyright>
    <pubDate>${release.createdAt ? release.createdAt.toUTCString() : new Date().toUTCString()}</pubDate>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <ttl>${config.rss.ttl}</ttl>
    ${release.imageUrl ? `<image>
      <url>${escapeXml(release.imageUrl)}</url>
      <title>${escapeXml(release.title)}</title>
      <link>${escapeXml(releaseLink)}</link>
    </image>` : ''}

    <!-- iTunes tags -->
    <itunes:author>${escapeXml(config.podcast.artistName)}</itunes:author>
    <itunes:owner itunes:name="${escapeXml(config.podcast.artistName)}" itunes:email=""/>
    ${release.imageUrl ? `<itunes:image href="${escapeXml(release.imageUrl)}" />` : ''}
    <itunes:category text="Music" />
    ${releaseGenres.length > 0 ? 
      releaseGenres.map(genre => `<itunes:category text="${escapeXml(genre)}" />`).join('\n    ') : 
      ''
    }
    <itunes:keywords>music</itunes:keywords>

    <!-- Podcasting 2.0 tags -->
    ${config.podcast.publisher ? `<podcast:publisher>${escapeXml(config.podcast.publisher)}</podcast:publisher>` : ''}
    <podcast:guid>${escapeXml(release.authorPubkey ? `${release.authorPubkey}:${release.identifier}` : release.identifier)}</podcast:guid>
    ${config.podcast.medium ? `<podcast:medium>${escapeXml(config.podcast.medium)}</podcast:medium>` : ''}
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
    ${config.podcast.value && config.podcast.value.amount > 0 ?
      `<podcast:value type="lightning" method="keysend" suggested="${config.podcast.value.amount}">
        ${config.podcast.value.recipients && config.podcast.value.recipients.length > 0 &&
          config.podcast.value.recipients.map(recipient =>
            `<podcast:valueRecipient name="${escapeXml(recipient.name)}" type="${escapeXml(recipient.type)}" address="${escapeXml(recipient.address)}" split="${recipient.split}"${recipient.customKey ? ` customKey="${escapeXml(recipient.customKey)}"` : ''}${recipient.customValue ? ` customValue="${escapeXml(recipient.customValue)}"` : ''}${recipient.fee ? ` fee="true"` : ''} />`
          ).join('\n        ')
        }
      </podcast:value>` : ''
    }

    <!-- Generator -->
    <generator>Tsunami - Nostr Music Platform v${getPackageVersion()}</generator>

    ${releaseItems.map((item, index) => `
    <item>
      <title>${escapeXml(item.title)}</title>
      <description>${escapeXml(item.description)}</description>
      <link>${escapeXml(item.link)}</link>
      <guid isPermaLink="false">${escapeXml(item.guid)}</guid>
      <pubDate>${item.pubDate}</pubDate>
      <author>${escapeXml(item.author || config.podcast.artistName)}</author>
      ${item.category?.map(cat => `<category>${escapeXml(cat)}</category>`).join('\n      ') || ''}
      ${item.language ? `<language>${escapeXml(item.language)}</language>` : ''}

      <!-- Enclosure (required for podcasts) -->
      <enclosure url="${escapeXml(item.enclosure.url)}"
                 length="${item.enclosure.length}"
                 type="${escapeXml(item.enclosure.type)}" />

      <!-- iTunes tags -->
      ${item.duration ? `<itunes:duration>${item.duration}</itunes:duration>` : ''}
      ${item.image ? `<itunes:image href="${escapeXml(item.image)}" />` : ''}
      ${item.explicit ? `<itunes:explicit>yes</itunes:explicit>` : ''}

      <pubDate>${release.createdAt ? release.createdAt.toUTCString() : new Date().toUTCString()}</pubDate>

      <!-- Podcasting 2.0 tags -->
      <podcast:guid>${escapeXml(item.guid)}</podcast:guid>
      <podcast:season>1</podcast:season>
      <podcast:episode>${index + 1}</podcast:episode>
    </item>`).join('')}
  </channel>`;
  }).join('\n\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
     xmlns:podcast="https://podcastindex.org/namespace/1.0"
     xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd"
     xmlns:content="http://purl.org/rss/1.0/modules/content/">
${channels}
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