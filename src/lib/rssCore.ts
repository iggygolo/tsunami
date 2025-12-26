import type { MusicTrackData, MusicPlaylistData, RSSItem } from '@/types/music';
import type { MusicConfig } from './musicConfig';
import { formatToAudioType } from '@/lib/audioUtils';
import { encodeMusicTrackAsNaddr } from '@/lib/nip19Utils';

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
  music: {
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
    locked?: {
      owner: string;
      locked: boolean;
    };
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
 * Converts explicit value to iTunes-compatible boolean string
 */
export function formatExplicitValue(explicit: boolean | string | undefined): string {
  if (explicit === true || explicit === 'true' || explicit === 'yes') {
    return 'true';
  }
  return 'false';
}
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Converts a MusicTrackData to an RSS item
 */
export function trackToRSSItem(track: MusicTrackData, config: RSSConfig): RSSItem {
  const baseUrl = config.music.website;
  
  // Generate naddr-based link
  const link = track.artistPubkey
    ? `${baseUrl}/track/${encodeMusicTrackAsNaddr(track.artistPubkey, track.identifier)}`
    : `${baseUrl}/track/${track.identifier}`;

  // Generate a meaningful description with fallbacks
  let description = '';
  if (track.lyrics && track.lyrics.trim()) {
    description = track.lyrics.trim();
  } else if (track.credits && track.credits.trim()) {
    description = track.credits.trim();
  } else {
    // Create a default description with available metadata
    const parts = [] as string[];
    if (track.artist && track.artist !== config.music.artistName) {
      parts.push(`Performed by ${track.artist}`);
    }
    if (track.genres && track.genres.length > 0) {
      parts.push(`Genre: ${track.genres.join(', ')}`);
    }
    if (track.duration) {
      const minutes = Math.floor(track.duration / 60);
      const seconds = track.duration % 60;
      parts.push(`Duration: ${minutes}:${seconds.toString().padStart(2, '0')}`);
    }
    
    description = parts.length > 0 
      ? `${track.title} - ${parts.join(' • ')}` 
      : `${track.title} by ${config.music.artistName}`;
  }

  return {
    title: track.title,
    description,
    link,
    guid: link, // Use the track link as GUID - it's a proper URI
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
  config: RSSConfig
): RSSItem[] {
  const baseUrl = config.music.website;
  
  // Create RSS items for each track in the release
  return release.tracks.map((trackRef, index) => {
    // Find the actual track data
    const trackData = tracks.find(t => 
      t.identifier === trackRef.identifier && 
      t.artistPubkey === trackRef.pubkey
    );
    
    if (!trackData) {
      // Create a placeholder item if track data is not found
      const trackTitle = trackRef.title || `Track ${index + 1}`;
      const description = `${trackTitle} from the release "${release.title}" by ${trackRef.artist || config.music.artistName}. This track is part of a ${release.tracks.length}-track release.`;
      const placeholderLink = `${baseUrl}/release/${release.identifier}`;
      
      return {
        title: trackTitle,
        description,
        link: placeholderLink,
        guid: placeholderLink, // Use the link as GUID
        pubDate: release.createdAt ? release.createdAt.toUTCString() : new Date().toUTCString(),
        author: trackRef.artist || config.music.artistName,
        category: release.categories || [],
        enclosure: {
          url: '',
          length: 0,
          type: 'audio/mpeg'
        }
      };
    }
    
    // Convert track to RSS item
    const rssItem = trackToRSSItem(trackData, config);
    
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
  config: RSSConfig
): string {
  const baseUrl = config.music.website || "";
  
  // Generate channels for each release
  const channels = releases.map(release => {
    // Generate RSS items for tracks in this specific release
    const releaseItems = releaseToRSSItems(release, tracks, config);
    
    // Get release-specific information using naddr
    const releaseLink = release.authorPubkey
      ? `${baseUrl}/release/${release.authorPubkey}/${release.identifier}`
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
    <atom:link href="${escapeXml(baseUrl.replace(/\/$/, ''))}/rss.xml" rel="self" type="application/rss+xml" />
    <copyright>${escapeXml(config.music.copyright)}</copyright>
    <pubDate>${release.createdAt ? release.createdAt.toUTCString() : new Date().toUTCString()}</pubDate>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <ttl>${config.rss.ttl}</ttl>
    ${release.imageUrl ? `<image>
      <url>${escapeXml(release.imageUrl)}</url>
      <title>${escapeXml(release.title)}</title>
      <link>${escapeXml(releaseLink)}</link>
    </image>` : ''}

    <!-- iTunes tags -->
    <itunes:author>${escapeXml(config.music.artistName)}</itunes:author>
    <itunes:owner itunes:name="${escapeXml(config.music.artistName)}" itunes:email=""/>
    ${release.imageUrl ? `<itunes:image href="${escapeXml(release.imageUrl)}" />` : ''}
    <itunes:category text="Music" />
    ${releaseGenres.length > 0 ? 
      releaseGenres.map(genre => `<itunes:category text="${escapeXml(genre)}" />`).join('\n    ') : 
      ''
    }

    <!-- Podcasting 2.0 tags -->
    <podcast:locked owner="${escapeXml(config.music.locked?.owner || config.music.artistName)}">${config.music.locked?.locked !== false ? 'yes' : 'no'}</podcast:locked>
    ${config.music.publisher ? `<podcast:publisher>${escapeXml(config.music.publisher)}</podcast:publisher>` : ''}
    <podcast:guid>${escapeXml(releaseLink)}</podcast:guid>
    ${config.music.medium ? `<podcast:medium>${escapeXml(config.music.medium)}</podcast:medium>` : ''}
    ${config.music.license ?
      `<podcast:license ${config.music.license.url ? `url="${escapeXml(config.music.license.url)}"` : ''}>${escapeXml(config.music.license.identifier)}</podcast:license>` : ''
    }
    ${config.music.location ?
      `<podcast:location ${config.music.location.geo ? `geo="${escapeXml(config.music.location.geo)}"` : ''} ${config.music.location.osm ? `osm="${escapeXml(config.music.location.osm)}"` : ''}>${escapeXml(config.music.location.name)}</podcast:location>` : ''
    }
    ${config.music.person && config.music.person.length > 0 ?
      config.music.person.map(person =>
        `<podcast:person role="${escapeXml(person.role)}" ${person.group ? `group="${escapeXml(person.group)}"` : ''} ${person.img ? `img="${escapeXml(person.img)}"` : ''} ${person.href ? `href="${escapeXml(person.href)}"` : ''}>${escapeXml(person.name)}</podcast:person>`
      ).join('\n    ') : ''
    }
    ${config.music.value && config.music.value.amount > 0 ?
      `<podcast:value type="lightning" method="keysend" suggested="${config.music.value.amount}">
        ${config.music.value.recipients && config.music.value.recipients.length > 0 &&
          config.music.value.recipients.map(recipient =>
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
      <author>${escapeXml(item.author || config.music.artistName)}</author>
      ${item.category?.map(cat => `<category>${escapeXml(cat)}</category>`).join('\n      ') || ''}
      ${item.language ? `<language>${escapeXml(item.language)}</language>` : ''}

      <!-- Enclosure (required for podcasts) -->
      <enclosure url="${escapeXml(item.enclosure.url)}"
                 length="${item.enclosure.length}"
                 type="${escapeXml(item.enclosure.type)}" />

      <!-- iTunes tags -->
      ${item.duration ? `<itunes:duration>${item.duration}</itunes:duration>` : ''}
      ${item.image ? `<itunes:image href="${escapeXml(item.image)}" />` : ''}
      <itunes:explicit>${formatExplicitValue(item.explicit)}</itunes:explicit>
      <itunes:episode>${index + 1}</itunes:episode>

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
     xmlns:atom="http://www.w3.org/2005/Atom"
     xmlns:podcast="https://podcastindex.org/namespace/1.0"
     xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd"
     xmlns:content="http://purl.org/rss/1.0/modules/content/">
${channels}
</rss>`;

  return xml;
}

/**
 * Convert MusicConfig to RSSConfig format
 */
export function musicConfigToRSSConfig(config: MusicConfig): RSSConfig {
  return {
    artistNpub: config.artistNpub,
    music: {
      artistName: config.music.artistName,
      description: config.music.description,
      image: config.music.image,
      website: config.music.website,
      copyright: config.music.copyright,
      value: config.music.value,
      guid: config.music.guid,
      medium: config.music.medium,
      publisher: config.music.publisher,
      locked: config.music.locked,
      location: config.music.location,
      person: config.music.person,
      license: config.music.license,
      txt: config.music.txt,
      remoteItem: config.music.remoteItem,
      block: config.music.block,
      newFeedUrl: config.music.newFeedUrl,
    },
    rss: {
      ttl: config.rss.ttl,
    },
  };
}