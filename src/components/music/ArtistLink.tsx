import { Link } from 'react-router-dom';
import { User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useArtistInfo } from '@/hooks/useArtistProfiles';
import { pubkeyToNpub } from '@/lib/artistUtils';
import type { SimpleArtistInfo } from '@/types/music';

interface ArtistLinkProps {
  /** Artist pubkey (hex format) */
  pubkey: string;
  /** Optional pre-loaded artist info to avoid additional fetching */
  artistInfo?: SimpleArtistInfo;
  /** Show artist image alongside name */
  showImage?: boolean;
  /** Custom CSS classes */
  className?: string;
  /** Custom text size classes */
  textSize?: string;
  /** Custom image size classes */
  imageSize?: string;
  /** Disable link functionality (render as span) */
  disabled?: boolean;
}

/**
 * ArtistLink component for consistent artist attribution across the app.
 * Displays artist name with optional image and links to artist profile.
 * Handles loading states and fallbacks gracefully.
 */
export function ArtistLink({
  pubkey,
  artistInfo: providedArtistInfo,
  showImage = false,
  className,
  textSize = 'text-sm',
  imageSize = 'w-6 h-6',
  disabled = false
}: ArtistLinkProps) {
  // Use provided artist info or fetch from cache/network
  const fetchedArtistInfo = useArtistInfo(providedArtistInfo ? undefined : pubkey);
  const artistInfo = providedArtistInfo || fetchedArtistInfo;

  if (!pubkey || !artistInfo) {
    return (
      <span className={cn('text-muted-foreground', textSize, className)}>
        Unknown Artist
      </span>
    );
  }

  const npub = artistInfo.npub || pubkeyToNpub(pubkey);
  const artistName = artistInfo.name || `${npub.slice(0, 12)}...`;
  const profileUrl = `/${npub}`;

  const content = (
    <div className={cn('flex items-center gap-2', className)}>
      {showImage && (
        <div className={cn('rounded-full overflow-hidden flex-shrink-0', imageSize)}>
          {artistInfo.image ? (
            <img
              src={artistInfo.image}
              alt={`${artistName} profile`}
              className="w-full h-full object-cover"
              onError={(e) => {
                // Fallback to user icon on image load error
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                const parent = target.parentElement;
                if (parent) {
                  parent.innerHTML = `<div class="w-full h-full bg-muted flex items-center justify-center"><svg class="w-3 h-3 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg></div>`;
                }
              }}
            />
          ) : (
            <div className="w-full h-full bg-muted flex items-center justify-center">
              <User className="w-3 h-3 text-muted-foreground" />
            </div>
          )}
        </div>
      )}
      <span className={cn('truncate', textSize)}>
        {artistName}
      </span>
    </div>
  );

  if (disabled) {
    return (
      <span className={cn('text-muted-foreground', className)}>
        {content}
      </span>
    );
  }

  return (
    <Link
      to={profileUrl}
      className={cn(
        'text-foreground hover:text-primary transition-colors duration-200',
        'hover:underline decoration-primary/50 underline-offset-2',
        className
      )}
      title={`View ${artistName}'s profile`}
    >
      {content}
    </Link>
  );
}

/**
 * Compact version of ArtistLink for use in tight spaces
 */
export function ArtistLinkCompact({ pubkey, artistInfo, className, ...props }: ArtistLinkProps) {
  return (
    <ArtistLink
      pubkey={pubkey}
      artistInfo={artistInfo}
      showImage={false}
      textSize="text-xs"
      className={cn('text-muted-foreground', className)}
      {...props}
    />
  );
}

/**
 * ArtistLink with image for use in cards and prominent displays
 */
export function ArtistLinkWithImage({ pubkey, artistInfo, className, ...props }: ArtistLinkProps) {
  return (
    <ArtistLink
      pubkey={pubkey}
      artistInfo={artistInfo}
      showImage={true}
      textSize="text-sm"
      imageSize="w-8 h-8"
      className={cn('font-medium', className)}
      {...props}
    />
  );
}

/**
 * Large ArtistLink for use in headers and prominent sections
 */
export function ArtistLinkLarge({ pubkey, artistInfo, className, ...props }: ArtistLinkProps) {
  return (
    <ArtistLink
      pubkey={pubkey}
      artistInfo={artistInfo}
      showImage={true}
      textSize="text-lg"
      imageSize="w-10 h-10"
      className={cn('font-semibold', className)}
      {...props}
    />
  );
}