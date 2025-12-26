# Tsunami - Decentralized Music Platform

Tsunami is a decentralized music platform built on Nostr where artists publish music directly to the decentralized web and fans support them via Lightning payments.

## Tech Stack

- **React 18 + TypeScript**: Modern React with full type safety
- **TailwindCSS**: Dark theme only with semantic color tokens
- **Nostrify**: Nostr protocol integration
- **TanStack Query**: Data fetching and caching
- **shadcn/ui**: Accessible UI components
- **Lightning/WebLN**: Bitcoin payments
- **Blossom**: Decentralized file storage

## Core Features

### Music Platform
- **Audio Playback**: Universal player with release/track playback
- **Artist Studio**: Track/playlist creation, metadata editing, file uploads
- **Discovery**: Browse releases, trending tracks, artist profiles
- **Social**: Lightning zaps, comments (NIP-22), reactions (NIP-25)

### Nostr Integration
- **Custom Events**: Kind 36787 (tracks), Kind 34139 (playlists)
- **NIP-19 Routing**: Direct links via `naddr1`, `npub1` identifiers
- **Event Validation**: Comprehensive validation and conversion system
- **RSS Feeds**: Individual artist RSS feeds (orange theme)

## Key Components & Hooks

### Essential Hooks
```typescript
// Music data
const { data: tracks } = useMusicTracks({ limit: 20 });
const { data: release } = useReleaseData({ eventId: 'abc123' });

// Nostr integration  
const { nostr } = useNostr(); // Query and publish events
const { user } = useCurrentUser(); // Logged-in user
const { mutate: createEvent } = useNostrPublish();

// Audio playback
const trackPlayback = useUniversalTrackPlayback(release);

// Lightning payments
const { mutateAsync: sendZap } = useZaps();
```

### Music Event Types
```typescript
// Music Track (Kind 36787)
{
  kind: 36787,
  content: "Lyrics and credits",
  tags: [
    ['d', 'track-id'],
    ['title', 'Track Title'],
    ['artist', 'Artist Name'],
    ['url', 'https://audio-url.mp3'],
    ['t', 'music'],
    ['album', 'Album Name'],
    ['duration', '245']
  ]
}

// Music Playlist (Kind 34139)  
{
  kind: 34139,
  content: "Release description",
  tags: [
    ['d', 'playlist-id'],
    ['title', 'Album Title'],
    ['a', '36787:pubkey:track-id'], // Track references
    ['t', 'playlist']
  ]
}
```

## UI Components & Design System

The project uses shadcn/ui components located in `@/components/ui`. These are accessible components built with Radix UI and styled with Tailwind CSS. **The application enforces dark theme only** for consistent user experience.

### Available Components
Standard shadcn/ui components including Button, Card, Dialog, Form, Input, Select, Table, Toast, and others. All components follow dark theme patterns with semantic color tokens.

### Design Principles

- **Dark Theme Only**: All components designed for dark backgrounds with proper contrast
- **Semantic Colors**: Use semantic color tokens (`text-foreground`, `bg-muted`, etc.) instead of hardcoded grays
- **Glass Morphism**: Modern glass effects with `backdrop-blur-xl` and semi-transparent backgrounds
- **Social Interaction Colors**: Standardized color system for social buttons:
  - **Orange**: RSS feeds and content syndication
  - **Yellow/Gold**: Lightning payments and zaps (energy/money)
  - **Red**: Likes, hearts, and appreciation actions
  - **Cyan**: Sharing and communication actions
- **Accessibility**: WCAG AA compliance with proper contrast ratios
- **Responsive Design**: Mobile-first approach with Tailwind breakpoints

### Available UI Components

These components follow a consistent pattern using React's `forwardRef` and use the `cn()` utility for class name merging. All components are optimized for dark theme with semantic color tokens.

### Music-Specific Components

#### Audio Components (`/src/components/audio/`)
- **PersistentAudioPlayer**: Global audio player that persists across navigation
- **TrackControls**: Play/pause, seek, volume controls for individual tracks

#### Music Components (`/src/components/music/`)
- **ReleaseList**: Grid/list view of music releases with filtering
- **TrackList**: Display tracks with playback controls and metadata
- **ReleaseCard**: Individual release display with artwork and actions
- **TrendingTracksSection**: Algorithm-based trending music discovery

