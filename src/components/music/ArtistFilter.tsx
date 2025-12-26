import { useState, useMemo } from 'react';
import { Check, ChevronsUpDown, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useDiscoveredArtists } from '@/hooks/useArtistProfiles';
import { cn } from '@/lib/utils';
import type { MusicRelease, SimpleArtistInfo } from '@/types/music';

interface ArtistFilterProps {
  /** All releases to extract artists from */
  releases: MusicRelease[];
  /** Currently selected artist pubkey (undefined for "All Artists") */
  selectedArtist?: string;
  /** Callback when artist selection changes */
  onArtistChange: (artistPubkey?: string) => void;
  /** Custom CSS classes */
  className?: string;
}

/**
 * ArtistFilter dropdown component for filtering releases by artist.
 * Automatically discovers artists from the provided releases and provides
 * a searchable dropdown with "All Artists" option.
 */
export function ArtistFilter({
  releases,
  selectedArtist,
  onArtistChange,
  className
}: ArtistFilterProps) {
  const [open, setOpen] = useState(false);

  // Extract unique artists from releases
  const artistEvents = useMemo(() => {
    const uniqueArtists = new Map<string, { pubkey: string }>();
    releases.forEach(release => {
      if (release.artistPubkey) {
        uniqueArtists.set(release.artistPubkey, { pubkey: release.artistPubkey });
      }
    });
    return Array.from(uniqueArtists.values());
  }, [releases]);

  // Fetch artist profiles for discovered artists
  const { data: discoveredArtists = [], isLoading } = useDiscoveredArtists(artistEvents);

  // Create options list with "All Artists" at the top
  const artistOptions = useMemo(() => {
    const allOption: SimpleArtistInfo & { isAllOption: boolean } = {
      pubkey: '',
      name: 'All Artists',
      npub: '',
      isAllOption: true
    };

    const sortedArtists = [...discoveredArtists].sort((a, b) => {
      const nameA = a.name || a.npub.slice(0, 12) + '...';
      const nameB = b.name || b.npub.slice(0, 12) + '...';
      return nameA.localeCompare(nameB);
    });

    return [allOption, ...sortedArtists.map(artist => ({ ...artist, isAllOption: false }))];
  }, [discoveredArtists]);

  // Find selected artist info
  const selectedArtistInfo = selectedArtist 
    ? discoveredArtists.find(artist => artist.pubkey === selectedArtist)
    : null;

  const selectedDisplayName = selectedArtist && selectedArtistInfo
    ? selectedArtistInfo.name || `${selectedArtistInfo.npub.slice(0, 12)}...`
    : 'All Artists';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-48 justify-between", className)}
          disabled={isLoading}
        >
          <div className="flex items-center gap-2 truncate">
            <User className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <span className="truncate">
              {isLoading ? 'Loading...' : selectedDisplayName}
            </span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0">
        <Command>
          <CommandInput placeholder="Search artists..." />
          <CommandList>
            <CommandEmpty>No artists found.</CommandEmpty>
            <CommandGroup>
              {artistOptions.map((artist) => (
                <CommandItem
                  key={artist.pubkey || 'all'}
                  value={artist.name || artist.npub}
                  onSelect={() => {
                    const newSelection = artist.isAllOption ? undefined : artist.pubkey;
                    onArtistChange(newSelection);
                    setOpen(false);
                  }}
                >
                  <div className="flex items-center gap-2 flex-1">
                    {artist.isAllOption ? (
                      <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                        <User className="w-3 h-3 text-muted-foreground" />
                      </div>
                    ) : artist.image ? (
                      <img
                        src={artist.image}
                        alt={`${artist.name} profile`}
                        className="w-6 h-6 rounded-full object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                        <User className="w-3 h-3 text-muted-foreground" />
                      </div>
                    )}
                    <span className="truncate">
                      {artist.name || (artist.isAllOption ? 'All Artists' : `${artist.npub.slice(0, 12)}...`)}
                    </span>
                  </div>
                  <Check
                    className={cn(
                      "ml-auto h-4 w-4",
                      (artist.isAllOption && !selectedArtist) || 
                      (!artist.isAllOption && selectedArtist === artist.pubkey)
                        ? "opacity-100" 
                        : "opacity-0"
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}