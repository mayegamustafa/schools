'use client';

import { useEffect, useRef, useState, type ElementType, type ReactNode } from 'react';

interface RevealProps {
  children: ReactNode;
  /** Tailwind/utility classes applied to the wrapper */
  className?: string;
  /** Animation style */
  variant?: 'up' | 'scale';
  /** Stagger delay in milliseconds */
  delay?: number;
  /** Render as a different element (default: div) */
  as?: ElementType;
  /** Re-trigger every time it enters the viewport */
  once?: boolean;
}

/**
 * Lightweight, dependency-free scroll-reveal wrapper.
 * Adds `is-visible` when the element scrolls into view, driving the
 * `.reveal` / `.reveal-scale` transitions defined in globals.css.
 */
export default function Reveal({
  children,
  className = '',
  variant = 'up',
  delay = 0,
  as,
  once = true,
}: RevealProps) {
  const Tag = (as || 'div') as ElementType;
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
            if (once) observer.unobserve(entry.target);
          } else if (!once) {
            setVisible(false);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [once]);

  const base = variant === 'scale' ? 'reveal-scale' : 'reveal';

  return (
    <Tag
      ref={ref}
      className={`${base}${visible ? ' is-visible' : ''} ${className}`}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  );
}
