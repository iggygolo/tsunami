import * as React from "react"
import { Check, ChevronDown, Music, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { 
  filterGenres, 
  getAllGenres,
  POPULAR_GENRES,
  saveCustomGenre,
  isCustomGenre
} from "@/lib/musicMetadata"

interface GenreSelectorProps {
  selectedGenre?: string | null
  onGenreChange: (genre: string | null) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  allowCustomGenres?: boolean
  maxDisplayItems?: number
}

export function GenreSelector({
  selectedGenre,
  onGenreChange,
  placeholder = "Select genre...",
  className,
  disabled = false,
  allowCustomGenres = true,
  maxDisplayItems = 15
}: GenreSelectorProps) {
  const [open, setOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [showAddCustom, setShowAddCustom] = React.useState(false)
  const [customGenreInput, setCustomGenreInput] = React.useState("")

  // Get filtered genres based on search query
  const filteredGenres = React.useMemo(() => {
    return filterGenres(searchQuery, true)
  }, [searchQuery])

  // Get display genres (popular first, then filtered)
  const displayGenres = React.useMemo(() => {
    if (!searchQuery.trim()) {
      // Show popular genres first, then others
      const allGenres = getAllGenres()
      const popular = POPULAR_GENRES.filter(g => allGenres.includes(g))
      const others = allGenres.filter(g => !POPULAR_GENRES.includes(g)).sort()
      return [...popular, ...others].slice(0, maxDisplayItems)
    }
    
    return filteredGenres.slice(0, maxDisplayItems)
  }, [filteredGenres, searchQuery, maxDisplayItems])

  const handleSelect = (genre: string | null) => {
    onGenreChange(genre)
    setOpen(false)
    setSearchQuery("")
    setShowAddCustom(false)
    setCustomGenreInput("")
  }

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    if (!newOpen) {
      setSearchQuery("")
      setShowAddCustom(false)
      setCustomGenreInput("")
    }
  }

  const handleAddCustomGenre = () => {
    const trimmedGenre = customGenreInput.trim()
    if (trimmedGenre && saveCustomGenre(trimmedGenre)) {
      handleSelect(trimmedGenre)
    }
  }

  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    // Show add custom option if query doesn't match existing genres and custom genres are allowed
    if (allowCustomGenres && value.trim() && !filteredGenres.some(g => g.toLowerCase() === value.toLowerCase())) {
      setShowAddCustom(true)
      setCustomGenreInput(value.trim())
    } else {
      setShowAddCustom(false)
      setCustomGenreInput("")
    }
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between",
            !selectedGenre && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          <div className="flex items-center gap-2">
            <Music className="h-4 w-4 shrink-0" />
            <span className="truncate">
              {selectedGenre ? selectedGenre : placeholder}
            </span>
          </div>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[350px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search genres..."
            value={searchQuery}
            onValueChange={handleSearchChange}
          />
          <CommandList>
            <CommandEmpty>
              {allowCustomGenres ? "No genres found. Type to add a custom genre." : "No genres found."}
            </CommandEmpty>
            
            {/* Add Custom Genre Option */}
            {showAddCustom && allowCustomGenres && (
              <CommandGroup heading="Add Custom">
                <div className="flex items-center gap-2 p-2">
                  <Input
                    placeholder="Enter custom genre"
                    value={customGenreInput}
                    onChange={(e) => setCustomGenreInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleAddCustomGenre()
                      }
                    }}
                    className="flex-1"
                  />
                  <Button
                    size="sm"
                    onClick={handleAddCustomGenre}
                    disabled={!customGenreInput.trim()}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </CommandGroup>
            )}

            {/* Popular Genres Group */}
            {!searchQuery.trim() && (
              <CommandGroup heading="Popular">
                {POPULAR_GENRES
                  .filter(genre => getAllGenres().includes(genre))
                  .slice(0, 8)
                  .map((genre) => (
                    <CommandItem
                      key={genre}
                      value={genre}
                      onSelect={() => handleSelect(genre)}
                      className="flex items-center gap-2"
                    >
                      <Check
                        className={cn(
                          "h-4 w-4",
                          selectedGenre === genre
                            ? "opacity-100"
                            : "opacity-0"
                        )}
                      />
                      <span className="flex-1">{genre}</span>
                      {isCustomGenre(genre) && (
                        <span className="text-xs text-muted-foreground">
                          Custom
                        </span>
                      )}
                    </CommandItem>
                  ))}
              </CommandGroup>
            )}

            {/* All Genres or Search Results */}
            <CommandGroup heading={searchQuery.trim() ? "Results" : "All Genres"}>
              {displayGenres
                .filter(genre => 
                  searchQuery.trim() || 
                  !POPULAR_GENRES.slice(0, 8).includes(genre)
                )
                .map((genre) => (
                  <CommandItem
                    key={genre}
                    value={genre}
                    onSelect={() => handleSelect(genre)}
                    className="flex items-center gap-2"
                  >
                    <Check
                      className={cn(
                        "h-4 w-4",
                        selectedGenre === genre
                          ? "opacity-100"
                          : "opacity-0"
                      )}
                    />
                    <span className="flex-1">{genre}</span>
                    {isCustomGenre(genre) && (
                      <span className="text-xs text-muted-foreground">
                        Custom
                      </span>
                    )}
                  </CommandItem>
                ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}