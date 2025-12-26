# Tsunami Configuration Guide

Tsunami is now a multi-artist platform where each artist manages their own settings through the studio interface. No environment variables are required for basic functionality.

## Quick Start

1. **Start the development server:**
   ```bash
   npm run dev
   ```

2. **Configure your artist profile:**
   - Log in with your Nostr account
   - Go to Studio → Settings
   - Configure your artist profile, upload preferences, and other settings

That's it! No environment variables needed.

## Artist Configuration

All configuration is now handled per-artist through the **Artist Settings** page in the studio:

### 🎙️ Artist Profile
- Artist name and description
- Cover art image
- Website URL
- Copyright notice

### 📡 Upload Settings
- Blossom server configuration
- Custom server preferences per artist

### ⚡ Lightning Value-for-Value
- Payment amount and currency
- Lightning payment recipients
- Value splits configuration

### 📍 Optional Metadata
- Location information
- License details
- RSS feed preferences

## How It Works

1. **No Environment Variables**: The system works without any environment variables
2. **Per-Artist Settings**: Each artist configures their own preferences
3. **Sensible Defaults**: The system provides reasonable defaults for all settings
4. **Blossom-Only Uploads**: Simplified to use only Blossom servers for decentralized file storage

## Migration from Single-Artist Setup

If you're migrating from a single-artist Tsunami setup:

1. Remove all `VITE_*` environment variables from your `.env` file
2. Start the application
3. Log in as your artist account
4. Go to Studio → Settings
5. Configure your artist profile with your previous settings

## Default Blossom Servers

The system uses these default Blossom servers when artists haven't configured custom ones:

- `https://blossom.primal.net`
- `https://blossom.nostr.band`

Artists can override these defaults in their Artist Settings.

## Troubleshooting

**No configuration needed**: If you're used to configuring environment variables, don't worry - the system now works without any configuration files.

**Artist settings not saving**: Ensure you're logged in with your Nostr account and have a stable internet connection.

**Upload issues**: Check your Blossom server configuration in Artist Settings, or use the default servers.

## Development

For developers working on Tsunami:

- The system no longer depends on environment variables
- All configuration is stored in Nostr artist metadata events
- Default values are hardcoded in the application
- Upload system uses only Blossom servers for decentralized storage