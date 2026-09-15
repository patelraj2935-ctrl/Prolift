// Small product thumbnail that, on hover, pops up a larger image + name.
// The popover is fixed-positioned AND rendered in a portal to <body>, so it can
// never be clipped by scrollable/overflow/transformed ancestors (e.g. the
// line-items table or the overflow-hidden <main>). The preview is a fixed,
// consistent card and the image fills it (object-cover) — cleanly cropped.
import { useState } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  src?: string;
  name: string;
  size?: number; // thumbnail size in px
}

const POP_W = 280;  // preview card width
const POP_IMG_H = 200; // preview image height
const LABEL_H = 34; // caption height under the image

export function ProductThumb({ src, name, size = 40 }: Props) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  if (!src) return null;

  const show = (e: React.MouseEvent<HTMLImageElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const totalH = POP_IMG_H + LABEL_H;
    let x = r.right + 8;
    if (x + POP_W > window.innerWidth) x = r.left - POP_W - 8; // flip left if no room
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
          style={{ left: pos.x, top: pos.y, width: POP_W }}
        >
          <img
            src={src}
            alt={name}
            style={{ width: POP_W, height: POP_IMG_H }}
            className="block bg-white object-cover"
          />
          <div className="truncate px-2 py-2 text-center text-xs font-semibold text-slate-700">{name}</div>
        </div>,
        document.body,
      )}
    </>
  );
}
