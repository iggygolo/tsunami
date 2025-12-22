# Demu.xml Elements We CANNOT Implement

This document lists all demu.xml elements that we do NOT have corresponding data for in our PodcastRelease or PodcastConfig interfaces.

## Channel Level Elements (Missing Data)

### Basic RSS Elements
- ❌ `<language>` - No language field in PodcastConfig
- ❌ `<managingEditor>` - No email field in PodcastConfig  
- ❌ `<webMaster>` - No webmaster email field in PodcastConfig

### Podcast 2.0 Elements
- ❌ `<podcast:locked>` - No locked field or owner email in PodcastConfig
- ❌ `<itunes:category>` - No category/genre fields in PodcastConfig

## Item Level Elements (Missing Data)

### Basic RSS Elements
- ❌ `<link>` at item level - No individual track URLs in ReleaseTrack
- ❌ `<author>` at item level - No per-track author in ReleaseTrack

## Complex Elements We Could Add But Don't Have Data For

### RSS Image Sub-elements
- ❌ `<image><title>` - No image title in PodcastConfig
- ❌ `<image><link>` - Could use website but not specific to image
- ❌ `<image><description>` - No image description in PodcastConfig

## Elements That Would Require New Environment Variables

If we wanted to implement these, we would need to add new environment variables:

### Suggested New Environment Variables
```bash
# For missing channel elements
VITE_MUSIC_LANGUAGE=en
VITE_ARTIST_MANAGING_EDITOR=artist@example.com
VITE_ARTIST_WEBMASTER=webmaster@example.com
VITE_MUSIC_CATEGORIES=Music,Technology
VITE_PODCAST_LOCKED_OWNER=artist@example.com
VITE_PODCAST_LOCKED=no

# For enhanced image metadata
VITE_ARTIST_IMAGE_TITLE="Artist Cover Art"
VITE_ARTIST_IMAGE_DESCRIPTION="Official artist artwork"
```

## Notes

- Some of these elements could be implemented with reasonable defaults (e.g., language="en")
- Others require user-specific data that we don't currently collect
- The iTunes namespace declaration is easy to add and should be included
- Most of the missing elements are optional for RSS feed functionality
- The core music/podcast functionality works without these elements