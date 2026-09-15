// Small product thumbnail that, on hover, pops up the COMPLETE image + name.
// The popover is fixed-positioned AND rendered in a portal to <body>, so it can
// never be clipped by scrollable/overflow/transformed ancestors. The image is
// shown in full (object-contain) inside a card sized to the image's natural
// aspect ratio — whatever image was uploaded/cropped is shown completely, never
// cut and without ugly letterbox bands.
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  src?: string;
  name: string;
  size?: number; // thumbnail size in px
}

const MAX_SIDE = 300; // longest side of the preview image, in px
const LABEL_H = 34;   // approx caption height under the image

export function ProductThumb({ src, name, size = 40 }: Props) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null);
  const natural = useRef<{ w: number; h: number } | null>(null);

  // Preload to learn the true aspect ratio so the card can be sized/positioned
  // before it appears (no flash / reflow on hover).
  useEffect(() => {
    if (!src) { natural.current = null; setDims(null); return; }
    const img = new Image();
    img.onload = () => {
      if (img.naturalWidth && img.naturalHeight) {
        natural.current = { w: img.naturalWidth, h: img.naturalHeight };
        const scale = Math.min(MAX_SIDE / img.naturalWidth, MAX_SIDE / img.naturalHeight, 1);
        setDims({ w: Math.round(img.naturalWidth * scale), h: Math.round(img.naturalHeight * scale) });
      }
    };
    img.src = src;
  }, [src]);

  if (!src) return null;

  const box = dims ?? { w: MAX_SIDE, h: MAX_SIDE };

  const show = (e: React.MouseEvent<HTMLImageElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const totalH = box.h + LABEL_H;
    let x = r.right + 8;
    if (x + box.w > window.innerWidth) x = r.left - box.w - 8; // flip left if no room
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
        className="flex-none cursor-zoom-in rounded border border-slate-200 bg-white object-cover"
        onMouseEnter={show}
        onMouseLeave={() => setPos(null)}
      />
      {pos && createPortal(
        <div
          className="animate-fade-in pointer-events-none fixed z-[100] overflow-hidden rounded-lg bg-white shadow-2xl ring-1 ring-black/5"
          style={{ left: pos.x, top: pos.y, width: box.w }}
        >
          {/* Card matches the image aspect, so object-contain fills it exactly —
              the whole uploaded/cropped image is shown, never cut. */}
          <img
            src={src}
            alt={name}
            style={{ width: box.w, height: box.h }}
            className="block bg-white object-contain"
          />
          <div className="truncate px-2 py-2 text-center text-xs font-semibold text-slate-700">{name}</div>
        </div>,
        document.body,
      )}
    </>
  );
}
