// Small product thumbnail that, on hover, pops up the full image + name.
// The popover is fixed-positioned AND rendered in a portal to <body>, so it can
// never be clipped by scrollable/overflow/transformed ancestors (e.g. the
// line-items table or the overflow-hidden <main>). The image renders at its
// natural aspect ratio (capped at MAX_SIDE) and the white card shrink-wraps it,
// so the border hugs the photo — wide for landscape, tall for portrait — and
// nothing is ever cropped or letterboxed.
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
  // Natural pixel dimensions of the image, once known (for positioning math).
  const natural = useRef<{ w: number; h: number } | null>(null);

  // Preload the image to learn its true aspect ratio, so the popup can be
  // positioned correctly before it appears.
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

  // Rendered preview size = natural scaled so the longest side is MAX_SIDE
  // (never upscaled). Used only to position/flip the popup near the viewport edge.
  const renderedSize = (): { w: number; h: number } => {
    const n = natural.current;
    if (!n) return { w: MAX_SIDE, h: MAX_SIDE };
    const scale = Math.min(MAX_SIDE / n.w, MAX_SIDE / n.h, 1);
    return { w: Math.round(n.w * scale), h: Math.round(n.h * scale) };
  };

  const show = (e: React.MouseEvent<HTMLImageElement>) => {
    const s = renderedSize();
    const r = e.currentTarget.getBoundingClientRect();
    const totalH = s.h + LABEL_H;
    let x = r.right + 8;
    if (x + s.w > window.innerWidth) x = r.left - s.w - 8; // flip left if no room
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
      {pos && createPortal(
        <div
          className="animate-fade-in pointer-events-none fixed z-[100] inline-block overflow-hidden rounded-lg bg-white p-2 shadow-2xl ring-1 ring-black/5"
          style={{ left: pos.x, top: pos.y }}
        >
          {/* No fixed width/height and no object-fit: the image keeps its natural
              aspect ratio (just scaled down to fit MAX_SIDE), so it can never be
              cropped, and the card wraps tightly around it. */}
          <img
            src={src}
            alt={name}
            style={{ maxWidth: MAX_SIDE, maxHeight: MAX_SIDE }}
            className="block h-auto w-auto rounded"
          />
          <div className="truncate px-1 pt-1.5 text-center text-xs font-semibold text-slate-700">{name}</div>
        </div>,
        document.body,
      )}
    </>
  );
}
