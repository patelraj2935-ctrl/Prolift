// Small product thumbnail that, on hover, pops up the full image + name.
// The popover is fixed-positioned AND rendered in a portal to <body>, so it can
// never be clipped by scrollable/overflow/transformed ancestors (e.g. the
// line-items table or the overflow-hidden <main>). Its box is sized to the
// image's natural aspect ratio — wide for landscape photos, tall for portrait —
// so nothing is ever cropped or letterboxed.
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  src?: string;
  name: string;
  size?: number; // thumbnail size in px
}

const MAX_SIDE = 280; // longest side of the preview image, in px
const LABEL_H = 30;   // approx height of the name caption under the image

export function ProductThumb({ src, name, size = 40 }: Props) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  // Natural pixel dimensions of the image, once known.
  const natural = useRef<{ w: number; h: number } | null>(null);
  const [box, setBox] = useState<{ w: number; h: number } | null>(null);

  // Preload the image to learn its true aspect ratio (so the popup can size
  // itself before it appears — no reflow/jump on hover).
  useEffect(() => {
    if (!src) return;
    const img = new Image();
    img.onload = () => {
      if (img.naturalWidth && img.naturalHeight) {
        natural.current = { w: img.naturalWidth, h: img.naturalHeight };
      }
    };
    img.src = src;
  }, [src]);

  if (!src) return null;

  // Scale the natural size down so the longest side is MAX_SIDE (never upscale).
  const boxFor = (): { w: number; h: number } => {
    const n = natural.current;
    if (!n) return { w: MAX_SIDE, h: MAX_SIDE }; // fallback until dims are known
    const scale = Math.min(MAX_SIDE / n.w, MAX_SIDE / n.h, 1);
    return { w: Math.round(n.w * scale), h: Math.round(n.h * scale) };
  };

  const show = (e: React.MouseEvent<HTMLImageElement>) => {
    const b = boxFor();
    setBox(b);
    const r = e.currentTarget.getBoundingClientRect();
    const totalH = b.h + LABEL_H;
    let x = r.right + 8;
    if (x + b.w > window.innerWidth) x = r.left - b.w - 8; // flip left if no room
    if (x < 8) x = 8;
    let y = r.top;
    if (y + totalH > window.innerHeight) y = window.innerHeight - totalH - 8;
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
      {pos && box && createPortal(
        <div
          className="animate-fade-in pointer-events-none fixed z-[100] overflow-hidden rounded-lg bg-white shadow-2xl ring-1 ring-black/5"
          style={{ left: pos.x, top: pos.y, width: box.w }}
        >
          <img
            src={src}
            alt={name}
            style={{ width: box.w, height: box.h }}
            className="block bg-white object-contain"
          />
          <div className="truncate px-2 py-1.5 text-center text-xs font-semibold text-slate-700" style={{ width: box.w }}>{name}</div>
        </div>,
        document.body,
      )}
    </>
  );
}
