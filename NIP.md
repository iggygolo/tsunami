Music Playlists

This spec defines an addressable event kind for publishing music playlists on Nostr.
Event Kind

    34139: Playlist (addressable)

Playlist Event

A playlist is an addressable event containing an ordered list of music tracks.
Format

The .content field MAY contain a description of the playlist in plain text or Markdown.
Tags

Required:

    d - Unique identifier for this playlist
    title - Playlist title
    alt - Human-readable description (NIP-31)

Optional:

    description - Short description (can also use content field)
    image - URL to playlist artwork
    a - Track references in format 36787:<pubkey>:<d-tag> (multiple, ordered)
    t - Category tags for discovery
    public - Set to "true" for public playlists (default)
    private - Set to "true" for private playlists
    collaborative - Set to "true" to allow others to add tracks

Example

{
  "kind": 34139,
  "content": "My favorite summer vibes from 2024",
  "tags": [
    ["d", "summer-vibes-2024"],
    ["title", "Summer Vibes 2024"],
    ["image", "https://cdn.blossom.example/img/playlist.jpg"],
    ["description", "Chill electronic tracks for summer"],
    ["a", "36787:abc123...:summer-nights-2024"],
    ["a", "36787:def456...:sunset-dreams"],
    ["a", "36787:abc123...:ocean-breeze"],
    ["t", "playlist"],
    ["t", "electronic"],
    ["t", "summer"],
    ["public", "true"],
    ["alt", "Playlist: Summer Vibes 2024"]
  ]
}

Track References

Playlists reference music tracks using a tags in the format:

["a", "36787:<pubkey>:<d-tag>"]

Where:

    36787 is the Music Track event kind (see NIP-XX: Music Tracks)
    <pubkey> is the track author's public key (hex)
    <d-tag> is the track's unique identifier

Implementation Notes

    Playlists are updatable (addressable events)
    Playlist a tags reference tracks in display order
    Clients SHOULD preserve track order when displaying playlists
    Clients SHOULD handle missing/deleted tracks gracefully
    When a referenced track is not found, clients MAY show a placeholder or skip it
    Playlists support NIP-25 reactions and NIP-22 comments
    Use naddr identifiers to link to playlists
    Collaborative playlist mechanics are client-defined (e.g., NIP-04/17 track suggestions)
    Artwork images SHOULD be hosted on Blossom servers for permanence


Music Tracks
Event Kind

    36787: Music Track (addressable)

Music Track Event

A music track is an addressable event containing metadata about an audio file.
Format

The .content field MAY contain lyrics and production credits in plain text or Markdown.
Tags

Required:

    d - Unique identifier for this track
    title - Track title
    artist - Artist name
    url - Direct URL to the audio file
    t - At least one tag with value "music"

Optional:

    alt - Human-readable description (NIP-31)
    image - URL to album artwork
    video - URL to music video file
    album - Album name
    track_number - Position in album
    released - ISO 8601 date (YYYY-MM-DD)
    t - Additional genre/category tags
    language - ISO 639-1 language code
    explicit - Set to "true" for explicit content
    duration - Track length in seconds
    format - Audio format (mp3, flac, m4a, ogg)
    bitrate - Audio bitrate (e.g., "320kbps")
    sample_rate - Sample rate in Hz
    zap - Lightning address for zap splits (multiple allowed, see Zap Splits)

Example

{
  "kind": 36787,
  "content": "Lyrics:\n[Verse 1]\n...\n\nCredits:\nProducer: John Doe",
  "tags": [
    ["d", "summer-nights-2024"],
    ["title", "Summer Nights"],
    ["url", "https://cdn.blossom.example/audio/abc123.mp3"],
    ["image", "https://cdn.blossom.example/img/artwork.jpg"],
    ["video", "https://cdn.blossom.example/video/abc123.mp4"],
    ["artist", "The Midnight Collective"],
    ["album", "Endless Summer"],
    ["track_number", "3"],
    ["released", "2024-06-15"],
    ["duration", "245"],
    ["format", "mp3"],
    ["t", "music"],
    ["t", "electronic"],
    ["alt", "Music track: Summer Nights by The Midnight Collective"]
  ]
}

Implementation Notes

    Audio files SHOULD be hosted on Blossom servers for permanence
    Video files (music videos) MAY be hosted on Blossom servers or other permanent storage
    Tracks are updatable (addressable events)
    When no zap tag is present, use author's profile Lightning address
    Clients MAY auto-detect technical metadata (duration, format, bitrate)
    Clients MAY choose to display video when available, or default to audio-only playback
    Tracks support NIP-25 reactions and NIP-22 comments
    Use naddr identifiers to link to tracks

