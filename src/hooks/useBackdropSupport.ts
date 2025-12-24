import { useState, useEffect } from 'react';

/**
 * Hook to detect if the browser supports backdrop-filter CSS property
 * Provides fallback detection for glass morphism effects
 */
export function useBackdropSupport() {
  const [supportsBackdrop, setSupportsBackdrop] = useState<boolean | null>(null);

  useEffect(() => {
    // Check if backdrop-filter is supported
    const testElement = document.createElement('div');
    const style = testElement.style as any; // Type assertion for webkit properties
    
    // Test standard backdrop-filter
    style.backdropFilter = 'blur(1px)';
    const supportsBackdropFilter = style.backdropFilter !== '';
    
    // Also check webkit prefix
    if (!supportsBackdropFilter) {
      style.webkitBackdropFilter = 'blur(1px)';
      const supportsWebkitBackdrop = style.webkitBackdropFilter !== '';
      setSupportsBackdrop(supportsWebkitBackdrop);
    } else {
      setSupportsBackdrop(true);
    }

    // Clean up
    testElement.remove();
  }, []);

  return supportsBackdrop;
}

/**
 * Hook to get appropriate glass effect class names based on browser support
 */
export function useGlassEffect() {
  const supportsBackdrop = useBackdropSupport();

  const getGlassClass = (baseClass: string = 'player-glass') => {
    if (supportsBackdrop === null) {
      // Loading state - use base class
      return baseClass;
    }
    
    if (supportsBackdrop) {
      return baseClass;
    } else {
      // No backdrop support - add fallback class
      return `${baseClass} no-backdrop-support`;
    }
  };

  return {
    supportsBackdrop,
    getGlassClass,
    isLoading: supportsBackdrop === null
  };
}