# Strict Layout System

This project uses a strict layout system that enforces consistent content width across all pages on large desktop screens.

## Layout Component

The `Layout` component automatically applies a standardized container to all content:

```tsx
interface LayoutProps {
  children: ReactNode;
}
```

**All content is automatically constrained to `max-w-6xl` (1152px) with proper centering and padding.**

## Container Structure

Every page using `Layout` gets this structure automatically:

```html
<div class="min-h-screen bg-background">
  <Navigation />
  <main class="flex-1">
    <div class="container mx-auto px-4">
      <div class="max-w-6xl mx-auto">
        <!-- Your page content here -->
      </div>
    </div>
  </main>
  <Footer />
</div>
```

## Usage

### Standard Page (All pages use this)
```tsx
export function MyPage() {
  return (
    <Layout>
      <div className="py-8">
        <h1>My Page</h1>
        <p>Content is automatically constrained to max-w-6xl</p>
      </div>
    </Layout>
  );
}
```

### Full-width sections within the container
For sections that need to break out of the content width (like hero backgrounds), use negative margins:

```tsx
export function PageWithHero() {
  return (
    <Layout>
      {/* Hero section that breaks out to full container width */}
      <div className="relative -mx-4 px-4 py-12 bg-gradient-to-r from-blue-500 to-purple-600">
        <h1>Hero Section</h1>
        <p>This spans the full container width but content stays centered</p>
      </div>
      
      {/* Regular content */}
      <div className="py-8">
        <p>This follows the standard content width</p>
      </div>
    </Layout>
  );
}
```

## Benefits

1. **Absolute Consistency**: Every page has exactly the same content width
2. **No Flexibility Issues**: Developers can't accidentally create inconsistent layouts
3. **Simplified Development**: No decisions needed about container sizes
4. **Maintainable**: Change the width standard in one place
5. **Predictable**: All content follows the same width rules

## Rules

- **Always use `<Layout>`** for page components
- **No custom container logic** - the layout handles it automatically  
- **Use negative margins (`-mx-4 px-4`)** for full-width sections within pages
- **Content width is always `max-w-6xl`** - no exceptions

## Migration

All pages now use the strict layout:
- Removed `containerSize` and `noContainer` props
- All pages automatically get `max-w-6xl` content width
- Custom layouts adapted to work within the container using negative margins

This ensures perfect consistency across the entire application with zero flexibility for inconsistent layouts.