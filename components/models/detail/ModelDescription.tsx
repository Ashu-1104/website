'use client';

import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';

export default function ModelDescription({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);

  const previewText = useMemo(() => {
    const normalized = text.replace(/\s+/g, ' ').trim();
    if (normalized.length <= 200) return normalized;
    return `${normalized.slice(0, 200)}…`;
  }, [text]);

  const hasMore = useMemo(() => {
    const normalized = text.replace(/\s+/g, ' ').trim();
    return normalized.length > previewText.length;
  }, [previewText.length, text]);

  return (
    <section className="model-detail-section-card" aria-label="Description">
      <div className="model-detail-section-header">
        <h2 className="model-detail-section-title">Description</h2>
      </div>

      <p className={cn('model-detail-description', expanded ? 'whitespace-pre-line' : 'whitespace-normal')}>
        {expanded ? text : previewText}
      </p>

      {hasMore && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="model-detail-view-more"
        >
          {expanded ? 'View Less' : 'View More'}
        </button>
      )}
    </section>
  );
}

