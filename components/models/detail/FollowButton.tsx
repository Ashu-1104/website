'use client';

import { useCallback, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { useUser } from '@/context/UserContext';

type FollowState = 'none' | 'pending' | 'following';

interface FollowButtonProps {
  userId: string;
  className?: string;
  initialState?: FollowState;
  onFollowChange?: (newState: FollowState) => void;
}

export default function FollowButton({
  userId,
  className,
  initialState = 'none',
  onFollowChange,
}: FollowButtonProps) {
  const { headers, userId: currentUserId } = useUser();
  const [state, setState] = useState<FollowState>(initialState);
  const [isLoading, setIsLoading] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);

  // Fetch initial follow state from API
  useEffect(() => {
    if (!currentUserId || currentUserId === userId || hasFetched) return;

    async function checkFollowStatus() {
      try {
        const response = await fetch(`/api/user/follow?check=${userId}`, {
          headers,
        });
        if (response.ok) {
          const data = await response.json();
          if (data.followStatus) {
            setState(data.followStatus as FollowState);
          }
        }
      } catch (error) {
        console.error('Error checking follow status:', error);
      } finally {
        setHasFetched(true);
      }
    }

    checkFollowStatus();
  }, [userId, currentUserId, headers, hasFetched]);

  const handleClick = useCallback(
    async (e: React.MouseEvent) => {
      // Stop propagation to prevent triggering parent Link clicks
      e.preventDefault();
      e.stopPropagation();

      if (isLoading || !currentUserId || currentUserId === userId) return;

      setIsLoading(true);
      try {
        if (state === 'none') {
          // Follow
          const response = await fetch('/api/user/follow', {
            method: 'POST',
            headers: {
              ...headers,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ userId }),
          });

          if (response.ok) {
            const data = await response.json();
            const newState = data.status === 'PENDING' ? 'pending' : 'following';
            setState(newState);
            onFollowChange?.(newState);
          }
        } else {
          // Unfollow (works for both pending and following)
          const response = await fetch('/api/user/follow', {
            method: 'DELETE',
            headers: {
              ...headers,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ userId }),
          });

          if (response.ok) {
            setState('none');
            onFollowChange?.('none');
          }
        }
      } catch (error) {
        console.error('Error toggling follow:', error);
      } finally {
        setIsLoading(false);
      }
    },
    [state, userId, currentUserId, headers, isLoading, onFollowChange]
  );

  // Don't show button for own profile or if no user is logged in
  if (!currentUserId || currentUserId === userId) return null;

  const buttonText =
    state === 'none' ? 'Follow' : state === 'pending' ? 'Requested' : 'Following';

  const buttonStyle =
    state === 'none'
      ? 'bg-gradient-to-r from-[#ff3e8a] to-[#9b59b6] text-white hover:opacity-90'
      : state === 'pending'
        ? 'bg-white/10 text-white/70 hover:bg-white/15'
        : 'bg-white/10 text-white hover:bg-white/15';

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isLoading}
      className={cn(
        'inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-semibold transition-colors',
        buttonStyle,
        isLoading && 'opacity-50 cursor-not-allowed',
        className
      )}
      aria-pressed={state !== 'none'}
    >
      {isLoading ? '...' : buttonText}
    </button>
  );
}
