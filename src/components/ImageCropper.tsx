// In-app image cropper for product photos. Shows the picked image, lets the
// user drag a crop box (free aspect), then renders the cropped region to a
// downscaled JPEG data URL — so whatever the user crops is exactly what's
// stored and shown (fully) in the hover preview.
import { useRef, useState } from 'react';
import ReactCrop, { type Crop, type PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

const MAX_SIDE = 600; // downscale the cropped result so localStorage stays small

export function ImageCropper({
  src, onCancel, onCropped,
}: {
  src: string;
  onCancel: () => void;
  onCropped: (dataUrl: string) => void;
}) {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completed, setCompleted] = useState<PixelCrop | null>(null);

  // Default the crop box to (almost) the whole image.
  const onImageLoad = () => {
    setCrop({ unit: '%', x: 2, y: 2, width: 96, height: 96 });
  };

  const apply = () => {
    const image = imgRef.current;
    if (!image) return;
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    // Fall back to the full image if the user didn't draw a box.
    const cx = completed ? completed.x * scaleX : 0;
    const cy = completed ? completed.y * scaleY : 0;
    const cw = completed ? completed.width * scaleX : image.naturalWidth;
    const ch = completed ? completed.height * scaleY : image.naturalHeight;
    if (cw < 1 || ch < 1) { onCropped(src); return; }

    const scale = Math.min(1, MAX_SIDE / Math.max(cw, ch));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(cw * scale);
    canvas.height = Math.round(ch * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) { onCropped(src); return; }
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, cx, cy, cw, ch, 0, 0, canvas.width, canvas.height);
    onCropped(canvas.toDataURL('image/jpeg', 0.85));
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4" onClick={onCancel}>
      <div className="flex max-h-full w-full max-w-xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="border-b p-4">
          <h3 className="text-lg font-bold text-slate-800">Crop Image</h3>
          <p className="text-xs text-slate-500">Drag to select the area to keep. The cropped image is shown in full on hover.</p>
        </div>
        <div className="flex-1 overflow-auto bg-slate-100 p-4 text-center">
          <ReactCrop crop={crop} onChange={(c) => setCrop(c)} onComplete={(c) => setCompleted(c)}>
            {/* eslint-disable-next-line jsx-a11y/img-redundant-alt */}
            <img ref={imgRef} src={src} alt="Crop preview" onLoad={onImageLoad} style={{ maxHeight: '55vh' }} />
          </ReactCrop>
        </div>
        <div className="flex justify-end gap-3 border-t p-4">
          <button className="btn-secondary" onClick={onCancel}>Cancel</button>
          <button className="btn-primary" onClick={apply}>Apply Crop</button>
        </div>
      </div>
    </div>
  );
}