#### Studio Components (`/src/components/studio/`)
- **TrackEditor**: Form for creating and editing music tracks
- **PlaylistEditor**: Form for creating and editing releases/playlists
- **MetadataEditor**: Comprehensive metadata editing interface

#### Social Components (`/src/components/social/`)
- **ZapButton**: Lightning payment button with amount selection
- **ReactionButton**: Like/reaction button with animation
- **ShareButton**: Social sharing with platform selection

## Nostr Integration

### Custom Music Events
- **Kind 36787**: Music tracks (addressable)
- **Kind 34139**: Music playlists/releases (addressable)

### Key Functions
```typescript
// Event validation and conversion
validateMusicTrack(event: NostrEvent): boolean
eventToMusicTrack(event: NostrEvent): MusicTrackData
playlistToRelease(playlist: MusicPlaylistData, tracks: Map): MusicRelease

// Query optimization - batch requests
const events = await nostr.query([{
  kinds: [36787, 34139], // Multiple kinds in one query
  authors: [artistPubkey],
  limit: 100,
}], { signal });
```

### NIP-19 Routing
- Root-level routes: `/:nip19` handles `npub1`, `naddr1`, etc.
- Music-specific: `/track/:naddr`, `/release/:naddr`
- Automatic decoding and event resolution

## Lightning Payments

### Integration
```typescript
// Send Lightning payment
const { mutateAsync: sendZap } = useZaps();
await sendZap({
  recipient: artistPubkey,
  amount: 1000, // sats
  comment: "Great track!"
});

// Wallet detection
const wallet = useWallet(); // WebLN + NWC
const { nwc } = useNWCContext();
```

### Features
- **WebLN**: Browser extension wallets
- **Nostr Wallet Connect**: Remote wallet connections  
- **Zap Splits**: Multi-recipient payments
- **Social Payments**: Zap buttons with orange theme

## Artist-Specific RSS Feeds

### Implementation
- **Artist Control**: Each artist enables/disables RSS in settings
- **Individual Feeds**: Generated at `/rss/{artistPubkey}.xml`
- **Build-Time Generation**: RSS feeds created during static build
- **Orange Theme**: All RSS UI elements use orange colors

### RSS Settings UI
```typescript
// RSS toggle with orange theme
<Switch
  checked={metadata?.rssEnabled || false}
  onCheckedChange={handleRSSToggle}
  className="data-[state=checked]:bg-orange-500"
/>

// RSS URL display with copy functionality
{metadata?.rssEnabled && (
  <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4">
    <div className="flex items-center gap-2">
      <Rss className="w-4 h-4 text-orange-500" />
      <span className="text-orange-500">RSS Enabled</span>
    </div>
    <code className="text-orange-600">/rss/{pubkey}.xml</code>
    <Button onClick={copyRSSUrl}>
      <Copy className="w-3 h-3" />
    </Button>
  </div>
)}
```

### Build Process
RSS feeds are generated in `scripts/build-static-data.ts` for RSS-enabled artists only, with comprehensive error handling and fallback generation.

## Development Guidelines

### Code Standards
- **TypeScript**: Never use `any` type - full type safety required
- **Dark Theme**: Use semantic tokens (`text-foreground`, `bg-muted`)
- **Query Optimization**: Batch Nostr queries, avoid separate requests
- **Error Handling**: Comprehensive validation with graceful fallbacks

### Testing
- **Vitest + React Testing Library**: Component and integration testing
- **Property-Based Testing**: Use fast-check for comprehensive coverage
- **TestApp**: Wrap components with all necessary providers

### Performance
- **Static Generation**: Pre-built caches for instant loading
- **Lazy Loading**: Route-based code splitting with React.lazy
- **Caching Strategy**: 5-minute stale time, infinite GC time
- **Audio Optimization**: Smart preloading and format support

## App Configuration & Providers

The application uses a comprehensive provider setup for global state management:

