'use client';

import { useEffect, useState } from 'react';
import styles from './ChatGeneratingCard.module.css';

type GeneratingType = 'image' | 'video' | 'edit';

const STEPS: Record<GeneratingType, string[]> = {
  image: [
    'Analyzing your prompt...',
    'Composing the scene...',
    'Rendering pixels...',
    'Applying style...',
    'Adding final touches...',
  ],
  video: [
    'Processing your request...',
    'Building scene composition...',
    'Rendering frames...',
    'Encoding video...',
    'Almost there...',
  ],
  edit: [
    'Analyzing the image...',
    'Understanding your edits...',
    'Applying transformations...',
    'Refining details...',
    'Finalizing edit...',
  ],
};

const LABELS: Record<GeneratingType, string> = {
  image: 'Generating Image',
  video: 'Generating Video',
  edit: 'Editing Image',
};

type ChatGeneratingCardProps = {
  type: GeneratingType;
};

export default function ChatGeneratingCard({ type }: ChatGeneratingCardProps) {
  const steps = STEPS[type];
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setStepIndex((prev) => (prev + 1) % steps.length);
    }, 3000);
    return () => window.clearInterval(id);
  }, [steps.length]);

  return (
    <div className={styles.card}>
      <div className={styles.spinner} />
      <div className={styles.content}>
        <span className={styles.label}>{LABELS[type]}</span>
        <span className={styles.step}>{steps[stepIndex]}</span>
      </div>
    </div>
  );
}
