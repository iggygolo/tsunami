import { useMemo } from 'react';

export function useFormatDuration() {
  return useMemo(() => {
    const formatDuration = (seconds?: number): string => {
      if (!seconds || !isFinite(seconds)) return '--:--';

      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const secs = Math.floor(seconds % 60);

      if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
      }
      return `${minutes}:${secs.toString().padStart(2, '0')}`;
    };

    const formatDurationLong = (seconds?: number): string => {
      if (!seconds || !isFinite(seconds)) return '0 seconds';

      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const secs = Math.floor(seconds % 60);

      const parts: string[] = [];
      
      if (hours > 0) {
        parts.push(`${hours} hour${hours !== 1 ? 's' : ''}`);
      }
      if (minutes > 0) {
        parts.push(`${minutes} minute${minutes !== 1 ? 's' : ''}`);
      }
      if (secs > 0 && hours === 0) { // Only show seconds if no hours
        parts.push(`${secs} second${secs !== 1 ? 's' : ''}`);
      }

      return parts.join(', ') || '0 seconds';
    };

    return { formatDuration, formatDurationLong };
  }, []);
}