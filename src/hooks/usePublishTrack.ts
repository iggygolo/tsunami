/**
 * Simplified hook for publishing individual tracks
 * This is an alias for usePublishMusicTrack to match the design document naming
 */
export { 
  usePublishMusicTrack as usePublishTrack,
  useUpdateMusicTrack as useUpdateTrack,
  useDeleteMusicTrack as useDeleteTrack
} from './usePublishMusicTrack';