```typescript
// Provider hierarchy in App.tsx
<UnheadProvider head={head}>
  <AppProvider storageKey="nostr:app-config" defaultConfig={defaultConfig} presetRelays={presetRelays}>
    <QueryClientProvider client={queryClient}>
      <NostrLoginProvider storageKey='nostr:login'>
        <NostrProvider>
          <NWCProvider>
            <UniversalAudioPlayerProvider>
              <TooltipProvider>
                <AppRouter />
              </TooltipProvider>
            </UniversalAudioPlayerProvider>
          </NWCProvider>
        </NostrProvider>
      </NostrLoginProvider>
    </QueryClientProvider>
  </AppProvider>
</UnheadProvider>
```

### Configuration Options

```typescript
const defaultConfig: AppConfig = {
  theme: "dark", // Enforced dark theme
  relayUrl: "wss://relay.ditto.pub", // Default relay
};

const presetRelays = [
  { url: 'wss://relay.ditto.pub', name: 'Ditto' },
  { url: 'wss://relay.damus.io', name: 'Damus' },
  { url: 'wss://relay.primal.net', name: 'Primal' },
];
```

### Global Contexts

- **AppProvider**: Theme, relay configuration, and app settings
- **NostrLoginProvider**: Authentication state and account management  
- **NostrProvider**: Core Nostr protocol integration
- **NWCProvider**: Nostr Wallet Connect for Lightning payments
- **UniversalAudioPlayerProvider**: Global audio playback state
- **QueryClientProvider**: TanStack Query configuration with caching

## Routing System

Tsunami uses React Router with comprehensive routing for music content:

### Key Routes
- `/` - Homepage with latest releases
- `/releases` - Browse all releases  
- `/track/:naddr` - Individual track pages
- `/release/:naddr` - Release/album pages
- `/studio/*` - Artist studio (nested routes for tracks, playlists, settings)
- `/:nip19` - NIP-19 identifier routing (npub1, naddr1, etc.)

### Features
- **Persistent Audio Player**: Continues playback across route changes
- **NIP-19 Routing**: Direct links via Nostr identifiers
- **Deep Linking**: Direct links to specific tracks, releases, and artists

## Development Guidelines

### Code Standards
- **TypeScript**: Never use `any` type - full type safety required
- **Dark Theme**: Use semantic tokens (`text-foreground`, `bg-muted`)
- **Query Optimization**: Batch Nostr queries, avoid separate requests
- **Error Handling**: Comprehensive validation with graceful fallbacks

### Performance
- **Static Generation**: Pre-built caches for instant loading
- **Lazy Loading**: Route-based code splitting with React.lazy
- **Caching Strategy**: 5-minute stale time, infinite GC time
- **Audio Optimization**: Smart preloading and format support

## Essential Hooks & Components

### Core Hooks
```typescript
// Music data
const { data: tracks } = useMusicTracks({ limit: 20 });
const { data: release } = useReleaseData({ eventId: 'abc123' });

// Nostr integration  
const { nostr } = useNostr(); // Query and publish events
const { user } = useCurrentUser(); // Logged-in user
const { mutate: createEvent } = useNostrPublish();

// Audio playback
const trackPlayback = useUniversalTrackPlayback(release);

// Lightning payments
const { mutateAsync: sendZap } = useZaps();
```

### Authentication
```tsx
import { LoginArea } from "@/components/auth/LoginArea";

// Handles login/logout UI automatically
<LoginArea className="max-w-60" />
```

### Profile Data
```tsx
const author = useAuthor(event.pubkey);
const metadata = author.data?.metadata;
const displayName = metadata?.name ?? genUserName(event.pubkey);
```

### File Uploads
```tsx
const { mutateAsync: uploadFile } = useUploadFile();
const [[_, url]] = await uploadFile(file); // Returns NIP-94 tags
```

### Comments System
```tsx
import { CommentsSection } from "@/components/comments/CommentsSection";

<CommentsSection root={event} title="Discussion" />
```

### `npub`, `naddr`, and other Nostr addresses

Nostr defines a set of bech32-encoded identifiers in NIP-19. Their prefixes and purposes:

