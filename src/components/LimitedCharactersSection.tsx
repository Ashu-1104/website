'use client';

import React from 'react';
import CharacterCard from './CharacterCard';
import { useCharacters } from '@/hooks/useApi';
import { apiCharacterToLegacy, APICharacter } from '@/types';

export function LimitedCharactersSection() {
  const { data, loading, error } = useCharacters({ limit: 4 });

  if (loading) {
    return (
      <section className="py-8">
        <h2 className="text-2xl font-semibold mb-4">Limited Characters</h2>
        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="aspect-[3/4] rounded-2xl bg-gray-800 animate-pulse" />
          ))}
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="py-8">
        <h2 className="text-2xl font-semibold mb-4">Limited Characters</h2>
        <p className="text-red-400">Failed to load characters</p>
      </section>
    );
  }

  const characters = (data?.items || []).map((c) =>
    apiCharacterToLegacy(c as unknown as APICharacter)
  );

  return (
    <section className="py-8">
      <h2 className="text-2xl font-semibold mb-4">Limited Characters</h2>
      <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
        {characters.map((c) => (
          <CharacterCard key={c.id} character={c} />
        ))}
      </div>
    </section>
  );
}
