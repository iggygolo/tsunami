# Glass Components Guide

This document explains the new glass morphism components created for consistent styling across the application.

## Overview

The glass components provide a unified design system with consistent glass morphism effects, following the design patterns established in the ProfilePage and now applied to the ReleasePage.

## Components

### GlassTabs

A wrapper around the standard Tabs component with glass morphism styling.

```tsx
import { GlassTabs, GlassTabsList, GlassTabsTrigger, GlassTabsContent } from '@/components/ui/GlassTabs';

<GlassTabs defaultValue="tracks" value={activeTab} onValueChange={setActiveTab}>
  <GlassTabsList>
    <GlassTabsTrigger 
      value="tracks"
      icon={<Music className="w-3 h-3" />}
      count={tracks.length}
    >
      Tracks
    </GlassTabsTrigger>
  </GlassTabsList>
  
  <GlassTabsContent value="tracks">
    {/* Content */}
  </GlassTabsContent>
</GlassTabs>
```

#### Features:
- **Glass morphism styling**: Transparent backgrounds with backdrop blur
- **Icon support**: Optional icons for tab triggers
- **Count badges**: Automatic count display with styling
- **Hover effects**: Smooth transitions and interactive states

### GlassList

Components for creating consistent list layouts with glass effects.

```tsx
import { GlassList, GlassListItem, GlassListEmptyState, GlassListSkeleton } from '@/components/ui/GlassList';

<GlassList>
  <GlassListItem>
    <div className="w-10 h-10 rounded-lg overflow-hidden bg-white/10">
      <img src={item.image} alt={item.title} />
    </div>
    <div className="flex-1 min-w-0">
      <h3 className="text-white font-medium truncate text-sm">{item.title}</h3>
      <p className="text-white/70 text-xs truncate">{item.subtitle}</p>
    </div>
    <div className="flex items-center gap-1">
      {/* Action buttons */}
    </div>
  </GlassListItem>
</GlassList>
```

#### Components:
- **GlassList**: Container with consistent spacing
- **GlassListItem**: Individual list items with hover effects
- **GlassListEmptyState**: Styled empty state with icon and text
- **GlassListSkeleton**: Loading skeleton with glass styling

## Design System

### Color Palette
- **Background**: `bg-black/30` with `border-white/20`
- **Active states**: `bg-white/15` with `border-white/30`
- **Hover states**: `bg-black/40` with `border-white/30`
- **Text**: `text-white` with various opacity levels

### Effects
- **Backdrop blur**: `backdrop-blur-xl`
- **Shadows**: `shadow-lg` for depth
- **Transitions**: `transition-all duration-200` for smooth interactions
- **Rounded corners**: `rounded-lg` or `rounded-full` for buttons

### Typography
- **Primary text**: `text-white font-medium`
- **Secondary text**: `text-white/70 text-xs`
- **Muted text**: `text-white/50`

## Usage Patterns

### Page Layout
Both ProfilePage and ReleasePage now follow this pattern:

1. **BlurredBackground**: Dynamic background based on content image
2. **Header section**: Large image + content info + action buttons
3. **Glass tabs**: Navigation with counts and icons
4. **Content sections**: Consistent glass containers

### Responsive Design
- **Mobile**: Stacked layout with adjusted spacing
- **Desktop**: Side-by-side layout with larger elements
- **Consistent**: Same glass effects across all screen sizes

## Implementation Examples

### ProfilePage
- Uses GlassTabs for Tracks/Playlists navigation
- GlassList for track and playlist items
- Consistent action buttons (play, zap, repost)

### ReleasePage
- Matches ProfilePage styling approach
- Uses same glass components for consistency
- Maintains existing functionality with improved visuals

## Benefits

1. **Consistency**: Unified design language across pages
2. **Maintainability**: Reusable components reduce code duplication
3. **Accessibility**: Consistent focus states and interactions
4. **Performance**: Optimized CSS with shared classes
5. **Flexibility**: Components accept custom styling via className props

## Future Usage

These components can be used in other parts of the application:
- Community page lists
- Search results
- Settings panels
- Any tabbed interface requiring glass morphism styling

The glass components provide a solid foundation for maintaining visual consistency while allowing for customization when needed.