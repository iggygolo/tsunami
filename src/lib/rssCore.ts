import type { MusicTrackData, MusicPlaylistData, RSSItem } from '@/types/music';
import { formatToAudioType } from '@/lib/audioUtils';
import { encodeMusicTrackAsNaddr } from '@/lib/nip19Utils';

/**
 * Core RSS generation utilities that work in both browser and Node.js environments
 * This module contains the shared logic for RSS feed generation
 */

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
export function trackToRSSItem(track: MusicTrackData, config: { website: string; artistName: string }): RSSItem {
  const baseUrl = config.website;
  
  // Generate naddr-based link
  const link = track.artistPubkey
    ? `${baseUrl}/track/${encodeMusicTrackAsNaddr(track.artistPubkey, track.identifier)}`
    : `${baseUrl}/track/${track.identifier}`;

  // Use the actual track artist name, not the configured artist
  const trackArtist = track.artist || track.artistName || config.artistName;

  // Generate a meaningful description with fallbacks
  let description = '';
  if (track.lyrics && track.lyrics.trim()) {
    description = track.lyrics.trim();
  } else if (track.credits && track.credits.trim()) {
    description = track.credits.trim();
  } else {
    // Create a default description with available metadata
    const parts = [] as string[];
    if (trackArtist && trackArtist !== config.artistName) {
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
  config: { website: string; artistName: string }
): RSSItem[] {
  const baseUrl = config.website;
  
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
      const trackArtist = trackRef.artist || config.artistName;
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
 * Artist information structure for RSS generation
 */
export interface ArtistInfo {
  pubkey: string;
  npub: string;
  name?: string;
  metadata?: {
    artist?: string;
    description?: string;
    image?: string;
    website?: string;
    copyright?: string;
    publisher?: string;
    medium?: string;
    guid?: string;
    license?: {
      identifier: string;
      url?: string;
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
    value?: {
      amount: number;
      currency: string;
      recipients?: Array<{
        name: string;
        type: 'node' | 'lnaddress';
        address: string;
        split: number;
        customKey?: string;
        customValue?: string;
        fee?: boolean;
      }>;
    };
    locked?: {
      owner?: string;
      locked?: boolean;
    };
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
  artistInfo: ArtistInfo,
  ttl: number = 60
): string {
  // Derive data from available sources with intelligent fallbacks
  const derivedArtistName = artistInfo.metadata?.artist || 
                           artistInfo.name || 
                           tracks[0]?.artist || 
                           tracks[0]?.artistName || 
                           'Unknown Artist';

  const derivedWebsite = artistInfo.metadata?.website || '';

  const derivedDescription = artistInfo.metadata?.description || 
                            `Music by ${derivedArtistName}`;

  const derivedImage = artistInfo.metadata?.image || 
                      releases[0]?.imageUrl || 
                      tracks[0]?.imageUrl || 
                      '';

  const derivedCopyright = artistInfo.metadata?.copyright || 
                          `© ${new Date().getFullYear()} ${derivedArtistName}`;

  const derivedPublisher = artistInfo.metadata?.publisher || 
                          derivedArtistName;

  const derivedMedium = artistInfo.metadata?.medium || 'music';

  // Validate TTL is reasonable
  const validTtl = (ttl < 1 || ttl > 1440) ? 60 : ttl;
  if (ttl !== validTtl) {
    console.warn('TTL should be between 1 and 1440 minutes (24 hours), using default 60');
  }

  const baseUrl = derivedWebsite;
  
  try {
    // Generate channels for each release
    const channels = releases.map(release => {
      try {
    // Generate RSS items for tracks in this specific release
        const releaseItems = releaseToRSSItems(release, tracks, {
          website: derivedWebsite,
          artistName: derivedArtistName
        });
        
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
    <copyright>${escapeXml(derivedCopyright)}</copyright>
    <pubDate>${release.createdAt ? release.createdAt.toUTCString() : new Date().toUTCString()}</pubDate>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <ttl>${validTtl}</ttl>
    ${release.imageUrl ? `<image>
      <url>${escapeXml(release.imageUrl)}</url>
      <title>${escapeXml(release.title)}</title>
      <link>${escapeXml(releaseLink)}</link>
    </image>` : ''}

    <!-- iTunes tags -->
    <itunes:author>${escapeXml(derivedArtistName)}</itunes:author>
    <itunes:owner itunes:name="${escapeXml(derivedArtistName)}" itunes:email=""/>
    ${release.imageUrl ? `<itunes:image href="${escapeXml(release.imageUrl)}" />` : ''}
    <itunes:category text="Music" />
    ${releaseGenres.length > 0 ? 
      releaseGenres.map(genre => `<itunes:category text="${escapeXml(genre)}" />`).join('\n    ') : 
      ''
    }

    <!-- Podcasting 2.0 tags -->
    <podcast:locked owner="${escapeXml(artistInfo.metadata?.locked?.owner || derivedArtistName)}">${artistInfo.metadata?.locked?.locked !== false ? 'yes' : 'no'}</podcast:locked>
    ${derivedPublisher ? `<podcast:publisher>${escapeXml(derivedPublisher)}</podcast:publisher>` : ''}
    <podcast:guid>${escapeXml(artistInfo.metadata?.guid || releaseLink)}</podcast:guid>
    ${derivedMedium ? `<podcast:medium>${escapeXml(derivedMedium)}</podcast:medium>` : ''}
    ${artistInfo.metadata?.license ?
      `<podcast:license ${artistInfo.metadata.license.url ? `url="${escapeXml(artistInfo.metadata.license.url)}"` : ''}>${escapeXml(artistInfo.metadata.license.identifier)}</podcast:license>` : ''
    }
    ${artistInfo.metadata?.location ?
      `<podcast:location ${artistInfo.metadata.location.geo ? `geo="${escapeXml(artistInfo.metadata.location.geo)}"` : ''} ${artistInfo.metadata.location.osm ? `osm="${escapeXml(artistInfo.metadata.location.osm)}"` : ''}>${escapeXml(artistInfo.metadata.location.name)}</podcast:location>` : ''
    }
    ${artistInfo.metadata?.person && artistInfo.metadata.person.length > 0 ?
      artistInfo.metadata.person.map(person =>
        `<podcast:person role="${escapeXml(person.role)}" ${person.group ? `group="${escapeXml(person.group)}"` : ''} ${person.img ? `img="${escapeXml(person.img)}"` : ''} ${person.href ? `href="${escapeXml(person.href)}"` : ''}>${escapeXml(person.name)}</podcast:person>`
      ).join('\n    ') : ''
    }
    ${artistInfo.metadata?.value && artistInfo.metadata.value.amount > 0 ?
      `<podcast:value type="lightning" method="keysend" suggested="${artistInfo.metadata.value.amount}">
        ${artistInfo.metadata.value.recipients && artistInfo.metadata.value.recipients.length > 0 &&
          artistInfo.metadata.value.recipients.map(recipient =>
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
      <author>${escapeXml(item.author || derivedArtistName)}</author>
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
    <copyright>${escapeXml(derivedCopyright)}</copyright>
    <pubDate>${new Date().toUTCString()}</pubDate>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <ttl>${validTtl}</ttl>
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
    <title>${escapeXml(derivedArtistName)}</title>
    <description>${escapeXml(derivedDescription)}</description>
    <link>${escapeXml(derivedWebsite || 'https://example.com')}</link>
    <copyright>${escapeXml(derivedCopyright)}</copyright>
    <pubDate>${new Date().toUTCString()}</pubDate>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <ttl>${validTtl}</ttl>
    <generator>Tsunami - Nostr Music Platform v${getPackageVersion()}</generator>
    <itunes:author>${escapeXml(derivedArtistName)}</itunes:author>
    <itunes:category text="Music" />
  </channel>
</rss>`;

    return fallbackXml;
  }
}

