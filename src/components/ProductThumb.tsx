// Small product thumbnail that, on hover, pops up the full image + name.
// The popover is fixed-positioned AND rendered in a portal to <body>, so it can
// never be clipped by scrollable/overflow/transformed ancestors (e.g. the
// line-items table or the overflow-hidden <main>).
import { useState } from 'react';
import { createPortal } from 'react-dom';

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
        className="flex-none cursor-zoom-in rounded border border-slate-200 bg-white object-contain"
        onMouseEnter={show}
        onMouseLeave={() => setPos(null)}
      />
      {pos && createPortal(
        <div
          className="animate-fade-in pointer-events-none fixed z-[100] overflow-hidden rounded-lg bg-white shadow-2xl ring-1 ring-black/5"
          style={{ left: pos.x, top: pos.y, width: POP_W }}
        >
          <img src={src} alt={name} className="block h-60 w-full bg-white object-contain p-4" />
          <div className="truncate px-2 py-1.5 text-center text-xs font-semibold text-slate-700">{name}</div>
        </div>,
        document.body,
      )}
    </>
  );
}
