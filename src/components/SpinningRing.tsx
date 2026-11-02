import React from 'react';
import { WINDOWS_LOADING_GIF } from '../constants/assets';

export const SPINNING_RING_GIF_URL = WINDOWS_LOADING_GIF;
export const SPINNING_RING_GIF_LOOP_DURATION_MS = 114 * 30;

interface SpinningRingProps {
  size?: number;
  /** Retained for existing call sites; the shared GIF defines its own indicator style. */
  strokeWidth?: number;
  className?: string;
  ariaLabel?: string;
  onGifReady?: () => void;
}

export const SpinningRing: React.FC<SpinningRingProps> = ({
  size = 48,
  className = '',
  ariaLabel = 'Đang tải...',
  onGifReady,
}) => (
  <div
    role="status"
    aria-label={ariaLabel}
    className={`inline-flex items-center justify-center select-none pointer-events-none ${className}`}
    style={{ width: size, height: size }}
  >
    <img
      src={SPINNING_RING_GIF_URL}
      alt=""
      aria-hidden="true"
      className="h-full w-full object-contain select-none pointer-events-none"
      draggable={false}
      loading="eager"
      decoding="async"
      onLoad={onGifReady}
      onError={onGifReady}
    />
  </div>
);
