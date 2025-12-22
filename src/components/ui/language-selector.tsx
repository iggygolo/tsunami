import * as React from "react"
import { Check, ChevronDown, Languages } from "lucide-react"
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
import { 
  filterLanguages, 
  getLanguageName, 
  POPULAR_LANGUAGES,
  ALL_LANGUAGES 
} from "@/lib/musicMetadata"

interface LanguageSelectorProps {
  selectedLanguage?: string | null
  onLanguageChange: (language: string | null) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  showInstrumentalOption?: boolean
  maxDisplayItems?: number
}

export function LanguageSelector({
  selectedLanguage,
  onLanguageChange,
  placeholder = "Select language...",
  className,
  disabled = false,
  showInstrumentalOption = true,
  maxDisplayItems = 10
}: LanguageSelectorProps) {
  const [open, setOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")

  // Get filtered languages based on search query
  const filteredLanguages = React.useMemo(() => {
    const filtered = filterLanguages(searchQuery)
    
    if (!showInstrumentalOption) {
      return filtered.filter(lang => !lang.isInstrumental)
    }
    
    return filtered
  }, [searchQuery, showInstrumentalOption])

  // Get display languages (popular first, then filtered)
  const displayLanguages = React.useMemo(() => {
    if (!searchQuery.trim()) {
      // Show popular languages first, then others
      const popular = showInstrumentalOption 
        ? POPULAR_LANGUAGES 
        : POPULAR_LANGUAGES.filter(lang => !lang.isInstrumental)
      
      const others = ALL_LANGUAGES.filter(lang => 
        !popular.some(p => p.code === lang.code) &&
        (showInstrumentalOption || !lang.isInstrumental)
      )
      
      return [...popular, ...others].slice(0, maxDisplayItems)
    }
    
    return filteredLanguages.slice(0, maxDisplayItems)
  }, [filteredLanguages, searchQuery, showInstrumentalOption, maxDisplayItems])

  const selectedLanguageName = getLanguageName(selectedLanguage)

  const handleSelect = (languageCode: string | null) => {
    onLanguageChange(languageCode)
    setOpen(false)
    setSearchQuery("")
  }

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    if (!newOpen) {
      setSearchQuery("")
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
            selectedLanguage === undefined && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          <div className="flex items-center gap-2">
            <Languages className="h-4 w-4 shrink-0" />
            <span className="truncate">
              {selectedLanguage !== undefined ? selectedLanguageName : placeholder}
            </span>
          </div>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search languages..."
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList>
            <CommandEmpty>No languages found.</CommandEmpty>
            
            {/* Popular Languages Group */}
            {!searchQuery.trim() && (
              <CommandGroup heading="Popular">
                {POPULAR_LANGUAGES
                  .filter(lang => showInstrumentalOption || !lang.isInstrumental)
                  .slice(0, 6)
                  .map((language) => (
                    <CommandItem
                      key={language.code || 'instrumental'}
                      value={language.code || 'instrumental'}
                      onSelect={() => handleSelect(language.code)}
                      className="flex items-center gap-2"
                    >
                      <Check
                        className={cn(
                          "h-4 w-4",
                          selectedLanguage === language.code
                            ? "opacity-100"
                            : "opacity-0"
                        )}
                      />
                      <span className="flex-1">
                        {language.name}
                        {language.isInstrumental && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            (No vocals)
                          </span>
                        )}
                      </span>
                      {language.code && (
                        <span className="text-xs text-muted-foreground uppercase">
                          {language.code}
                        </span>
                      )}
                    </CommandItem>
                  ))}
              </CommandGroup>
            )}

            {/* All Languages or Search Results */}
            <CommandGroup heading={searchQuery.trim() ? "Results" : "All Languages"}>
              {displayLanguages
                .filter(lang => 
                  searchQuery.trim() || 
                  !POPULAR_LANGUAGES.slice(0, 6).some(p => p.code === lang.code)
                )
                .map((language) => (
                  <CommandItem
                    key={language.code || 'instrumental'}
                    value={language.code || 'instrumental'}
                    onSelect={() => handleSelect(language.code)}
                    className="flex items-center gap-2"
                  >
                    <Check
                      className={cn(
                        "h-4 w-4",
                        selectedLanguage === language.code
                          ? "opacity-100"
                          : "opacity-0"
                      )}
                    />
                    <span className="flex-1">
                      {language.name}
                      {language.isInstrumental && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          (No vocals)
                        </span>
                      )}
                    </span>
                    {language.code && (
                      <span className="text-xs text-muted-foreground uppercase">
                        {language.code}
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