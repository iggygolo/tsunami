/**
 * Music Metadata Configuration
 * Comprehensive language and genre support for music releases
 */

import type { LanguageOption, LanguageConfiguration, GenreConfiguration } from '@/types/music';

/**
 * Comprehensive list of languages with ISO 639-1 codes
 * Includes instrumental option as first choice
 */
export const COMPREHENSIVE_LANGUAGES: LanguageOption[] = [
  { code: null, name: "None (Instrumental)", isInstrumental: true },
  { code: "en", name: "English" },
  { code: "es", name: "Spanish" },
  { code: "fr", name: "French" },
  { code: "de", name: "German" },
  { code: "it", name: "Italian" },
  { code: "pt", name: "Portuguese" },
  { code: "ru", name: "Russian" },
  { code: "ja", name: "Japanese" },
  { code: "ko", name: "Korean" },
  { code: "zh", name: "Chinese" },
  { code: "ar", name: "Arabic" },
  { code: "hi", name: "Hindi" },
  { code: "th", name: "Thai" },
  { code: "vi", name: "Vietnamese" },
  { code: "tr", name: "Turkish" },
  { code: "pl", name: "Polish" },
  { code: "nl", name: "Dutch" },
  { code: "sv", name: "Swedish" },
  { code: "da", name: "Danish" },
  { code: "no", name: "Norwegian" },
  { code: "fi", name: "Finnish" },
  { code: "cs", name: "Czech" },
  { code: "hu", name: "Hungarian" },
  { code: "ro", name: "Romanian" },
  { code: "bg", name: "Bulgarian" },
  { code: "hr", name: "Croatian" },
  { code: "sk", name: "Slovak" },
  { code: "sl", name: "Slovenian" },
  { code: "et", name: "Estonian" },
  { code: "lv", name: "Latvian" },
  { code: "lt", name: "Lithuanian" },
  { code: "el", name: "Greek" },
  { code: "he", name: "Hebrew" },
  { code: "fa", name: "Persian" },
  { code: "ur", name: "Urdu" },
  { code: "bn", name: "Bengali" },
  { code: "ta", name: "Tamil" },
  { code: "te", name: "Telugu" },
  { code: "ml", name: "Malayalam" },
  { code: "kn", name: "Kannada" },
  { code: "gu", name: "Gujarati" },
  { code: "pa", name: "Punjabi" },
  { code: "mr", name: "Marathi" },
  { code: "ne", name: "Nepali" },
  { code: "si", name: "Sinhala" },
  { code: "my", name: "Burmese" },
  { code: "km", name: "Khmer" },
  { code: "lo", name: "Lao" },
];

// Continue with more languages
export const MORE_LANGUAGES: LanguageOption[] = [
  { code: "ka", name: "Georgian" },
  { code: "am", name: "Amharic" },
  { code: "sw", name: "Swahili" },
  { code: "zu", name: "Zulu" },
  { code: "af", name: "Afrikaans" },
  { code: "is", name: "Icelandic" },
  { code: "ga", name: "Irish" },
  { code: "cy", name: "Welsh" },
  { code: "eu", name: "Basque" },
  { code: "ca", name: "Catalan" },
  { code: "gl", name: "Galician" },
  { code: "mt", name: "Maltese" },
  { code: "id", name: "Indonesian" },
  { code: "ms", name: "Malay" },
  { code: "tl", name: "Filipino" },
  { code: "uk", name: "Ukrainian" },
  { code: "be", name: "Belarusian" },
  { code: "sr", name: "Serbian" },
  { code: "mk", name: "Macedonian" },
  { code: "sq", name: "Albanian" },
  { code: "hy", name: "Armenian" },
  { code: "az", name: "Azerbaijani" },
  { code: "kk", name: "Kazakh" },
  { code: "uz", name: "Uzbek" },
  { code: "mn", name: "Mongolian" },
];

/**
 * All available languages (combined list)
 */
export const ALL_LANGUAGES: LanguageOption[] = [
  ...COMPREHENSIVE_LANGUAGES,
  ...MORE_LANGUAGES.filter(lang => !COMPREHENSIVE_LANGUAGES.some(l => l.code === lang.code))
];

