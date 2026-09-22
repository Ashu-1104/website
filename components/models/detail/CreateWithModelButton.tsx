'use client';

import { useRouter } from 'next/navigation';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CreateWithModelButtonProps {
  modelId: string;
  modelName: string;
  thumbnailUrl: string | null;
}

export default function CreateWithModelButton({ modelId, modelName }: CreateWithModelButtonProps) {
  const router = useRouter();

  const handleClick = () => {
    try {
      sessionStorage.setItem(
        'vp_remix_data',
        JSON.stringify({
          checkpoint: {
            name: modelName,
            modelId,
          },
        })
      );
    } catch { /* ignore quota errors */ }
    router.push('/create?type=text-to-image&remix=1');
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn('btn-primary', 'model-detail-create')}
    >
      <Sparkles className="w-5 h-5" aria-hidden="true" />
      Create
    </button>
  );
}
