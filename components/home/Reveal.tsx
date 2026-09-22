'use client';

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';

type Variant = 'up' | 'down' | 'left' | 'right' | 'scale' | 'fade' | 'blur';

interface RevealProps {
  children: ReactNode;
  variant?: Variant;
  delay?: number;
  duration?: number;
  once?: boolean;
  className?: string;
  as?: keyof JSX.IntrinsicElements;
  threshold?: number;
  rootMargin?: string;
  style?: CSSProperties;
}

export default function Reveal({
  children,
  variant = 'up',
  delay = 0,
  duration = 700,
  once = true,
  className = '',
  as: Tag = 'div',
  threshold = 0.15,
  rootMargin = '0px 0px -60px 0px',
  style,
}: RevealProps) {
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
            if (once) io.unobserve(entry.target);
          } else if (!once) {
            setVisible(false);
          }
        });
      },
      { threshold, rootMargin },
    );

    io.observe(node);
    return () => io.disconnect();
  }, [once, threshold, rootMargin]);

  const mergedStyle: CSSProperties = {
    transitionDelay: `${delay}ms`,
    transitionDuration: `${duration}ms`,
    ...style,
  };

  const Component = Tag as any;

  return (
    <Component
      ref={ref as any}
      data-reveal={variant}
      data-visible={visible ? 'true' : 'false'}
      className={`reveal ${className}`}
      style={mergedStyle}
    >
      {children}
    </Component>
  );
}
