'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Heart, MessageCircle, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { isChatLiked, toggleChatLike } from '@/lib/chat/localStats';
import type { Character } from '@/types';

interface CharacterCardProps {
  character: Character;
  index?: number;
}

export default function CharacterCard({ character, index = 0 }: CharacterCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);

  useEffect(() => {
    setIsFavorited(isChatLiked(character.id));
  }, [character.id]);

  return (
    <Link
      href={`/chat/${character.id}`}
      className="group block"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        animationDelay: `${index * 100}ms`,
      }}
    >
      <div className="relative rounded-2xl overflow-hidden bg-background-card card-hover aspect-[3/4]">
        {/* Character Image */}
        <div className="absolute inset-0">
          {!imageError ? (
            <Image
              src={character.image}
              alt={character.name}
              fill
              className={cn(
                'object-cover transition-transform duration-500',
                isHovered && 'scale-110'
              )}
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-accent-pink/20 to-accent-purple/20 flex items-center justify-center">
              <Sparkles className="w-12 h-12 text-accent-pink/50" />
            </div>
          )}
        </div>

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-80" />

        {/* Online Indicator */}
        {character.isOnline && (
          <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2 py-1 rounded-full bg-green-500/20 backdrop-blur-sm">
            <div className="w-2 h-2 rounded-full bg-green-500 pulse-live" />
            <span className="text-xs text-green-400 font-medium">Online</span>
          </div>
        )}

        {/* Livecam Badge */}
        {character.isLivecam && (
          <div className="absolute top-3 left-3 px-2 py-1 rounded-full bg-red-500/80 backdrop-blur-sm">
            <span className="text-xs text-white font-medium">LIVE</span>
          </div>
        )}

        {/* Content */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          {/* Name and Age */}
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-lg font-display font-semibold text-white">
              {character.name}
            </h3>
            <span className="text-text-secondary text-sm">
              ({character.age})
            </span>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {character.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="character-tag text-[10px] sm:text-xs"
              >
                #{tag}
              </span>
            ))}
          </div>

          {/* Description */}
          <p className="text-xs sm:text-sm text-text-secondary line-clamp-2 mb-3">
            {character.description}
          </p>

          {/* Role */}
          <p className="text-xs text-accent-pink font-medium">
            {character.role}
          </p>
        </div>

        {/* Hover Actions */}
        <div
          className={cn(
            'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-3 transition-all duration-300',
            isHovered
              ? 'opacity-100 scale-100'
              : 'opacity-0 scale-90 pointer-events-none'
          )}
        >
          <button
            onClick={(e) => {
              e.preventDefault();
              setIsFavorited(toggleChatLike(character.id));
            }}
            className={cn(
              'p-3 rounded-full backdrop-blur-md transition-colors',
              isFavorited ? 'bg-accent-pink/25 hover:bg-accent-pink/30' : 'bg-white/10 hover:bg-white/20'
            )}
            aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
          >
            <Heart
              className={cn('w-5 h-5', isFavorited ? 'text-accent-pink' : 'text-white')}
              fill={isFavorited ? 'currentColor' : 'none'}
            />
          </button>
          <button
            onClick={(e) => {
              e.preventDefault();
              // Navigate to chat
            }}
            className="p-4 rounded-full bg-gradient-primary hover:scale-110 transition-transform shadow-glow"
            aria-label="Start Chat"
          >
            <MessageCircle className="w-6 h-6 text-white" />
          </button>
          <button
            onClick={(e) => {
              e.preventDefault();
              // Handle save action
            }}
            className="p-3 rounded-full bg-white/10 backdrop-blur-md hover:bg-white/20 transition-colors"
            aria-label="Save"
          >
            <Sparkles className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>
    </Link>
  );
}
