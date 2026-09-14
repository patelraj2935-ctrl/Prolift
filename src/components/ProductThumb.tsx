// Small product thumbnail that, on hover, pops up the full image + name.
// Uses a fixed-position popover (computed from the thumb's rect) so it never
// gets clipped by scrollable/overflow containers like the line-items table.
import { useState } from 'react';

interface Props {
  src?: string;
  name: string;
  size?: number; // thumbnail size in px
}

const POP_W = 240;
const POP_H = 272;

export function ProductThumb({ src, name, size = 40 }: Props) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  if (!src) return null;

  const show = (e: React.MouseEvent<HTMLImageElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    let x = r.right + 8;
    if (x + POP_W > window.innerWidth) x = r.left - POP_W - 8; // flip to the left if no room
    let y = r.top;
    if (y + POP_H > window.innerHeight) y = window.innerHeight - POP_H - 8;
    if (y < 8) y = 8;
    setPos({ x, y });
  };

  return (
    <>
      <img
        src={src}
        alt={name}
        style={{ height: size, width: size }}
        className="flex-none cursor-zoom-in rounded border border-slate-200 object-cover"
        onMouseEnter={show}
        onMouseLeave={() => setPos(null)}
      />
      {pos && (
        <div
          className="animate-fade-in pointer-events-none fixed z-[100] overflow-hidden rounded-lg bg-white shadow-2xl ring-1 ring-black/5"
          style={{ left: pos.x, top: pos.y, width: POP_W }}
        >
          <img src={src} alt={name} className="block h-60 w-60 object-cover" />
          <div className="truncate px-2 py-1.5 text-center text-xs font-semibold text-slate-700">{name}</div>
        </div>
      )}
    </>
  );
}