- `npub1`: **public keys** - Just the 32-byte public key, no additional metadata
- `nsec1`: **private keys** - Secret keys (should never be displayed publicly)
- `note1`: **event IDs** - Just the 32-byte event ID (hex), no additional metadata
- `nevent1`: **event pointers** - Event ID plus optional relay hints and author pubkey
- `nprofile1`: **profile pointers** - Public key plus optional relay hints and petname
- `naddr1`: **addressable event coordinates** - For parameterized replaceable events (kind 30000-39999)
- `nrelay1`: **relay references** - Relay URLs (deprecated)

#### Key Differences Between Similar Identifiers

**`note1` vs `nevent1`:**
- `note1`: Contains only the event ID (32 bytes) - specifically for kind:1 events (Short Text Notes) as defined in NIP-10
- `nevent1`: Contains event ID plus optional relay hints and author pubkey - for any event kind
- Use `note1` for simple references to text notes and threads
- Use `nevent1` when you need to include relay hints or author context for any event type

**`npub1` vs `nprofile1`:**
- `npub1`: Contains only the public key (32 bytes)
- `nprofile1`: Contains public key plus optional relay hints and petname
- Use `npub1` for simple user references
- Use `nprofile1` when you need to include relay hints or display name context

#### NIP-19 Routing Implementation

**Critical**: NIP-19 identifiers should be handled at the **root level** of URLs (e.g., `/note1...`, `/npub1...`, `/naddr1...`), NOT nested under paths like `/note/note1...` or `/profile/npub1...`.

This project includes a boilerplate `NIP19Page` component that provides the foundation for handling all NIP-19 identifier types at the root level. The component is configured in the routing system and ready for AI agents to populate with specific functionality.

**How it works:**

1. **Root-Level Route**: The route `/:nip19` in `AppRouter.tsx` catches all NIP-19 identifiers
2. **Automatic Decoding**: The `NIP19Page` component automatically decodes the identifier using `nip19.decode()`
3. **Type-Specific Sections**: Different sections are rendered based on the identifier type:
   - `npub1`/`nprofile1`: Profile section with placeholder for profile view
   - `note1`: Note section with placeholder for kind:1 text note view
   - `nevent1`: Event section with placeholder for any event type view
   - `naddr1`: Addressable event section with placeholder for articles, marketplace items, etc.
4. **Error Handling**: Invalid, vacant, or unsupported identifiers show 404 NotFound page
5. **Ready for Population**: Each section includes comments indicating where AI agents should implement specific functionality

**Example URLs that work automatically:**
- `/npub1abc123...` - User profile (needs implementation)
- `/note1def456...` - Kind:1 text note (needs implementation)
- `/nevent1ghi789...` - Any event with relay hints (needs implementation)
- `/naddr1jkl012...` - Addressable event (needs implementation)

**Features included:**
- Basic NIP-19 identifier decoding and routing
- Type-specific sections for different identifier types
- Error handling for invalid identifiers
- Responsive container structure
- Comments indicating where to implement specific views

**Error handling:**
- Invalid NIP-19 format → 404 NotFound
- Unsupported identifier types (like `nsec1`) → 404 NotFound
- Empty or missing identifiers → 404 NotFound

To implement NIP-19 routing in your Nostr application:

1. **The NIP19Page boilerplate is already created** - populate sections with specific functionality
2. **The route is already configured** in `AppRouter.tsx`
3. **Error handling is built-in** - all edge cases show appropriate 404 responses
4. **Add specific components** for profile views, event displays, etc. as needed

#### Event Type Distinctions

**`note1` identifiers** are specifically for **kind:1 events** (Short Text Notes) as defined in NIP-10: "Text Notes and Threads". These are the basic social media posts in Nostr.

**`nevent1` identifiers** can reference any event kind and include additional metadata like relay hints and author pubkey. Use `nevent1` when:
- The event is not a kind:1 text note
- You need to include relay hints for better discoverability
- You want to include author context

#### Use in Filters

The base Nostr protocol uses hex string identifiers when filtering by event IDs and pubkeys. Nostr filters only accept hex strings.

```ts
// ❌ Wrong: naddr is not decoded
const events = await nostr.query(
  [{ ids: [naddr] }],
  { signal }
);
```

Corrected example:

