---
inclusion: always
---

# Dark Theme Development Guidelines

This application enforces dark theme only. All UI components must be designed and implemented with dark theme compatibility in mind.

## Core Principles

### 1. Use Semantic Color Tokens
Always use Tailwind's semantic color classes instead of hardcoded gray values:

**✅ CORRECT:**
```tsx
<h1 className="text-foreground">Title</h1>
<p className="text-muted-foreground">Description</p>
<div className="bg-muted">Background</div>
<div className="border-border">Border</div>
```

**❌ INCORRECT:**
```tsx
<h1 className="text-gray-900">Title</h1>
<p className="text-gray-600">Description</p>
<div className="bg-gray-100">Background</div>
<div className="border-gray-300">Border</div>
```

### 2. Color Mapping Reference

| Hardcoded Color | Semantic Replacement | Use Case |
|----------------|---------------------|----------|
| `text-gray-900` | `text-foreground` | Primary text, headings |
| `text-gray-800` | `text-foreground` | Strong text |
| `text-gray-700` | `text-foreground` | Form labels, buttons |
| `text-gray-600` | `text-muted-foreground` | Secondary text, descriptions |
| `text-gray-500` | `text-muted-foreground` | Muted text, metadata |
| `text-gray-400` | `text-muted-foreground` | Icons, subtle text |
| `text-gray-300` | `text-muted-foreground/50` | Very subtle elements |
| `bg-gray-100` | `bg-muted` | Card backgrounds, input fields |
| `bg-gray-50` | `bg-muted/30` | Subtle hover states |
| `bg-gray-200` | `bg-muted` | Skeleton loaders |
| `border-gray-300` | `border-muted-foreground/30` | Dashed borders |
| `border-gray-200` | `border-border` | Standard borders |

### 3. Interactive States

For hover and focus states, use opacity modifiers:

```tsx
// Hover states
<div className="hover:bg-muted/50">
<button className="hover:text-foreground">

// Focus states  
<input className="focus:ring-ring focus:border-ring">

// Disabled states
<button className="disabled:text-muted-foreground/50">
```

### 4. Upload Areas and File Inputs

Upload areas require special attention for dark theme:

```tsx
// Dashed border upload area
<div className="border-2 border-dashed border-muted-foreground/30 hover:border-muted-foreground/50 hover:bg-muted/30">
  <Upload className="text-muted-foreground" />
  <p className="text-muted-foreground">Upload file</p>
</div>

// Upload button overlay
<div className="bg-background/90 hover:bg-background">
  <Upload className="text-foreground" />
  <span className="text-foreground">Change</span>
</div>
```

### 5. Loading and Empty States

Use semantic colors for consistent theming:

```tsx
// Skeleton loaders
<div className="animate-pulse">
  <div className="h-4 bg-muted rounded w-3/4"></div>
  <div className="h-3 bg-muted rounded w-1/2"></div>
</div>

// Empty state icons
<Music className="w-16 h-16 text-muted-foreground/50" />
<h3 className="text-foreground">No items found</h3>
<p className="text-muted-foreground">Description text</p>
```

## CSS Variables Available

The application uses these CSS variables for theming:

```css
--background: 210 10% 8%;           /* Main background */
--foreground: 210 40% 98%;          /* Primary text */
--card: 210 10% 10%;                /* Card backgrounds */
--card-foreground: 210 40% 98%;     /* Card text */
--muted: 210 10% 15%;               /* Muted backgrounds */
--muted-foreground: 215 20% 65%;    /* Muted text */
--border: 217 32% 18%;              /* Standard borders */
--input: 217 32% 18%;               /* Input backgrounds */
--primary: 187 85% 48%;             /* Primary brand color */
--accent: 187 85% 48%;              /* Accent color */
```

## Common Patterns

### Form Elements
```tsx
<FormLabel className="text-base font-semibold">Label</FormLabel>
<Input className="bg-input border-border text-foreground" />
<FormMessage className="text-destructive" />
```

### Card Components
```tsx
<Card className="bg-card border-border">
  <CardHeader>
    <CardTitle className="text-card-foreground">Title</CardTitle>
  </CardHeader>
  <CardContent className="text-muted-foreground">
    Content
  </CardContent>
</Card>
```

### Search and Filter UI
```tsx
<div className="relative">
  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
  <Input placeholder="Search..." className="pl-10" />
</div>
```

## Testing Dark Theme

When implementing components:

1. **Visual Check**: Ensure all text is readable against dark backgrounds
2. **Contrast**: Verify sufficient contrast ratios (4.5:1 minimum for normal text)
3. **Interactive States**: Test hover, focus, and disabled states
4. **Consistency**: Match the existing design system patterns

## Migration Checklist

When fixing existing components:

- [ ] Replace all `text-gray-*` with semantic equivalents
- [ ] Replace all `bg-gray-*` with semantic equivalents  
- [ ] Replace all `border-gray-*` with semantic equivalents
- [ ] Update hover states to use opacity modifiers
- [ ] Test upload areas and file inputs
- [ ] Verify loading states and skeletons
- [ ] Check empty states and error messages
- [ ] Ensure icons use appropriate muted colors

## Tools and Commands

Use these commands to find hardcoded colors:

```bash
# Find hardcoded gray colors
grep -r "text-gray-[0-9]" src/
grep -r "bg-gray-[0-9]" src/
grep -r "border-gray-[0-9]" src/

# Search in specific file types
find src/ -name "*.tsx" -exec grep -l "text-gray-" {} \;
```