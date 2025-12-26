# Social Interaction Color Guidelines

This document defines the standardized color system for social interaction buttons across the Tsunami music application. These guidelines ensure consistent visual language and intuitive user experience.

## Color System Overview

The social interaction color system uses semantic color families that align with user expectations and psychological associations. All colors are designed for dark theme compatibility with proper contrast ratios.

## Core Color Families

### 🟡 Yellow/Gold - Lightning/Energy Actions
**Primary Use**: Zap buttons, Lightning payments, energy-related actions

**Color Values**:
- Base State: `bg-black/30 border-white/20 text-white`
- Hover State: `bg-yellow-500/20 border-yellow-400/40 text-yellow-300`
- Active State: `bg-yellow-500/30 border-yellow-400/50 text-yellow-200`

**Psychology**: Energy, electricity, Bitcoin Lightning Network, monetary value
**Usage Examples**: Zap buttons, tip buttons, Lightning payment triggers

### 🔴 Red - Love/Appreciation Actions
**Primary Use**: Like buttons, heart actions, favorites, appreciation

**Color Values**:
- Base State: `bg-black/30 border-white/20 text-white`
- Hover State: `bg-red-500/20 border-red-400/40 text-red-300`
- Active/Liked State: `text-red-500 bg-red-500/10 border-red-400/30`

**Psychology**: Love, passion, positive engagement, emotional connection
**Usage Examples**: Like buttons, favorite buttons, heart reactions, appreciation actions

### 🔵 Cyan/Aqua - Communication/Sharing Actions
**Primary Use**: Share buttons, communication, distribution actions

**Color Values**:
- Base State: `bg-black/30 border-white/20 text-white`
- Hover State: `bg-cyan-500/20 border-cyan-400/40 text-cyan-300`
- Active State: `bg-cyan-500/30 border-cyan-400/50 text-cyan-200`

**Psychology**: Communication, sharing, digital connectivity, social distribution
**Usage Examples**: Share buttons, export actions, social media sharing, distribution

## Implementation Guidelines

### Base Button Structure
All social interaction buttons should follow this base structure:

```tsx
<Button
  size="sm"
  variant="ghost"
  className="w-10 h-10 p-0 rounded-full bg-black/30 border border-white/20 text-white backdrop-blur-xl transition-all duration-200 shadow-lg"
>
  <Icon className="w-4 h-4" />
</Button>
```

### Hover State Implementation
Add hover colors using the appropriate family:

```tsx
// Yellow/Gold (Zap)
className="... hover:bg-yellow-500/20 hover:border-yellow-400/40 hover:text-yellow-300"

// Red (Like)
className="... hover:bg-red-500/20 hover:border-red-400/40 hover:text-red-300"

// Cyan (Share)
className="... hover:bg-cyan-500/20 hover:border-cyan-400/40 hover:text-cyan-300"
```

### Active State Implementation
For buttons with active/selected states (like "liked" buttons):

```tsx
className={cn(
  "base-classes hover:bg-red-500/20 hover:border-red-400/40 hover:text-red-300",
  isActive && "text-red-500 bg-red-500/10 border-red-400/30"
)}
```

## Design Principles

### 1. Opacity-Based Effects
- Use Tailwind opacity modifiers (`/10`, `/20`, `/30`, `/40`, `/50`) for subtle effects
- Lower opacity for backgrounds, higher for borders and text
- Maintains dark theme compatibility

### 2. Smooth Transitions
- Always include `transition-all duration-200` for smooth color changes
- Consistent timing across all interaction buttons
- Enhances perceived responsiveness

### 3. Glass Morphism Integration
- Use `backdrop-blur-xl` for modern glass effects
- Combine with semi-transparent backgrounds
- Maintains visual hierarchy in complex layouts

### 4. Semantic Consistency
- Yellow = Energy/Money (Lightning, Bitcoin, payments)
- Red = Emotion/Love (likes, hearts, favorites)
- Cyan = Communication (sharing, social, distribution)

## Component Examples

### Zap Button (Lightning Payments)
```tsx
<Button
  className="w-10 h-10 p-0 rounded-full bg-black/30 border border-white/20 text-white backdrop-blur-xl hover:bg-yellow-500/20 hover:border-yellow-400/40 hover:text-yellow-300 transition-all duration-200 shadow-lg"
>
  <Zap className="w-4 h-4" />
</Button>
```

### Like Button (Appreciation)
```tsx
<Button
  className={cn(
    "w-10 h-10 p-0 rounded-full bg-black/30 border border-white/20 text-white backdrop-blur-xl hover:bg-red-500/20 hover:border-red-400/40 hover:text-red-300 transition-all duration-200 shadow-lg",
    isLiked && "text-red-500 bg-red-500/10 border-red-400/30"
  )}
>
  <Heart className={cn("w-4 h-4", isLiked && "fill-current")} />
</Button>
```

### Share Button (Distribution)
```tsx
<Button
  className="w-10 h-10 p-0 rounded-full bg-black/30 border border-white/20 text-white backdrop-blur-xl hover:bg-cyan-500/20 hover:border-cyan-400/40 hover:text-cyan-300 transition-all duration-200 shadow-lg"
>
  <Share className="w-4 h-4" />
</Button>
```

## Accessibility Considerations

### Contrast Ratios
- All color combinations maintain WCAG AA compliance (4.5:1 minimum)
- Hover states provide sufficient contrast against dark backgrounds
- Active states are clearly distinguishable from inactive states

### Color Blindness Support
- Color is not the only indicator of state (icons and positioning also convey meaning)
- High contrast ensures visibility across different types of color vision
- Semantic associations (red=heart, yellow=lightning) provide additional context

## Usage in Different Contexts

### Music Player Controls
- Zap: Tip the artist for the current track
- Like: Add to favorites/express appreciation
- Share: Share track on social media

### Release/Album Pages
- Zap: Support the artist financially
- Like: Add release to favorites
- Share: Share album with friends

### Profile Pages
- Zap: Tip the artist directly
- Like: Follow/appreciate the artist
- Share: Share artist profile

## Migration Guidelines

When updating existing components to use this color system:

1. **Identify the action type**: Is it payment (yellow), appreciation (red), or sharing (cyan)?
2. **Apply base structure**: Use the standard button base classes
3. **Add appropriate hover colors**: Use the correct color family
4. **Implement active states**: For stateful buttons (like/unlike)
5. **Test accessibility**: Ensure proper contrast and usability
6. **Maintain consistency**: Follow the same patterns across similar components

## Future Extensions

This color system can be extended for additional interaction types:

- **Green**: Success actions, confirmations, positive feedback
- **Orange**: Warning actions, important notifications
- **Purple**: Premium features, special actions
- **Blue**: Information, help, secondary actions

When adding new colors, maintain the same opacity-based approach and ensure dark theme compatibility.