```ts
// Import nip19 from nostr-tools
import { nip19 } from 'nostr-tools';

// Decode a NIP-19 identifier
const decoded = nip19.decode(value);

// Optional: guard certain types (depending on the use-case)
if (decoded.type !== 'naddr') {
  throw new Error('Unsupported Nostr identifier');
}

// Get the addr object
const naddr = decoded.data;

// ✅ Correct: naddr is expanded into the correct filter
const events = await nostr.query(
  [{
    kinds: [naddr.kind],
    authors: [naddr.pubkey],
    '#d': [naddr.identifier],
  }],
  { signal }
);
```

#### Implementation Guidelines

1. **Always decode NIP-19 identifiers** before using them in queries
2. **Use the appropriate identifier type** based on your needs:
   - Use `note1` for kind:1 text notes specifically
   - Use `nevent1` when including relay hints or for non-kind:1 events
   - Use `naddr1` for addressable events (always includes author pubkey for security)
3. **Handle different identifier types** appropriately:
   - `npub1`/`nprofile1`: Display user profiles
   - `note1`: Display kind:1 text notes specifically
   - `nevent1`: Display any event with optional relay context
   - `naddr1`: Display addressable events (articles, marketplace items, etc.)
4. **Security considerations**: Always use `naddr1` for addressable events instead of just the `d` tag value, as `naddr1` contains the author pubkey needed to create secure filters
5. **Error handling**: Gracefully handle invalid or unsupported NIP-19 identifiers with 404 responses

### Additional Features

#### Rich Text Content
```tsx
import { NoteContent } from "@/components/NoteContent";

// Renders URLs, hashtags, and Nostr URIs
<NoteContent event={post} className="text-sm" />
```

#### Profile Editing
```tsx
import { EditProfileForm } from "@/components/EditProfileForm";

<EditProfileForm /> // No props needed
```

#### Encryption/Decryption
```tsx
const { user } = useCurrentUser();
const encrypted = await user.signer.nip44.encrypt(pubkey, "message");
const decrypted = await user.signer.nip44.decrypt(pubkey, encrypted);
```

## App Configuration & Providers

```typescript
// Provider hierarchy
<AppProvider storageKey="nostr:app-config" defaultConfig={defaultConfig}>
  <QueryClientProvider client={queryClient}>
    <NostrLoginProvider storageKey='nostr:login'>
      <NostrProvider>
        <NWCProvider>
          <UniversalAudioPlayerProvider>
            <AppRouter />
          </UniversalAudioPlayerProvider>
        </NWCProvider>
      </NostrProvider>
    </NostrLoginProvider>
  </QueryClientProvider>
</AppProvider>

// Default configuration
const defaultConfig: AppConfig = {
  theme: "dark", // Enforced dark theme
  relayUrl: "wss://relay.ditto.pub",
};
```

## Loading States & UX

### Loading Strategy
- **Skeleton Loading**: Use for structured content (feeds, profiles, forms)
- **Spinners**: Only for buttons or short operations
- **Progressive Loading**: Show cached data immediately, update with fresh data

```tsx
// Skeleton example
<Card>
  <CardHeader>
    <div className="flex items-center space-x-3">
      <Skeleton className="h-10 w-10 rounded-full" />
      <div className="space-y-1">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  </CardHeader>
</Card>

// Empty state with relay selector
<Card className="border-dashed">
  <CardContent className="py-12 px-8 text-center">
    <div className="max-w-sm mx-auto space-y-6">
      <Music className="w-16 h-16 text-muted-foreground/50" />
      <h3 className="text-foreground">No music found</h3>
      <p className="text-muted-foreground">Try switching to a different relay</p>
      <RelaySelector className="w-full" />
    </div>
  </CardContent>
</Card>
```

## Testing Guidelines

### Test Setup
The project uses Vitest with React Testing Library. Use the `TestApp` component to provide necessary context:

```tsx
import { render, screen } from '@testing-library/react';
import { TestApp } from '@/test/TestApp';

render(
  <TestApp>
    <MyComponent />
  </TestApp>
);
```

### Writing vs Running Tests
- **Don't write tests** unless explicitly requested by user
- **Always run tests** after code changes using the test script
- **Task not complete** until tests pass without errors

## Final Notes

**CRITICAL**: Always run the test script after making code changes. Your task is not finished until tests pass.

The test script validates TypeScript compilation, ESLint rules, and the existing test suite.