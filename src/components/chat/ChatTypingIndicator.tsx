'use client';

import styles from './ChatTypingIndicator.module.css';

type ChatTypingIndicatorProps = {
  characterName: string;
};

export default function ChatTypingIndicator({ characterName }: ChatTypingIndicatorProps) {
  return (
    <div className={styles.container}>
      <span className={styles.text}>{characterName} is typing</span>
      <span className={styles.dots}>
        <span className={styles.dot} />
        <span className={styles.dot} />
        <span className={styles.dot} />
      </span>
    </div>
  );
}
