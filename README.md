# Tsunami

A Nostr-powered podcast platform for single artist accounts that combines decentralized publishing with Podcasting 2.0 standards.

## ✨ Features

### 🎙️ **Publishing**
- **Artist-only publishing** with hardcoded npub authentication
- Upload audio files to Blossom or Vercel servers or reference external URLs
- Rich release metadata: title, description, cover art, transcripts
- Podcasting 2.0 value tags for Lightning payments and funding
- Release editing and management through intuitive Studio interface

### 📡 **RSS Feed Generation**
- Automatic Podcasting 2.0-compliant RSS feed at `/rss.xml`
- Build-time RSS generation using unified `scripts/build-static-data.ts`
- Lightning value splits with modern `lnaddress` method (no keysend fallback)
- RSS feed pulls releases from Nostr relays at build time
- Consistent data between RSS feed and static cache files

### 🎧 **Listening Experience**
- Clean, responsive audio player with progress tracking
- Chronological release listing with rich metadata
- Release search by title, description, and tags
- Mobile-optimized interface

### 💬 **Community Interaction**
- Artist social feed for updates and announcements  
- Release comments system with full threading (NIP-22)
- Fan engagement through Nostr protocol:
  - Threaded comments and replies on releases
  - Lightning zaps (NIP-57) with WebLN and NWC support
  - Social reactions and reposts
- Zap leaderboards and release popularity metrics
- Real-time comment updates and notifications

### 🔐 **Nostr Integration**
- Standard Nostr authentication (NIP-07, NIP-46)
- Individual music track events (kind 36787)
- Comments system using NIP-22
- Value-for-value Lightning integration

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- NPM or compatible package manager

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/tsunami.git
cd tsunami

# Install dependencies
npm install

# Copy environment configuration
cp .env.example .env

# Configure your artist and music settings in .env
# Set your artist npub and publishing metadata
```

### Development

```bash
# Start development server
npm run dev

# Run tests
npm test

# Build for production
npm run build

# Generate only static data (RSS + cache)
npm run build:data
```

### Configuration

Tsunami is now a multi-artist platform that requires no environment variables. All configuration is handled through the Artist Settings in the studio interface:

1. Start the development server: `npm run dev`
2. Log in with your Nostr account
3. Go to Studio → Settings to configure your artist profile

See [CONFIGURATION.md](./CONFIGURATION.md) for detailed setup instructions.

## 🛠️ Technology Stack

- **Frontend**: React 18, TypeScript, TailwindCSS 3.x
- **UI Components**: shadcn/ui (48+ components) with Radix primitives  
- **Build Tool**: Vite with hot module replacement
- **Nostr**: Nostrify framework for Deno and web
- **State Management**: TanStack Query for data fetching and caching
- **Routing**: React Router with BrowserRouter
- **Audio**: HTML5 audio with persistent playback state
- **Lightning**: WebLN and Nostr Wallet Connect (NWC) integration
- **File Upload**: Blossom server integration for media storage

## 📋 Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/             # shadcn/ui components (48+ available)
│   ├── auth/           # Authentication components (LoginArea, AccountSwitcher)
│   ├── audio/          # Audio player components (PersistentAudioPlayer)
│   ├── music/          # Music-specific components (ReleaseCard, etc.)
│   ├── social/         # Social interaction components (PostActions, NoteComposer)
│   ├── comments/       # Threading comment system (CommentsSection)
│   └── studio/         # Artist studio components (ReleaseManagement, etc.)
├── hooks/              # Custom React hooks (useNostr, useZaps, etc.)
├── lib/                # Utility functions and configurations
├── pages/              # Route components (Index, Releases, Studio, etc.)
├── contexts/           # React context providers (AppContext, NWCContext)
└── types/              # TypeScript type definitions

scripts/
├── build-static-data.ts   # Unified build for RSS + cache files
├── shared/
│   └── nostr-data-fetcher.ts # Shared Nostr data fetching logic
├── validate-rss.ts        # RSS feed validation
└── test-rss-endpoint.ts    # RSS endpoint testing

dist/
├── rss.xml                 # Generated Podcasting 2.0 RSS feed
├── data/
│   ├── releases.json       # Static cache of latest releases
│   └── latest-release.json # Static cache of most recent release
├── rss-health.json         # RSS health and status monitoring
├── cache-health.json       # Cache health and status monitoring
└── 404.html                # GitHub Pages compatibility
```

## 🎯 Core Event Types

- **Music Tracks**: `kind 36787` (Individual music tracks with metadata)
- **Music Playlists**: `kind 34139` (Collections of tracks, replaces releases)
- **Metadata**: `kind 30078` (Artist configuration)
- **Comments**: `kind 1111` (NIP-22 playlist/track comments) 
- **Social**: `kind 1` (Artist updates and announcements)

## 🔧 Deployment

### Static Hosting (Recommended)
Deploy to Vercel, Netlify, or GitHub Pages:

```bash
npm run build
# Deploy dist/ folder to your hosting provider
```

### RSS Feed Updates
- **Build-time**: RSS and cache files generated automatically during `npm run build`
- **Manual**: Run `npm run build:data` to regenerate RSS and cache files
- **Periodic**: Set up cron jobs using updated `RSS_CRON_SETUP.md` guide  
- **Webhooks**: Trigger builds when new episodes are published
- **Health monitoring**: Check `/rss-health.json` and `/cache-health.json` for status

### Environment Variables
Ensure production environment has all required variables from `.env`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Nostr Protocol** - Decentralized social networking foundation
- **Podcasting 2.0** - Modern podcast standards and value integration
- **shadcn/ui** - Beautiful, accessible UI components
- **Nostrify** - Nostr development framework

---

**Vibed with [MKStack](https://soapbox.pub/mkstack)** ⚡

Built for artists who want to own their content, engage directly with their audience, and participate in the value-for-value economy through Bitcoin Lightning payments.