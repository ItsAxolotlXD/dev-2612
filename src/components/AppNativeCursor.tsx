import { createPortal } from 'react-dom';
import { useEffect, useRef } from 'react';

interface AppNativeCursorProps {
  enabled: boolean;
}

interface PointerPosition {
  x: number;
  y: number;
}

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

      cursor.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${scaleX}, ${scaleY})`;
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
      <div ref={cursorRef} className="app-native-cursor">
        <svg width="18" height="24" viewBox="0 0 18 24" focusable="false">
          <path
            d="M2 1.25V19l4.2-4.2 3.15 7.1 2.7-1.2-3.1-7.1h6.1L2 1.25Z"
            fill="#fff"
            stroke="#111827"
            strokeLinejoin="round"
            strokeWidth="1.25"
          />
        </svg>
      </div>
    </div>,
    document.body,
  );
};
