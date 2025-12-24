import { useState, useCallback } from 'react';
import { useMusicTracks } from '@/hooks/useMusicTracks';
import type { TrackReference, MusicTrackData } from '@/types/music';
import { MUSIC_KINDS } from '@/lib/musicConfig';

/**
 * Hook for managing track selection in playlist creation/editing
 */
export function useTrackSelection(initialTracks: TrackReference[] = []) {
  const [selectedTracks, setSelectedTracks] = useState<TrackReference[]>(initialTracks);
  const { data: availableTracks, isLoading } = useMusicTracks();

  /**
   * Add a track to the selection
   */
  const addTrack = useCallback((track: MusicTrackData | TrackReference) => {
    let trackRef: TrackReference;
    
    if ('kind' in track && track.kind === MUSIC_KINDS.MUSIC_TRACK) {
      // It's already a TrackReference
      trackRef = track as TrackReference;
    } else {
      // It's a MusicTrackData, convert to TrackReference
      const musicTrack = track as MusicTrackData;
      trackRef = {
        kind: MUSIC_KINDS.MUSIC_TRACK,
        pubkey: musicTrack.artistPubkey || '',
        identifier: musicTrack.identifier,
        title: musicTrack.title,
        artist: musicTrack.artist
      };
    }

    setSelectedTracks(prev => {
      // Check if track is already selected
      const exists = prev.some(t => 
        t.pubkey === trackRef.pubkey && t.identifier === trackRef.identifier
      );
      
      if (exists) return prev;
      
      return [...prev, trackRef];
    });
  }, []);

  /**
   * Remove a track from the selection by index
   */
  const removeTrack = useCallback((index: number) => {
    setSelectedTracks(prev => prev.filter((_, i) => i !== index));
  }, []);

  /**
   * Remove a track from the selection by reference
   */
  const removeTrackByRef = useCallback((pubkey: string, identifier: string) => {
    setSelectedTracks(prev => 
      prev.filter(track => !(track.pubkey === pubkey && track.identifier === identifier))
    );
  }, []);

  /**
   * Move a track to a different position
   */
  const moveTrack = useCallback((fromIndex: number, toIndex: number) => {
    setSelectedTracks(prev => {
      if (fromIndex < 0 || fromIndex >= prev.length || 
          toIndex < 0 || toIndex >= prev.length || 
          fromIndex === toIndex) {
        return prev;
      }

      const newTracks = [...prev];
      const [movedTrack] = newTracks.splice(fromIndex, 1);
      newTracks.splice(toIndex, 0, movedTrack);
      
      return newTracks;
    });
  }, []);

  /**
   * Clear all selected tracks
   */
  const clearSelection = useCallback(() => {
    setSelectedTracks([]);
  }, []);

  /**
   * Set the entire track selection
   */
  const setTracks = useCallback((tracks: TrackReference[]) => {
    setSelectedTracks(tracks);
  }, []);

  /**
   * Check if a track is selected
   */
  const isTrackSelected = useCallback((pubkey: string, identifier: string) => {
    return selectedTracks.some(track => 
      track.pubkey === pubkey && track.identifier === identifier
    );
  }, [selectedTracks]);

  /**
   * Get available tracks that aren't already selected
   */
  const getAvailableTracks = useCallback(() => {
    if (!availableTracks) return [];
    
    return availableTracks.filter(track => 
      !isTrackSelected(track.artistPubkey || '', track.identifier)
    );
  }, [availableTracks, isTrackSelected]);

  /**
   * Add multiple tracks at once
   */
  const addMultipleTracks = useCallback((tracks: (MusicTrackData | TrackReference)[]) => {
    const trackRefs: TrackReference[] = tracks.map(track => {
      if ('kind' in track && track.kind === MUSIC_KINDS.MUSIC_TRACK) {
        // It's already a TrackReference
        return track as TrackReference;
      } else {
        // It's a MusicTrackData, convert to TrackReference
        const musicTrack = track as MusicTrackData;
        return {
          kind: MUSIC_KINDS.MUSIC_TRACK,
          pubkey: musicTrack.artistPubkey || '',
          identifier: musicTrack.identifier,
          title: musicTrack.title,
          artist: musicTrack.artist
        };
      }
    });

    setSelectedTracks(prev => {
      const newTracks = [...prev];
      
      for (const trackRef of trackRefs) {
        // Check if track is already selected
        const exists = newTracks.some(t => 
          t.pubkey === trackRef.pubkey && t.identifier === trackRef.identifier
        );
        
        if (!exists) {
          newTracks.push(trackRef);
        }
      }
      
      return newTracks;
    });
  }, []);

  /**
   * Get track selection statistics
   */
  const getSelectionStats = useCallback(() => {
    const totalTracks = selectedTracks.length;
    const uniqueArtists = new Set(selectedTracks.map(track => track.pubkey)).size;
    
    return {
      totalTracks,
      uniqueArtists,
      isEmpty: totalTracks === 0
    };
  }, [selectedTracks]);

  return {
    selectedTracks,
    availableTracks: getAvailableTracks(),
    isLoading,
    addTrack,
    removeTrack,
    removeTrackByRef,
    moveTrack,
    clearSelection,
    setTracks,
    isTrackSelected,
    addMultipleTracks,
    getSelectionStats
  };
}

/**
 * Hook for managing track search and filtering
 */
export function useTrackSearch() {
  const [searchQuery, setSearchQuery] = useState('');
  const [genreFilter, setGenreFilter] = useState<string>('');
  const { data: allTracks } = useMusicTracks();

  const filteredTracks = useCallback(() => {
    if (!allTracks) return [];

    let filtered = allTracks;

    // Apply search query filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(track => 
        track.title.toLowerCase().includes(query) ||
        track.artist.toLowerCase().includes(query) ||
        track.album?.toLowerCase().includes(query)
      );
    }

    // Apply genre filter
    if (genreFilter) {
      filtered = filtered.filter(track => 
        track.genres?.some(genre => 
          genre.toLowerCase() === genreFilter.toLowerCase()
        )
      );
    }

    return filtered;
  }, [allTracks, searchQuery, genreFilter]);

  const availableGenres = useCallback(() => {
    if (!allTracks) return [];

    const genres = new Set<string>();
    for (const track of allTracks) {
      if (track.genres) {
        for (const genre of track.genres) {
          genres.add(genre);
        }
      }
    }

    return Array.from(genres).sort();
  }, [allTracks]);

  return {
    searchQuery,
    setSearchQuery,
    genreFilter,
    setGenreFilter,
    filteredTracks: filteredTracks(),
    availableGenres: availableGenres(),
    clearFilters: () => {
      setSearchQuery('');
      setGenreFilter('');
    }
  };
}