/**
 * Simplified hook for publishing playlists
 * This is an alias for usePublishMusicPlaylist to match the design document naming
 */
export { 
  usePublishMusicPlaylist as usePublishPlaylist,
  useUpdateMusicPlaylist as useUpdatePlaylist,
  useDeleteMusicPlaylist as useDeletePlaylist,
  useAddTracksToPlaylist,
  useRemoveTracksFromPlaylist,
  useReorderPlaylistTracks
} from './usePublishMusicPlaylist';