# Static Data Build-Time Setup

This document explains how to set up automated RSS feed and cache generation using the unified build-time system.

## Overview

The `scripts/build-static-data.ts` script fetches podcast releases from Nostr relays **once** and generates both static `rss.xml` file and cache files during the build process. This eliminates duplicate network requests and ensures data consistency between RSS feeds and static cache files.

## Script Features

- ✅ **Single data fetch** from multiple Nostr relays
- ✅ Generates RSS feed with Podcasting 2.0 tags
- ✅ Creates static cache files for client-side performance
- ✅ Validates releases according to NIP-54 (podcast releases)
- ✅ Handles release edits and deduplication
- ✅ Creates health check files for monitoring
- ✅ Comprehensive error handling and logging
- ✅ Consistent data across all outputs

## Configuration

### Environment Variables

The script can be configured with these environment variables:

```bash
# Base URL for the podcast (used in RSS links)
export BASE_URL="https://your-domain.com"

# Comma-separated list of Nostr relay URLs
export NOSTR_RELAYS="wss://relay.damus.io,wss://nos.lol,wss://relay.primal.net"
```

### Podcast Configuration

The RSS feed is automatically configured using:

- Environment variables for artist npub and metadata
- Nostr metadata events from the artist's profile
- Build-time fetching of release data

## Manual Execution

To run the static data build script manually:

```bash
# Generate both RSS and cache files
npm run build:data

# Or as part of the full build process
npm run build
```

## Automated Static Data Updates

### Option 1: Build-Time Generation (Recommended)

The RSS feed and cache files are automatically generated during the build process via `npm run build`. For deployment platforms like Vercel, Netlify, or GitHub Pages, this means both RSS and cache data are always up-to-date with each deployment.

### Option 2: Periodic Rebuilds via Cron

For servers where you want to update the static data without full rebuilds, you can set up a cron job to run just the static data build script.

### 1. Test the script with full paths

```bash
cd /full/path/to/your/tsunami/project
npm run build:data
```

### 2. Create a wrapper script (for cron setup)

Create `/usr/local/bin/update-tsunami-data.sh`:

```bash
#!/bin/bash

# Set environment variables (should match your .env file)
export BASE_URL="https://your-domain.com"
export NOSTR_RELAYS="wss://relay.damus.io,wss://nos.lol"

# Change to project directory
cd /full/path/to/your/tsunami/project

# Run the static data build script
npm run build:data >> /var/log/tsunami-data.log 2>&1
```

Make it executable:
```bash
chmod +x /usr/local/bin/update-tsunami-data.sh
```

### 3. Set up the cron job

Edit your crontab:
```bash
crontab -e
```

Add one of these entries based on your update frequency needs:

```bash
# Every 15 minutes (for frequent updates)
*/15 * * * * /usr/local/bin/update-tsunami-data.sh

# Every hour (recommended for most use cases)
0 * * * * /usr/local/bin/update-tsunami-data.sh

# Every 6 hours (for less frequent updates)
0 */6 * * * /usr/local/bin/update-tsunami-data.sh

# Daily at 2 AM
0 2 * * * /usr/local/bin/update-tsunami-data.sh
```

## Web Server Configuration

### Nginx

Add this to your nginx configuration to serve the RSS feed and cache files:

```nginx
location /rss.xml {
    alias /full/path/to/your/tsunami/project/dist/rss.xml;
    add_header Content-Type application/rss+xml;
    add_header Cache-Control "public, max-age=300"; # 5 minute cache
}

location /data/ {
    alias /full/path/to/your/tsunami/project/dist/data/;
    add_header Content-Type application/json;
    add_header Cache-Control "public, max-age=300"; # 5 minute cache
}

location /rss-health.json {
    alias /full/path/to/your/tsunami/project/dist/rss-health.json;
    add_header Content-Type application/json;
}

location /cache-health.json {
    alias /full/path/to/your/tsunami/project/dist/cache-health.json;
    add_header Content-Type application/json;
}
```

### Apache

Add this to your `.htaccess` or virtual host configuration:

```apache
# Serve RSS with correct MIME type
<Files "rss.xml">
    Header set Content-Type "application/rss+xml"
    Header set Cache-Control "public, max-age=300"
</Files>

# Serve cache files with correct MIME type
<FilesMatch "\.(json)$">
    Header set Content-Type "application/json"
    Header set Cache-Control "public, max-age=300"
</FilesMatch>
```

## Monitoring

### Health Check

The script generates health check files with information about:

- **RSS Health** (`dist/rss-health.json`): RSS generation status, release count, feed size
- **Cache Health** (`dist/cache-health.json`): Cache generation status, cached release count
- Both include: generation timestamp, relay status, configuration

You can monitor these endpoints to ensure the static data is being updated correctly.

### Logging

Enable logging by redirecting output to a log file:

```bash
# In your wrapper script or cron job
npm run build:data >> /var/log/tsunami-data.log 2>&1
```

Rotate logs with logrotate by creating `/etc/logrotate.d/tsunami-data`:

```
/var/log/tsunami-data.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    create 644 root root
}
```

## Troubleshooting

### Common Issues

1. **Permission denied**: Make sure the script is executable and the web server can read the output files
2. **Path issues**: Use absolute paths in cron jobs
3. **Environment variables**: Set them in the wrapper script, not in crontab
4. **Network timeouts**: The script has built-in timeout handling, but relay connectivity can vary

### Debug Mode

Run the script manually to see detailed output:

```bash
npm run build:data
```

### Check Cron Logs

View cron execution logs:

```bash
# On most systems
tail -f /var/log/cron

# On systemd systems
journalctl -f -u cron
```

## Example Complete Setup

Here's a complete example for a production deployment:

1. **Wrapper script** (`/usr/local/bin/update-tsunami-data.sh`):
```bash
#!/bin/bash
export BASE_URL="https://mypodcast.com"
export NOSTR_RELAYS="wss://relay.damus.io,wss://nos.lol"
cd /var/www/tsunami
npm run build:data >> /var/log/tsunami-data.log 2>&1

# Optional: notify monitoring service
if [ $? -eq 0 ]; then
    curl -s "https://monitor.example.com/ping/data-success" > /dev/null
else
    curl -s "https://monitor.example.com/ping/data-failure" > /dev/null
fi
```

2. **Crontab entry**:
```bash
# Update static data every 30 minutes
*/30 * * * * /usr/local/bin/update-tsunami-data.sh
```

3. **Nginx config**:
```nginx
location /rss.xml {
    alias /var/www/tsunami/dist/rss.xml;
    add_header Content-Type application/rss+xml;
    add_header Cache-Control "public, max-age=1800";
}

location /data/ {
    alias /var/www/tsunami/dist/data/;
    add_header Content-Type application/json;
    add_header Cache-Control "public, max-age=1800";
}
```

## Deployment Platform Integration

For modern deployment platforms, static data updates can be automated through:

### Build-Time Generation (Recommended)
- **Vercel/Netlify**: RSS and cache files are automatically generated on each deployment
- **GitHub Pages**: Use GitHub Actions to trigger builds when new releases are published
- **Self-hosted**: Use the cron setup above for periodic static data updates

### Webhook-Triggered Builds
Set up webhooks to trigger new builds when releases are published, ensuring immediate RSS and cache updates without waiting for scheduled builds.

This approach ensures that RSS readers, podcast apps, and the web application always have access to fresh, consistent content without requiring JavaScript execution or duplicate network requests.