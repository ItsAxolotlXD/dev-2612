import { createPortal } from 'react-dom';
import { useEffect, useRef } from 'react';

interface AppNativeCursorProps {
  enabled: boolean;
}

interface PointerPosition {
  x: number;
  y: number;
}

type NativeCursorState = 'normal' | 'hand-select' | 'text-select';

export const AppNativeCursor = ({ enabled }: AppNativeCursorProps) => {
  const cursorRef = useRef<HTMLDivElement>(null);
  const lastPointerPositionRef = useRef<PointerPosition | null>(null);

  useEffect(() => {
    const updateCursor = ({ x, y }: PointerPosition) => {
      lastPointerPositionRef.current = { x, y };

      const cursor = cursorRef.current;
      if (!enabled || !cursor) return;

      if (x < 0 || y < 0 || x > window.innerWidth || y > window.innerHeight) {
        cursor.style.opacity = '0';
        return;
      }

      const appRoot = document.getElementById('sparkle-app-root');
      const appBounds = appRoot?.getBoundingClientRect();
      const scaleX = appRoot && appBounds && appRoot.offsetWidth > 0
        ? appBounds.width / appRoot.offsetWidth
        : 1;
      const scaleY = appRoot && appBounds && appRoot.offsetHeight > 0
        ? appBounds.height / appRoot.offsetHeight
        : 1;

      const target = document.elementFromPoint(x, y);
      const requestedState = target
        ? getComputedStyle(target).getPropertyValue('--app-native-cursor-state').trim()
        : 'normal';
      const cursorState: NativeCursorState =
        requestedState === 'hand-select' || requestedState === 'text-select'
          ? requestedState
          : 'normal';
      const hotspot = cursorState === 'hand-select'
        ? { x: 10.8, y: 2.3 }
        : cursorState === 'text-select'
          ? { x: 9, y: 12 }
          : { x: 2, y: 1.25 };

      cursor.dataset.cursorState = cursorState;
      cursor.style.transform = `translate3d(${x - hotspot.x * scaleX}px, ${y - hotspot.y * scaleY}px, 0) scale(${scaleX}, ${scaleY})`;
      cursor.style.opacity = '1';
    };

    const handleMouseMove = (event: MouseEvent) => {
      updateCursor({ x: event.clientX, y: event.clientY });
    };

    const hideCursor = () => {
      if (cursorRef.current) cursorRef.current.style.opacity = '0';
    };

    const restoreCursor = () => {
      const lastPosition = lastPointerPositionRef.current;
      if (lastPosition) updateCursor(lastPosition);
    };

    const handleMouseOut = (event: MouseEvent) => {
      if (!event.relatedTarget) hideCursor();
    };

    document.addEventListener('mousemove', handleMouseMove, { passive: true });
    document.addEventListener('mouseleave', hideCursor);
    window.addEventListener('mouseout', handleMouseOut);
    window.addEventListener('blur', hideCursor);
    window.addEventListener('resize', restoreCursor);

    restoreCursor();

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', hideCursor);
      window.removeEventListener('mouseout', handleMouseOut);
      window.removeEventListener('blur', hideCursor);
      window.removeEventListener('resize', restoreCursor);
    };
  }, [enabled]);

  if (!enabled || typeof document === 'undefined') return null;

  return createPortal(
    <div className="app-native-cursor-layer" aria-hidden="true">
      <div ref={cursorRef} className="app-native-cursor" data-cursor-state="normal">
        <svg
          className="app-native-cursor-normal"
          width="18"
          height="24"
          viewBox="0 0 18 24"
          focusable="false"
        >
          <path
            d="M2 1.25V19l4.2-4.2 3.15 7.1 2.7-1.2-3.1-7.1h6.1L2 1.25Z"
            fill="#fff"
            stroke="#111827"
            strokeLinejoin="round"
            strokeWidth="1.25"
          />
        </svg>
        <svg
          className="app-native-cursor-hand"
          width="22"
          height="26"
          viewBox="0 0 22 26"
          focusable="false"
        >
          <path
            d="M8.6 12.5V4.1a1.8 1.8 0 0 1 3.6 0v6.4V5.5a1.75 1.75 0 0 1 3.5 0v5.1V6.7a1.7 1.7 0 0 1 3.4 0v5.1V9a1.7 1.7 0 0 1 3.4 0v6.7c0 4.5-2.6 7.2-6.8 7.2h-2c-2.5 0-4.3-1.2-5.7-3.2l-3.6-5a1.8 1.8 0 0 1 2.8-2.4l2.6 2.1v-1.9Z"
            fill="#fff"
            stroke="#111827"
            strokeLinejoin="round"
            strokeWidth="1.25"
          />
        </svg>
        <svg
          className="app-native-cursor-text"
          width="18"
          height="24"
          viewBox="0 0 18 24"
          focusable="false"
        >
          <path
            d="M5 3h8M9 3v18M5 21h8"
            fill="none"
            stroke="#fff"
            strokeLinecap="round"
            strokeWidth="4"
          />
          <path
            d="M5 3h8M9 3v18M5 21h8"
            fill="none"
            stroke="#111827"
            strokeLinecap="round"
            strokeWidth="1.5"
          />
        </svg>
      </div>
    </div>,
    document.body,
  );
};