/**
 * Popular/common languages shown first in UI
 */
export const POPULAR_LANGUAGES: LanguageOption[] = [
  { code: null, name: "None (Instrumental)", isInstrumental: true },
  { code: "en", name: "English" },
  { code: "es", name: "Spanish" },
  { code: "fr", name: "French" },
  { code: "de", name: "German" },
  { code: "pt", name: "Portuguese" },
  { code: "ja", name: "Japanese" },
  { code: "ko", name: "Korean" },
  { code: "zh", name: "Chinese" },
  { code: "it", name: "Italian" },
  { code: "ru", name: "Russian" },
  { code: "ar", name: "Arabic" },
];

/**
 * Language configuration object
 */
export const LANGUAGE_CONFIG: LanguageConfiguration = {
  commonLanguages: POPULAR_LANGUAGES,
  allLanguages: ALL_LANGUAGES,
  instrumentalOption: { code: null, name: "None (Instrumental)", isInstrumental: true }
};


/**
 * Comprehensive genre library organized by category
 */
export const COMPREHENSIVE_GENRES: string[] = [
  // Popular/Common Genres
  "Pop", "Rock", "Hip Hop", "Rap", "R&B", "Country", "Jazz", "Blues", "Classical", "Electronic",
  
  // Electronic/Dance Subgenres
  "EDM", "House", "Techno", "Trance", "Dubstep", "Drum & Bass", "Ambient", "Synthwave", "Chillwave",
  "Future Bass", "Trap", "Hardstyle", "Progressive House", "Deep House", "Tech House", "Minimal",
  "Electro", "Breakbeat", "UK Garage", "Jungle", "Downtempo", "Trip Hop", "IDM", "Glitch",
  
  // Rock Subgenres
  "Alternative Rock", "Indie Rock", "Punk Rock", "Hard Rock", "Metal", "Heavy Metal", "Death Metal",
  "Black Metal", "Progressive Rock", "Psychedelic Rock", "Garage Rock", "Post-Rock", "Shoegaze",
  "Grunge", "Stoner Rock", "Doom Metal", "Thrash Metal", "Nu Metal", "Metalcore", "Post-Metal",
  
  // Hip Hop/Rap Subgenres
  "Old School Hip Hop", "Conscious Rap", "Gangsta Rap", "Mumble Rap", "Boom Bap", "Lo-Fi Hip Hop",
  "Southern Hip Hop", "West Coast Hip Hop", "East Coast Hip Hop", "UK Hip Hop", "Grime",
  
  // Pop Subgenres
  "Indie Pop", "Synth-pop", "Dream Pop", "Electropop", "K-Pop", "J-Pop", "Bubblegum Pop", "Art Pop",
  "Dance Pop", "Teen Pop", "Power Pop", "Baroque Pop", "Chamber Pop", "Hyperpop",
  
  // Folk/Acoustic
  "Folk", "Indie Folk", "Acoustic", "Singer-Songwriter", "Americana", "Bluegrass", "Celtic",
  "Folk Rock", "Contemporary Folk", "Neofolk", "Freak Folk", "Anti-Folk",
  
  // World Music
  "World", "Latin", "Reggae", "Ska", "Afrobeat", "Bossa Nova", "Flamenco", "Tango", "Salsa",
  "Cumbia", "Mariachi", "Fado", "Qawwali", "Bhangra", "Gamelan", "Taiko", "Highlife", "Soukous",
  
  // Alternative/Indie
  "Alternative", "Indie", "Experimental", "Avant-garde", "Noise", "Industrial", "Post-Punk",
  "New Wave", "Darkwave", "Coldwave", "Minimal Wave", "Art Rock", "Math Rock", "Noise Rock",
  
  // Soul/Funk
  "Soul", "Funk", "Disco", "Motown", "Neo-Soul", "Acid Jazz", "Northern Soul", "Southern Soul",
  "Psychedelic Soul", "P-Funk", "Boogie", "Nu-Disco",
  
  // Reggae/Caribbean
  "Dancehall", "Dub", "Roots Reggae", "Calypso", "Soca", "Reggaeton", "Dembow",
  
  // Classical Subgenres
  "Baroque", "Romantic", "Contemporary Classical", "Minimalism", "Opera", "Chamber Music",
  "Orchestral", "Choral", "Neoclassical", "Modern Classical",
  
  // Jazz Subgenres
  "Bebop", "Cool Jazz", "Free Jazz", "Fusion", "Smooth Jazz", "Swing", "Big Band",
  "Modal Jazz", "Hard Bop", "Latin Jazz", "Vocal Jazz", "Nu Jazz",
  
  // Country Subgenres
  "Honky Tonk", "Outlaw Country", "Alt-Country", "Country Rock", "Country Pop",
  "Bro-Country", "Traditional Country", "Western Swing",
  
  // Punk Subgenres
  "Punk", "Hardcore Punk", "Pop Punk", "Post-Hardcore", "Emo", "Screamo", "Ska Punk",
  "Crust Punk", "Street Punk", "Anarcho-Punk", "Horror Punk", "Melodic Hardcore",
  
  // Specialty/Niche
  "Chiptune", "Vaporwave", "Lo-Fi", "Field Recording", "Sound Art", "Drone", "Dark Ambient",
  "Breakcore", "Acid", "Gabber", "Speedcore", "Witch House", "Seapunk", "Future Funk",
  
  // Regional/Cultural
  "Afrobeats", "Mbalax", "Rai", "Chaabi", "Gnawa", "Sertanejo", "Forró", "Axé", "Pagode",
  "Samba", "Choro", "MPB", "Tropicália", "Nueva Canción", "Bolero", "Bachata", "Merengue",
  "Vallenato", "Norteño", "Banda", "Corrido", "Ranchera"
];


