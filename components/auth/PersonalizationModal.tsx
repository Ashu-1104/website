'use client';

import { useState, useEffect, FormEvent } from 'react';
import { User, Save } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export default function PersonalizationModal() {
  const { user, needsPersonalization, setNickname, refreshUser } = useAuth();
  const [nickname, setNicknameValue] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Pre-fill with existing handle if available
  useEffect(() => {
    if (user?.handle) {
      setNicknameValue(user.handle);
    }
  }, [user?.handle]);

  // Prevent closing with escape - user must complete this step
  useEffect(() => {
    if (!needsPersonalization) return;

    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [needsPersonalization]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedNickname = nickname.trim();

    // Validate nickname
    if (!trimmedNickname) {
      setError('Nickname is required');
      return;
    }

    if (trimmedNickname.length < 3) {
      setError('Nickname must be at least 3 characters');
      return;
    }

    if (trimmedNickname.length > 20) {
      setError('Nickname must be 20 characters or less');
      return;
    }

    // Only allow alphanumeric and underscores
    if (!/^[a-zA-Z0-9_]+$/.test(trimmedNickname)) {
      setError('Nickname can only contain letters, numbers, and underscores');
      return;
    }

    setIsLoading(true);

    const result = await setNickname(trimmedNickname.toLowerCase());

    if (result.success) {
      await refreshUser();
    } else {
      setError(result.error || 'Failed to set nickname');
      setIsLoading(false);
    }
  };

  if (!needsPersonalization) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-background-primary rounded-2xl p-8 shadow-2xl">
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h2 className="text-2xl font-bold text-white italic">
              Personalize Your AI Experience
            </h2>
            <p className="mt-2 text-text-secondary text-sm">
              It will help to customize your interactions with the AI characters.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Error Message */}
            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Nickname Input */}
            <div className="space-y-1.5">
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNicknameValue(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                  placeholder="Nickname"
                  required
                  disabled={isLoading}
                  maxLength={20}
                  className="w-full pl-12 pr-4 py-4 rounded-xl bg-white/5 border border-white/20 text-white placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-pink/50 focus:border-transparent disabled:opacity-50 text-lg"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || !nickname.trim()}
              className="w-full py-4 rounded-xl bg-accent-pink hover:bg-accent-pink/90 text-white font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-lg"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Save
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
