# Tsunami Configuration Guide

Tsunami uses environment variables to configure your artist and music metadata and settings. This makes it easy to customize your presence without modifying code.

## Quick Start

1. **Copy the example configuration:**
   ```bash
   cp .env.example .env
   ```

2. **Edit the `.env` file** with your artist and music details:
   ```bash
   # Required: Your Nostr public key
   VITE_ARTIST_NPUB=npub1your_public_key_here
   
   # Basic artist info
   VITE_ARTIST_NAME=Your Name
   VITE_MUSIC_DESCRIPTION=A music collection about amazing things
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```

## Configuration Categories

### 🎙️ Essential Settings

These are the minimum settings you should configure:

- `VITE_ARTIST_NPUB` - Your Nostr public key (npub format)
- `VITE_ARTIST_NAME` - Your name as the artist/creator
- `VITE_MUSIC_DESCRIPTION` - Brief description of your music

### 🎨 Branding & Media

- `VITE_ARTIST_IMAGE` - URL to your artist cover art (1400x1400px minimum)
- `VITE_ARTIST_WEBSITE` - Your artist website URL
- `VITE_ARTIST_COPYRIGHT` - Copyright notice

### ⚡ Lightning Value-for-Value

Configure Lightning payments for listener support:

- `VITE_MUSIC_VALUE_AMOUNT` - Suggested payment amount in sats per minute
- `VITE_MUSIC_VALUE_CURRENCY` - Currency type ("sats", "USD", "BTC", etc.)
- `VITE_MUSIC_VALUE_RECIPIENTS` - JSON array of payment recipients

### 📍 Location & Metadata

- `VITE_ARTIST_LOCATION_NAME` - Artist location name
- `VITE_ARTIST_LOCATION_GEO` - GPS coordinates (latitude,longitude)
- `VITE_MUSIC_GUID` - Unique music identifier (defaults to your npub)

## Advanced Configuration

### Lightning Recipients

The `VITE_MUSIC_VALUE_RECIPIENTS` field accepts a JSON array defining how Lightning payments are split:

```json
[
  {
    "name": "Host",
    "type": "node",
    "address": "your_lightning_address_or_pubkey",
    "split": 60,
    "fee": false
  },
  {
    "name": "Producer", 
    "type": "keysend",
    "address": "producer_pubkey",
    "split": 30,
    "customKey": "podcast",
    "customValue": "producer-fee"
  },
  {
    "name": "Platform",
    "type": "node", 
    "address": "platform_pubkey",
    "split": 10,
    "fee": true
  }
]
```

**Split percentages should total 100%.**

### Person Metadata

Define who's involved in the music with `VITE_MUSIC_PERSON`:

```json
[
  {
    "name": "Your Name",
    "role": "host",
    "group": "cast",
    "img": "https://example.com/your-photo.jpg",
    "href": "https://yourwebsite.com"
  },
  {
    "name": "Producer Name", 
    "role": "producer",
    "group": "crew"
  }
]
```

### Funding Links

Add support links with `VITE_ARTIST_FUNDING` (comma-separated):
```
VITE_ARTIST_FUNDING=lightning:your@address.com,https://donate.example.com,bitcoin:bc1address
```

## Environment Variables Reference

| Variable | Type | Description | Default |
|----------|------|-------------|---------|
| `VITE_ARTIST_NPUB` | string | Your Nostr public key | Example npub |
| `VITE_ARTIST_NAME` | string | Artist/creator name | "Tsunami Artist" |
| `VITE_MUSIC_DESCRIPTION` | string | Music description | Example description |
| `VITE_ARTIST_IMAGE` | string | Cover art URL | Example image URL |
| `VITE_ARTIST_WEBSITE` | string | Artist website | "https://tsunami.example" |
| `VITE_ARTIST_COPYRIGHT` | string | Copyright notice | "© 2025 Tsunami Artist" |
| `VITE_MUSIC_VALUE_AMOUNT` | number | Sats per minute | 1000 |
| `VITE_MUSIC_VALUE_CURRENCY` | string | Payment currency | "sats" |
| `VITE_MUSIC_VALUE_RECIPIENTS` | JSON array | Payment recipients | Example recipients |
| `VITE_RSS_TTL` | number | RSS cache time (minutes) | 60 |

## Validation

After configuring your environment variables, you can validate the configuration by:

1. Starting the development server (`npm run dev`)
2. Checking the browser console for any parsing errors
3. Visiting the podcast pages to see if your metadata appears correctly
4. Generating the RSS feed to ensure all fields are populated

## Tips

- **JSON fields**: Use online JSON validators to ensure your JSON arrays are properly formatted
- **URLs**: Always use complete URLs starting with `https://`
- **Lightning addresses**: Test your Lightning addresses before adding them to recipients
- **Images**: Use high-quality square images (1400x1400px minimum) for best podcast directory compatibility
- **Categories**: Check common podcast categories used by Apple Podcasts and Spotify for better discoverability

## Troubleshooting

**JSON parsing errors**: Check the browser console for detailed error messages about malformed JSON in environment variables.

**Missing metadata**: Ensure all required `VITE_` prefixed variables are set in your `.env` file.

**Lightning recipients not working**: Verify that split percentages total 100% and all addresses are valid Lightning addresses or node public keys.