/**
 * Popular genres shown first in UI
 */
export const POPULAR_GENRES: string[] = [
  "Pop", "Rock", "Hip Hop", "Electronic", "R&B", "Country", "Jazz", "Blues", "Classical",
  "Alternative", "Indie", "Punk", "Metal", "Folk", "Reggae", "Soul", "Funk", "EDM", "House", "Techno",
  "Rap", "Latin", "World", "Ambient", "Experimental"
];

/**
 * Genre configuration object
 */
export const GENRE_CONFIG: GenreConfiguration = {
  popularGenres: POPULAR_GENRES,
  allGenres: COMPREHENSIVE_GENRES,
  customGenres: [] // Will be populated from storage
};

/**
 * Local storage key for custom genres
 */
const CUSTOM_GENRES_STORAGE_KEY = 'tsunami_custom_genres';

/**
 * Language utility functions
 */

/**
 * Validates if a language code is a valid ISO 639-1 code
 */
export function validateLanguageCode(code: string | null | undefined): boolean {
  if (code === null || code === undefined) return true;
  return typeof code === 'string' && /^[a-z]{2}$/.test(code);
}

/**
 * Gets the display name for a language code
 */
export function getLanguageName(code: string | null | undefined): string {
  if (code === null || code === undefined) return "None (Instrumental)";
  const language = ALL_LANGUAGES.find(lang => lang.code === code);
  return language?.name || code.toUpperCase();
}

/**
 * Gets a language option by code
 */
export function getLanguageByCode(code: string | null | undefined): LanguageOption | undefined {
  return ALL_LANGUAGES.find(lang => lang.code === code);
}

/**
 * Filters languages by search query
 */
export function filterLanguages(query: string): LanguageOption[] {
  if (!query.trim()) return ALL_LANGUAGES;
  const lowerQuery = query.toLowerCase().trim();
  return ALL_LANGUAGES.filter(lang => 
    lang.name.toLowerCase().includes(lowerQuery) ||
    (lang.code && lang.code.toLowerCase().includes(lowerQuery))
  );
}

/**
 * Genre utility functions
 */

/**
 * Validates if a genre string is valid
 */
export function validateGenre(genre: string | null | undefined): boolean {
  if (genre === null || genre === undefined) return true;
  return typeof genre === 'string' && genre.trim().length > 0;
}

/**
 * Gets all genres including custom ones
 */
