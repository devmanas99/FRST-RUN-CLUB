import React, { useCallback, useState } from 'react';
import Cropper, { Area } from 'react-easy-crop';
import { X, ZoomIn, ZoomOut } from 'lucide-react';
import { PixelCropArea } from '../lib/firebase';

interface ImageCropModalProps {
  imageSrc: string;
  kind: 'avatar' | 'banner';
  uploading: boolean;
  progress: number;
  errorMessage: string | null;
  onCancel: () => void;
  onSave: (croppedPixels: PixelCropArea) => Promise<void>;
}

export const ImageCropModal: React.FC<ImageCropModalProps> = ({
  imageSrc,
  kind,
  uploading,
  progress,
  errorMessage,
  onCancel,
  onSave,
}) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<PixelCropArea | null>(null);

  const onCropComplete = useCallback((_croppedArea: Area, croppedPixels: Area) => {
    setCroppedAreaPixels({
      x: croppedPixels.x,
      y: croppedPixels.y,
      width: croppedPixels.width,
      height: croppedPixels.height,
    });
  }, []);

  const handleSaveClick = async () => {
    if (!croppedAreaPixels || uploading) return;
    await onSave(croppedAreaPixels);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={kind === 'avatar' ? 'Crop profile photo' : 'Crop banner image'}
      className="fixed inset-0 z-50 bg-black/75 flex flex-col justify-between p-4"
    >
      <div className="w-full max-w-[448px] mx-auto flex items-center justify-between py-2 text-[#F7F5F0]">
        <div>
          <h2 className="font-display text-[24px] leading-none">
            {kind === 'avatar' ? 'Crop Profile Photo' : 'Crop Banner (3:1)'}
          </h2>
          <p className="text-[13px] text-[#B8B3A8] mt-1">
            Drag and pinch or slide to adjust
          </p>
        </div>
        <button
          type="button"
          disabled={uploading}
          onClick={onCancel}
          aria-label="Cancel crop"
          className="w-11 h-11 rounded-full border border-white/20 flex items-center justify-center text-[#F7F5F0] cursor-pointer disabled:opacity-50"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Interactive Cropper Area */}
      <div className="relative w-full max-w-[448px] mx-auto flex-1 max-h-[360px] rounded-[14px] overflow-hidden bg-[#141312] border border-white/15 my-3">
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          aspect={kind === 'avatar' ? 1 : 3 / 1}
          cropShape={kind === 'avatar' ? 'round' : 'rect'}
          showGrid={false}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={onCropComplete}
        />
      </div>

      {/* Controls & Upload Progress */}
      <div className="w-full max-w-[448px] mx-auto club-card p-4 space-y-4">
        {/* Zoom slider */}
        <div className="flex items-center gap-3">
          <ZoomOut className="w-4 h-4 text-[var(--muted)] shrink-0" />
          <input
            type="range"
            aria-label="Zoom image"
            min={1}
            max={3}
            step={0.05}
            disabled={uploading}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-full accent-[var(--accent)] cursor-pointer"
          />
          <ZoomIn className="w-4 h-4 text-[var(--muted)] shrink-0" />
        </div>

        {/* Upload progress bar */}
        {uploading && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-small font-medium text-[var(--text)]">
              <span>Optimizing & uploading...</span>
              <span className="tabular-nums">{progress}%</span>
            </div>
            <div className="w-full h-2 bg-[var(--divider)] rounded-full overflow-hidden">
              <div
                className="h-full bg-[var(--accent)] transition-all duration-150"
                style={{ width: `${Math.max(8, progress)}%` }}
              />
            </div>
          </div>
        )}

        {errorMessage && (
          <p role="alert" className="text-small font-semibold text-[var(--accent)]">
            {errorMessage}
          </p>
        )}

        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={uploading}
            onClick={handleSaveClick}
            className="flex-1 btn-primary disabled:opacity-60"
          >
            {uploading ? `Uploading ${progress}%` : 'Save'}
          </button>
          <button
            type="button"
            disabled={uploading}
            onClick={onCancel}
            className="px-4 h-[48px] btn-secondary disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
