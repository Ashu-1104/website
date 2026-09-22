'use client';

import { useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface SwiperCharacter {
  id: string;
  name: string;
  characterAvatarUrl: string | null;
  gender: string;
  style: string;
}

const CARD_W = 320;
const CARD_H = 480;

// Rest positions for each depth (index 0 = front)
const REST = [
  { x: 0,  y: 0,  rot: 0, scale: 1.00, z: 30 },
  { x: 20, y: 14, rot: 5, scale: 0.94, z: 20 },
  { x: 36, y: 26, rot: 9, scale: 0.88, z: 10 },
];

const EASE = 'cubic-bezier(0.4, 0, 0.2, 1)';

export default function HeroCardSwiper({ characters }: { characters: SwiperCharacter[] }) {
  const total = characters.length;
  const [activeIdx, setActiveIdx] = useState(0);
  const [exiting, setExiting] = useState(false);
  const [dragX, setDragX] = useState(0);
  const dragging = useRef(false);
  const dragStart = useRef(0);
  const busy = useRef(false);

  const ch = useCallback(
    (offset: number) => characters[(activeIdx + offset + total * 10) % total],
    [activeIdx, characters, total],
  );

  // Next: front card exits left → behind stack → activeIdx advances
  const goNext = useCallback(() => {
    if (busy.current || total < 2) return;
    busy.current = true;
    setExiting(true);
    setTimeout(() => {
      setActiveIdx((i) => (i + 1) % total);
      setExiting(false);
      busy.current = false;
    }, 420);
  }, [total]);

  // Prev: just jump back (instant swap is fine going backwards)
  const goPrev = useCallback(() => {
    if (busy.current || total < 2) return;
    busy.current = true;
    setActiveIdx((i) => (i - 1 + total) % total);
    setTimeout(() => { busy.current = false; }, 420);
  }, [total]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (busy.current) return;
    dragging.current = true;
    dragStart.current = e.clientX;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current || busy.current) return;
    setDragX(e.clientX - dragStart.current);
  };

  const onPointerUp = () => {
    if (!dragging.current) return;
    dragging.current = false;
    if (dragX < -60) goNext();
    else if (dragX > 60) goPrev();
    setDragX(0);
  };

  // ─── Build card descriptors ────────────────────────────────────────────────
  //
  // IDLE state:   render 3 cards — back(2), mid(1), front(0)
  // EXITING state: render 4 cards —
  //   • card at activeIdx+0 → flies left (z goes below stack)
  //   • card at activeIdx+1 → moves to REST[0] (new front)
  //   • card at activeIdx+2 → moves to REST[1] (new mid)
  //   • card at activeIdx+3 → moves to REST[2] (new back)
  //
  // Keys are stable char IDs — React keeps the DOM nodes alive across
  // phase changes so images never flash or reload.

  interface CardDef {
    key: string;
    char: SwiperCharacter;
    style: React.CSSProperties;
    showButton: boolean;
    showCounter: boolean;
    counterNum: number;
  }

  const build = (): CardDef[] => {
    const baseTransition = `transform 0.42s ${EASE}`;

    if (exiting) {
      return [
        // new back (depth 2)
        {
          key: ch(3).id,
          char: ch(3),
          style: {
            transform: `translateX(${REST[2].x}px) translateY(${REST[2].y}px) rotate(${REST[2].rot}deg) scale(${REST[2].scale})`,
            zIndex: REST[2].z,
            opacity: 1,
            transition: baseTransition,
          },
          showButton: false, showCounter: false, counterNum: 0,
        },
        // new mid (depth 1)
        {
          key: ch(2).id,
          char: ch(2),
          style: {
            transform: `translateX(${REST[1].x}px) translateY(${REST[1].y}px) rotate(${REST[1].rot}deg) scale(${REST[1].scale})`,
            zIndex: REST[1].z,
            opacity: 1,
            transition: baseTransition,
          },
          showButton: false, showCounter: false, counterNum: 0,
        },
        // new front (depth 0) — no button during transition (avoids click-through)
        {
          key: ch(1).id,
          char: ch(1),
          style: {
            transform: `translateX(${REST[0].x}px) translateY(${REST[0].y}px) rotate(${REST[0].rot}deg) scale(${REST[0].scale})`,
            zIndex: REST[0].z,
            opacity: 1,
            transition: baseTransition,
            pointerEvents: 'none' as const,
          },
          showButton: false, showCounter: true,
          counterNum: (activeIdx + 1) % total,
        },
        // exiting card — flies left + goes behind
        {
          key: ch(0).id,
          char: ch(0),
          style: {
            transform: `translateX(-320px) translateY(-10px) rotate(-20deg) scale(0.82)`,
            zIndex: 5,
            opacity: 0,
            transition: `transform 0.42s ${EASE}, opacity 0.42s ease`,
            pointerEvents: 'none' as const,
          },
          showButton: false, showCounter: false, counterNum: 0,
        },
      ];
    }

    // IDLE — 3 card stack, front draggable
    const dx = dragX;
    const dr = dragX * 0.03;
    return [
      // back
      {
        key: ch(2).id,
        char: ch(2),
        style: {
          transform: `translateX(${REST[2].x}px) translateY(${REST[2].y}px) rotate(${REST[2].rot}deg) scale(${REST[2].scale})`,
          zIndex: REST[2].z,
          opacity: 1,
          transition: baseTransition,
          pointerEvents: 'none' as const,
        },
        showButton: false, showCounter: false, counterNum: 0,
      },
      // mid
      {
        key: ch(1).id,
        char: ch(1),
        style: {
          transform: `translateX(${REST[1].x}px) translateY(${REST[1].y}px) rotate(${REST[1].rot}deg) scale(${REST[1].scale})`,
          zIndex: REST[1].z,
          opacity: 1,
          transition: baseTransition,
          pointerEvents: 'none' as const,
        },
        showButton: false, showCounter: false, counterNum: 0,
      },
      // front — follows drag
      {
        key: ch(0).id,
        char: ch(0),
        style: {
          transform: `translateX(${REST[0].x + dx}px) translateY(${REST[0].y}px) rotate(${REST[0].rot + dr}deg) scale(${REST[0].scale})`,
          zIndex: REST[0].z,
          opacity: 1,
          transition: dragging.current ? 'none' : baseTransition,
          cursor: dragging.current ? 'grabbing' : 'grab',
        },
        showButton: true, showCounter: true, counterNum: activeIdx,
      },
    ];
  };

  const cards = build();

  return (
    <div
      className="relative select-none"
      style={{ width: CARD_W + 80, height: CARD_H + 50 }}
    >
      {/* Card stack */}
      <div
        className="absolute"
        style={{ left: 40, top: 10, width: CARD_W, height: CARD_H }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        {cards.map((c) => (
          <div
            key={c.key}
            className="absolute inset-0 overflow-hidden rounded-2xl"
            style={{
              ...c.style,
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.55)',
            }}
          >
            {/* Character image */}
            {c.char.characterAvatarUrl ? (
              <Image
                src={c.char.characterAvatarUrl}
                alt={c.char.name}
                fill
                className="object-cover object-top"
                draggable={false}
                sizes="260px"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-[#ff3e8a]/20 to-[#a855f7]/30" />
            )}

            {/* Gradient + Chat button — only on front card */}
            {c.showButton && (
              <div
                className="absolute inset-x-0 bottom-0"
                style={{
                  background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.45) 55%, transparent 100%)',
                  padding: '52px 14px 14px',
                }}
              >
                <Link
                  href={`/chat/${c.char.id}`}
                  className="flex w-full items-center justify-center rounded-xl bg-[#ff3e8a] py-2.5 text-[13px] font-bold text-white shadow-lg shadow-[#ff3e8a]/30 transition hover:bg-[#ff3e8a]/90"
                  onClick={(e) => e.stopPropagation()}
                >
                  Chat with {c.char.name.split(' ')[0]}
                </Link>
              </div>
            )}

            {/* Counter badge */}
            {c.showCounter && (
              <div className="absolute right-3 top-3 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-bold text-white/80 backdrop-blur-sm">
                {c.counterNum + 1} / {total}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Prev arrow */}
      <button
        onClick={goPrev}
        aria-label="Previous character"
        className="absolute left-0 top-1/2 z-50 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition hover:bg-white/20 hover:scale-110"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      {/* Next arrow */}
      <button
        onClick={goNext}
        aria-label="Next character"
        className="absolute right-0 top-1/2 z-50 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition hover:bg-white/20 hover:scale-110"
      >
        <ChevronRight className="h-4 w-4" />
      </button>

      {/* Swipe hint */}
      <p className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[11px] text-white/25">
        ← swipe to explore →
      </p>
    </div>
  );
}