export function getAllGenres(): string[] {
  const customGenres = loadCustomGenres();
  const allGenres = [...COMPREHENSIVE_GENRES];
  
  // Add custom genres that aren't already in the list
  customGenres.forEach(genre => {
    if (!allGenres.some(g => g.toLowerCase() === genre.toLowerCase())) {
      allGenres.push(genre);
    }
  });
  
  return allGenres.sort((a, b) => a.localeCompare(b));
}

/**
 * Filters genres by search query
 */
export function filterGenres(query: string, includeCustom: boolean = true): string[] {
  const allGenres = includeCustom ? getAllGenres() : COMPREHENSIVE_GENRES;
  
  if (!query.trim()) {
    // Return popular genres first, then the rest alphabetically
    const popular = POPULAR_GENRES.filter(g => allGenres.includes(g));
    const rest = allGenres.filter(g => !POPULAR_GENRES.includes(g)).sort();
    return [...popular, ...rest];
  }
  
  const lowerQuery = query.toLowerCase().trim();
  
  // Score-based filtering for better search results
  const scored = allGenres.map(genre => {
    const lowerGenre = genre.toLowerCase();
    let score = 0;
    
    // Exact match
    if (lowerGenre === lowerQuery) score = 100;
    // Starts with query
    else if (lowerGenre.startsWith(lowerQuery)) score = 80;
    // Word starts with query
    else if (lowerGenre.split(/\s+/).some(word => word.startsWith(lowerQuery))) score = 60;
    // Contains query
    else if (lowerGenre.includes(lowerQuery)) score = 40;
    // No match
    else score = 0;
    
    // Boost popular genres
    if (POPULAR_GENRES.includes(genre)) score += 10;
    
    return { genre, score };
  });
  
  return scored
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score || a.genre.localeCompare(b.genre))
    .map(item => item.genre);
}

/**
 * Custom genre storage functions
 */

/**
 * Loads custom genres from local storage
 */
export function loadCustomGenres(): string[] {
  try {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem(CUSTOM_GENRES_STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed.filter(g => typeof g === 'string' && g.trim()) : [];
  } catch {
    return [];
  }
}

/**
 * Saves a custom genre to local storage
 */
export function saveCustomGenre(genre: string): boolean {
  try {
    if (typeof window === 'undefined') return false;
    if (!genre.trim()) return false;
    
    const trimmedGenre = genre.trim();
    const customGenres = loadCustomGenres();
    
    // Check for duplicates (case-insensitive)
    if (customGenres.some(g => g.toLowerCase() === trimmedGenre.toLowerCase())) {
      return false;
    }
    
    // Check if it already exists in the comprehensive list
    if (COMPREHENSIVE_GENRES.some(g => g.toLowerCase() === trimmedGenre.toLowerCase())) {
      return false;
    }
    
    customGenres.push(trimmedGenre);
    localStorage.setItem(CUSTOM_GENRES_STORAGE_KEY, JSON.stringify(customGenres));
    return true;
  } catch {
    return false;
  }
}

/**
 * Removes a custom genre from local storage
 */
export function removeCustomGenre(genre: string): boolean {
  try {
    if (typeof window === 'undefined') return false;
    
    const customGenres = loadCustomGenres();
    const index = customGenres.findIndex(g => g.toLowerCase() === genre.toLowerCase());
    
    if (index === -1) return false;
    
    customGenres.splice(index, 1);
    localStorage.setItem(CUSTOM_GENRES_STORAGE_KEY, JSON.stringify(customGenres));
    return true;
  } catch {
    return false;
  }
}

/**
 * Checks if a genre is a custom genre
 */
export function isCustomGenre(genre: string): boolean {
  return loadCustomGenres().some(g => g.toLowerCase() === genre.toLowerCase());
}

/**
 * Gets genre suggestions based on partial input
 */
export function getGenreSuggestions(input: string, limit: number = 10): string[] {
  return filterGenres(input).slice(0, limit);
}

/**
 * Gets language suggestions based on partial input
 */
export function getLanguageSuggestions(input: string, limit: number = 10): LanguageOption[] {
  return filterLanguages(input).slice(0, limit);
}
