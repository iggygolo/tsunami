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

  // Use the actual track artist name, not the configured artist
  const trackArtist = track.artist || track.artistName || config.music.artistName;

  // Generate a meaningful description with fallbacks
  let description = '';
  if (track.lyrics && track.lyrics.trim()) {
    description = track.lyrics.trim();
  } else if (track.credits && track.credits.trim()) {
    description = track.credits.trim();
  } else {
    // Create a default description with available metadata
    const parts = [] as string[];
    if (trackArtist && trackArtist !== config.music.artistName) {
      parts.push(`Performed by ${trackArtist}`);
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
      : `${track.title} by ${trackArtist}`;
  }

  return {
    title: track.title,
    description,
    link,
    guid: link, // Use the track link as GUID - it's a proper URI
    pubDate: track.createdAt ? track.createdAt.toUTCString() : new Date().toUTCString(),
    author: trackArtist, // Use actual track artist
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
      const trackArtist = trackRef.artist || config.music.artistName;
      const description = `${trackTitle} from the release "${release.title}" by ${trackArtist}. This track is part of a ${release.tracks.length}-track release.`;
      const placeholderLink = `${baseUrl}/release/${release.identifier}`;
      
      return {
        title: trackTitle,
        description,
        link: placeholderLink,
        guid: placeholderLink, // Use the link as GUID
        pubDate: release.createdAt ? release.createdAt.toUTCString() : new Date().toUTCString(),
        author: trackArtist, // Use actual track artist from reference
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
 * Validates RSS feed XML structure and required elements
 */
export interface RSSValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validates that the RSS feed contains all required elements
 */
export function validateRSSFeed(rssXml: string): RSSValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // Basic XML structure validation
    if (!rssXml.trim().startsWith('<?xml')) {
      errors.push('RSS feed must start with XML declaration');
    }

    if (!rssXml.includes('<rss version="2.0"')) {
      errors.push('RSS feed must have <rss version="2.0"> element');
    }

    // Required RSS elements
    const requiredElements = [
      '<channel>',
      '<title>',
      '<description>',
      '<link>',
      '</channel>',
      '</rss>'
    ];

    for (const element of requiredElements) {
      if (!rssXml.includes(element)) {
        errors.push(`Missing required RSS element: ${element}`);
      }
    }

    // iTunes namespace validation
    if (!rssXml.includes('xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd"')) {
      warnings.push('Missing iTunes namespace declaration');
    }

    // Podcasting 2.0 namespace validation
    if (!rssXml.includes('xmlns:podcast="https://podcastindex.org/namespace/1.0"')) {
      warnings.push('Missing Podcasting 2.0 namespace declaration');
    }

    // Atom namespace validation
    if (!rssXml.includes('xmlns:atom="http://www.w3.org/2005/Atom"')) {
      warnings.push('Missing Atom namespace declaration');
    }

    // Check for proper XML escaping in common problematic areas
    const unescapedPatterns = [
      { pattern: /[^&]&[^#\w]/, message: 'Unescaped ampersand (&) found - should be &amp;' },
      { pattern: /<(?![\/\w]|!\[CDATA\[)/, message: 'Unescaped less-than (<) found - should be &lt;' },
      { pattern: /(?<![\/\w])>/, message: 'Potentially unescaped greater-than (>) found - should be &gt;' }
    ];

    for (const { pattern, message } of unescapedPatterns) {
      if (pattern.test(rssXml)) {
        warnings.push(message);
      }
    }

    // Validate enclosure elements for items
    const itemMatches = rssXml.match(/<item>[\s\S]*?<\/item>/g);
    if (itemMatches) {
      itemMatches.forEach((item, index) => {
        if (!item.includes('<enclosure')) {
          errors.push(`Item ${index + 1} missing required <enclosure> element`);
        } else {
          // Validate enclosure attributes
          const enclosureMatch = item.match(/<enclosure\s+([^>]+)>/);
          if (enclosureMatch) {
            const attrs = enclosureMatch[1];
            if (!attrs.includes('url=')) {
              errors.push(`Item ${index + 1} enclosure missing required 'url' attribute`);
            }
            if (!attrs.includes('type=')) {
              errors.push(`Item ${index + 1} enclosure missing required 'type' attribute`);
            }
            if (!attrs.includes('length=')) {
              errors.push(`Item ${index + 1} enclosure missing required 'length' attribute`);
            }
          }
        }

        // Validate GUID elements
        if (!item.includes('<guid')) {
          warnings.push(`Item ${index + 1} missing <guid> element`);
        }

        // Validate pubDate elements
        if (!item.includes('<pubDate>')) {
          warnings.push(`Item ${index + 1} missing <pubDate> element`);
        }
      });
    }

    // Check for valid UTF-8 encoding
    try {
      // Test if the string can be properly encoded/decoded
      const encoded = encodeURIComponent(rssXml);
      decodeURIComponent(encoded);
    } catch (e) {
      errors.push('RSS feed contains invalid UTF-8 characters');
    }

    // Validate XML structure more thoroughly
    try {
      // Basic XML well-formedness check
      const openTags = rssXml.match(/<[^\/][^>]*>/g) || [];
      const closeTags = rssXml.match(/<\/[^>]+>/g) || [];
      
      // Simple tag balance check (not perfect but catches obvious issues)
      const tagCounts = new Map<string, number>();
      
      openTags.forEach(tag => {
        const tagName = tag.match(/<([^\s>]+)/)?.[1];
        if (tagName && !tag.endsWith('/>')) {
          tagCounts.set(tagName, (tagCounts.get(tagName) || 0) + 1);
        }
      });
      
      closeTags.forEach(tag => {
        const tagName = tag.match(/<\/([^>]+)>/)?.[1];
        if (tagName) {
          tagCounts.set(tagName, (tagCounts.get(tagName) || 0) - 1);
        }
      });
      
      for (const [tagName, count] of tagCounts) {
        if (count !== 0) {
          errors.push(`Unbalanced XML tags for: ${tagName} (difference: ${count})`);
        }
      }
    } catch (e) {
      errors.push('XML structure validation failed');
    }

  } catch (error) {
    errors.push(`RSS validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validates RSS configuration before generation
 */
export function validateRSSConfig(config: RSSConfig): RSSValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields
  if (!config.artistNpub || config.artistNpub.trim() === '') {
    errors.push('Artist npub is required');
  }

  if (!config.music.artistName || config.music.artistName.trim() === '') {
    errors.push('Artist name is required');
  }

  if (!config.music.description || config.music.description.trim() === '') {
    warnings.push('Artist description is recommended');
  }

  if (!config.music.website || config.music.website.trim() === '') {
    warnings.push('Website URL is recommended for proper RSS links');
  }

  if (!config.music.copyright || config.music.copyright.trim() === '') {
    warnings.push('Copyright information is recommended');
  }

  // Validate website URL format
  if (config.music.website) {
    try {
      new URL(config.music.website);
    } catch {
      errors.push('Website URL is not a valid URL format');
    }
  }

  // Validate image URL format
  if (config.music.image) {
    try {
      new URL(config.music.image);
    } catch {
      warnings.push('Image URL is not a valid URL format');
    }
  }

  // Validate value recipients
  if (config.music.value?.recipients) {
    config.music.value.recipients.forEach((recipient, index) => {
      if (!recipient.name || recipient.name.trim() === '') {
        errors.push(`Value recipient ${index + 1} missing name`);
      }
      if (!recipient.address || recipient.address.trim() === '') {
        errors.push(`Value recipient ${index + 1} missing address`);
      }
      if (typeof recipient.split !== 'number' || recipient.split < 0 || recipient.split > 100) {
        errors.push(`Value recipient ${index + 1} split must be a number between 0 and 100`);
      }
      if (!['node', 'lnaddress'].includes(recipient.type)) {
        warnings.push(`Value recipient ${index + 1} has unknown type: ${recipient.type}`);
      }
    });

    // Check that splits add up to 100 or less
    const totalSplit = config.music.value.recipients.reduce((sum, r) => sum + (r.split || 0), 0);
    if (totalSplit > 100) {
      errors.push(`Total value recipient splits (${totalSplit}) exceed 100%`);
    }
  }

  // Validate person entries
  if (config.music.person) {
    config.music.person.forEach((person, index) => {
      if (!person.name || person.name.trim() === '') {
        errors.push(`Person ${index + 1} missing name`);
      }
      if (!person.role || person.role.trim() === '') {
        errors.push(`Person ${index + 1} missing role`);
      }
      if (person.href) {
        try {
          new URL(person.href);
        } catch {
          warnings.push(`Person ${index + 1} href is not a valid URL`);
        }
      }
      if (person.img) {
        try {
          new URL(person.img);
        } catch {
          warnings.push(`Person ${index + 1} img is not a valid URL`);
        }
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Generate single RSS feed with multiple channels - one channel per release
 * Each channel contains tracks from that specific release as items
 * Now includes validation and error handling
 */
export function generateRSSFeed(
  tracks: MusicTrackData[], 
  releases: MusicPlaylistData[], 
  config: RSSConfig
): string {
  // Validate configuration first
  const configValidation = validateRSSConfig(config);
  if (!configValidation.isValid) {
    console.error('RSS Config validation failed:', configValidation.errors);
    // Continue with warnings but throw on errors
    throw new Error(`RSS configuration invalid: ${configValidation.errors.join(', ')}`);
  }

  if (configValidation.warnings.length > 0) {
    console.warn('RSS Config warnings:', configValidation.warnings);
  }

  const baseUrl = config.music.website || "";
  
  try {
    // Generate channels for each release
    const channels = releases.map(release => {
      try {
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
      } catch (error) {
        console.error(`Failed to generate RSS channel for release ${release.title}:`, error);
        // Return a minimal valid channel on error
        return `<channel>
    <title>${escapeXml(release.title || 'Unknown Release')}</title>
    <description>${escapeXml(`Error generating RSS for release: ${release.title || 'Unknown'}`)}</description>
    <link>${escapeXml(baseUrl)}</link>
    <copyright>${escapeXml(config.music.copyright)}</copyright>
    <pubDate>${new Date().toUTCString()}</pubDate>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <ttl>${config.rss.ttl}</ttl>
    <generator>Tsunami - Nostr Music Platform v${getPackageVersion()}</generator>
  </channel>`;
      }
    }).join('\n\n');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
     xmlns:atom="http://www.w3.org/2005/Atom"
     xmlns:podcast="https://podcastindex.org/namespace/1.0"
     xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd"
     xmlns:content="http://purl.org/rss/1.0/modules/content/">
${channels}
</rss>`;

    // Validate the generated RSS feed
    const validation = validateRSSFeed(xml);
    if (!validation.isValid) {
      console.error('Generated RSS feed validation failed:', validation.errors);
      if (validation.warnings.length > 0) {
        console.warn('RSS feed warnings:', validation.warnings);
      }
      // Still return the feed but log the issues
    } else if (validation.warnings.length > 0) {
      console.warn('RSS feed generated with warnings:', validation.warnings);
    }

    return xml;
  } catch (error) {
    console.error('RSS feed generation failed:', error);
    
    // Return a minimal valid RSS feed as fallback
    const fallbackXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
     xmlns:atom="http://www.w3.org/2005/Atom"
     xmlns:podcast="https://podcastindex.org/namespace/1.0"
     xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd">
  <channel>
    <title>${escapeXml(config.music.artistName || 'Artist')}</title>
    <description>${escapeXml(config.music.description || 'Music by artist')}</description>
    <link>${escapeXml(config.music.website || 'https://example.com')}</link>
    <copyright>${escapeXml(config.music.copyright || '© Artist')}</copyright>
    <pubDate>${new Date().toUTCString()}</pubDate>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <ttl>${config.rss.ttl}</ttl>
    <generator>Tsunami - Nostr Music Platform v${getPackageVersion()}</generator>
    <itunes:author>${escapeXml(config.music.artistName || 'Artist')}</itunes:author>
    <itunes:category text="Music" />
  </channel>
</rss>`;

    return fallbackXml;
  }
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