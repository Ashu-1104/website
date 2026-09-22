'use client';

import Link from 'next/link';
import { useCharacters } from '@/hooks/useApi';

export default function CharacterGridSection() {
  const { data, loading, error } = useCharacters({ limit: 8 });

  if (loading) {
    return (
      <section className="character-grid-section">
        <div className="section-header">
          <h2 className="section-title">Characters</h2>
        </div>
        <div className="livecam-grid">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="livecam-card animate-pulse">
              <div className="livecam-card-image bg-gray-700"></div>
              <div className="livecam-card-info">
                <span className="livecam-card-name bg-gray-600 h-4 w-20 rounded"></span>
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="character-grid-section">
        <div className="section-header">
          <h2 className="section-title">Characters</h2>
        </div>
        <p className="text-red-400 text-center py-8">Failed to load characters</p>
      </section>
    );
  }

  const characters = data?.items || [];

  return (
    <section className="character-grid-section">
      <div className="section-header">
        <h2 className="section-title">Characters</h2>
      </div>
      <div className="livecam-grid">
        {characters.map((character) => {
          const metadata = character.metadata as { isOnline?: boolean } | null;
          const isOnline = metadata?.isOnline ?? false;

          return (
            <Link
              key={character.id}
              href={`/chat/${character.id}`}
              className="livecam-card"
            >
              <div className="livecam-card-image">
                <div className="livecam-card-gradient"></div>

                {isOnline && (
                  <div className="livecam-card-badge">
                    <span className="livecam-card-badge-dot"></span>
                    Online
                  </div>
                )}
              </div>

              <div className="livecam-card-info">
                {isOnline && <span className="livecam-card-status"></span>}
                <span className="livecam-card-name">{character.name}</span>
                <span className="livecam-card-age">({character.age})</span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
