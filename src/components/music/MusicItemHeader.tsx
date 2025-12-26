/**
 * MusicItemHeader Component
 * 
 * A reusable header component for music items (tracks, releases, playlists)
 * that provides consistent layout and styling across different pages.
 *
 */

import { ReactNode } from 'react';
import { Play, Pause, Music, Zap, Heart, Share } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ZapDialog } from '@/components/ZapDialog';
import { ArtistLinkWithImage } from '@/components/music/ArtistLink';
import { cn } from '@/lib/utils';
import type { NostrEvent } from '@nostrify/nostrify';

interface MusicItemHeaderProps {
  // Basic info
  title: string;
  artistName?: string;
  artistPubkey?: string;
  description?: string;
  imageUrl?: string;
  
  // Genre/Tags
  genres?: string[];
  
  // Metadata
  metadata?: Array<{
    icon?: ReactNode;
    text: string | ReactNode;
  }>;
  
  // Stats
  stats?: {
    sats?: number;
    zaps?: number;
  };
  
  // Playback
  playback?: {
    isPlaying: boolean;
    isLoading: boolean;
    hasPlayableTracks: boolean;
    onPlay: () => void;
  };
  
  // Interactions
  interactions?: {
    event: NostrEvent;
    hasUserLiked: boolean;
    onLike: () => void;
    onShare: () => void;
  };
  
  // Additional content
  children?: ReactNode;
  
  // Styling
  className?: string;
}

export function MusicItemHeader({
  title,
  artistName,
  artistPubkey,
  description,
  imageUrl,
  genres = [],
  metadata = [],
  stats,
  playback,
  interactions,
  children,
  className
}: MusicItemHeaderProps) {
  return (
    <div className={cn("flex flex-col lg:flex-row items-center lg:items-start gap-6 mb-6", className)}>
      {/* Artwork */}
      <div className="flex-shrink-0">
        <div className="w-48 h-48 sm:w-56 sm:h-56 rounded-2xl overflow-hidden shadow-2xl relative group">
          {imageUrl ? (
            <img 
              src={imageUrl} 
              alt={title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Music className="text-4xl sm:text-6xl text-white" />
            </div>
          )}
          
          {/* Play/Pause Overlay */}
          {playback?.hasPlayableTracks && (
            <button
              onClick={playback.onPlay}
              disabled={playback.isLoading}
              className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 disabled:cursor-not-allowed"
            >
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-white rounded-full flex items-center justify-center shadow-lg">
                {playback.isPlaying ? (
                  <Pause className="w-6 h-6 sm:w-8 sm:h-8 text-black" fill="currentColor" />
                ) : (
                  <Play className="w-6 h-6 sm:w-8 sm:h-8 text-black ml-1" fill="currentColor" />
                )}
              </div>
            </button>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="flex-1 space-y-2 relative z-10 w-full max-w-lg text-center lg:text-left">
        <div className="flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-white drop-shadow-lg mb-1">
            {title}
          </h1>
          
          {artistPubkey ? (
            <div className="mb-1">
              <ArtistLinkWithImage 
                pubkey={artistPubkey}
                className="text-white/90 hover:text-white transition-colors drop-shadow-md text-sm"
              />
            </div>
          ) : artistName ? (
            <p className="text-white/90 text-sm drop-shadow-md mb-1">{artistName}</p>
          ) : null}
          
          {description && (
            <p className="text-white/80 drop-shadow-md text-xs mb-1">{description}</p>
          )}
        </div>

        {/* Metadata */}
        {metadata.length > 0 && (
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-center lg:justify-start">
            {metadata.map((item, index) => (
              <span key={index} className="text-white/70 flex items-center gap-1 text-xs">
                {item.icon}
                {item.text}
              </span>
            ))}
          </div>
        )}

        {/* Genres */}
        {genres.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap justify-center lg:justify-start">
            {genres.slice(0, 3).map((genre, index) => (
              <Badge 
                key={index}
                className="bg-white/20 text-white border-white/30 hover:bg-white/30 text-xs px-2 py-0.5"
              >
                {genre}
              </Badge>
            ))}
            {genres.length > 3 && (
              <span className="text-white/60 text-xs">
                +{genres.length - 3} more
              </span>
            )}
          </div>
        )}

        {/* Stats */}
        {stats && (
          <div className="flex items-center gap-3 justify-center lg:justify-start">
            <div className="text-white">
              <div className="text-lg font-bold drop-shadow-lg">{stats.sats || 0} sats</div>
            </div>
            <div className="text-white/60 text-xs drop-shadow-md">
              {stats.zaps || 0} zaps
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-2 justify-center lg:justify-start pt-1">
          {/* Play/Pause Button */}
          {playback && (
            <Button
              size="sm"
              onClick={playback.onPlay}
              disabled={!playback.hasPlayableTracks || playback.isLoading}
              className="bg-white text-black hover:bg-white/90 rounded-full w-10 h-10 p-0"
            >
              {playback.isPlaying ? (
                <Pause className="w-4 h-4" fill="currentColor" />
              ) : (
                <Play className="w-4 h-4 ml-0.5" fill="currentColor" />
              )}
            </Button>
          )}

          {/* Social Interaction Buttons */}
          {interactions && (
            <>
              {/* Zap Button */}
              <ZapDialog target={interactions.event}>
                <Button
                  size="sm"
                  variant="ghost"
                  className="w-10 h-10 p-0 rounded-full bg-black/30 border border-white/20 text-white backdrop-blur-xl hover:bg-yellow-500/20 hover:border-yellow-400/40 hover:text-yellow-300 transition-all duration-200 shadow-lg"
                  title="Zap this item"
                >
                  <Zap className="w-4 h-4" />
                </Button>
              </ZapDialog>

              {/* Like Button */}
              <Button
                size="sm"
                variant="ghost"
                onClick={interactions.onLike}
                className={cn(
                  "w-10 h-10 p-0 rounded-full bg-black/30 border border-white/20 text-white backdrop-blur-xl hover:bg-red-500/20 hover:border-red-400/40 hover:text-red-300 transition-all duration-200 shadow-lg",
                  interactions.hasUserLiked && "text-red-500 bg-red-500/10 border-red-400/30"
                )}
              >
                <Heart className={cn("w-4 h-4", interactions.hasUserLiked && "fill-current")} />
              </Button>

              {/* Share Button */}
              <Button
                size="sm"
                variant="ghost"
                onClick={interactions.onShare}
                className="w-10 h-10 p-0 rounded-full bg-black/30 border border-white/20 text-white backdrop-blur-xl hover:bg-cyan-500/20 hover:border-cyan-400/40 hover:text-cyan-300 transition-all duration-200 shadow-lg"
              >
                <Share className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>

        {/* Additional content */}
        {children}
      </div>
    </div>
  );
}