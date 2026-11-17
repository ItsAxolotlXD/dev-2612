import React, { useEffect, useRef, useState } from 'react';
import { Copy, Minus, Plus, Square, X } from 'lucide-react';
import { getDefaultWindowBounds, getTabIcon, getTabTitle, type AppTab, type WindowBounds } from '../utils/tabMeta';

type ResizeDirection = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

interface WindowedTabsLayerProps {
  windows: AppTab[];
  activeWindowId: number | null;
  onFocusWindow: (id: number) => void;
  onMinimizeWindow: (id: number) => void;
  onToggleMaximizeWindow: (id: number) => void;
  onCloseWindow: (id: number) => void;
  onUpdateWindowBounds: (id: number, bounds: WindowBounds, isMaximized?: boolean) => void;
  onCreateWindow?: () => void;
  renderWindowContent: (tab: AppTab) => React.ReactNode;
}

const MIN_WINDOW_WIDTH = 340;
const MIN_WINDOW_HEIGHT = 240;

const getResolutionScaleX = () => {
  if (typeof document === 'undefined') return 1;
  return document.documentElement.classList.contains('missing-resolution-driver') ? 4 / 3 : 1;
};

export const WindowedTabsLayer: React.FC<WindowedTabsLayerProps> = ({
  windows,
  activeWindowId,
  onFocusWindow,
  onMinimizeWindow,
  onToggleMaximizeWindow,
  onCloseWindow,
  onUpdateWindowBounds,
  onCreateWindow,
  renderWindowContent,
}) => {
  const workspaceRef = useRef<HTMLDivElement | null>(null);
  const [activeInteractionWindowId, setActiveInteractionWindowId] = useState<number | null>(null);

  const dragSessionRef = useRef<{
    type: 'move' | 'resize';
    windowId: number;
    dir?: ResizeDirection;
    startClientX: number;
    startClientY: number;
    scaleX: number;
    startBounds: WindowBounds;
    workspaceWidth: number;
    workspaceHeight: number;
    wasMaximized: boolean;
  } | null>(null);

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      const session = dragSessionRef.current;
      if (!session) return;

      const dx = (e.clientX - session.startClientX) / session.scaleX;
      const dy = e.clientY - session.startClientY;
      const { startBounds, workspaceWidth, workspaceHeight } = session;

      if (session.type === 'move') {
        const nextX = Math.max(
          -startBounds.width + 120,
          Math.min(workspaceWidth - 120, startBounds.x + dx)
        );
        const nextY = Math.max(0, Math.min(workspaceHeight - 40, startBounds.y + dy));
        onUpdateWindowBounds(
          session.windowId,
          { ...startBounds, x: Math.round(nextX), y: Math.round(nextY) },
          false
        );
        return;
      }

      const dir = session.dir!;
      let { x, y, width, height } = startBounds;

      if (dir.includes('e')) {
        width = Math.max(MIN_WINDOW_WIDTH, Math.min(workspaceWidth - x, startBounds.width + dx));
      }
      if (dir.includes('s')) {
        height = Math.max(MIN_WINDOW_HEIGHT, Math.min(workspaceHeight - y, startBounds.height + dy));
      }
      if (dir.includes('w')) {
        const maxLeftDelta = startBounds.width - MIN_WINDOW_WIDTH;
        const clampedDx = Math.max(-startBounds.x, Math.min(maxLeftDelta, dx));
        x = startBounds.x + clampedDx;
        width = startBounds.width - clampedDx;
      }
      if (dir.includes('n')) {
        const maxTopDelta = startBounds.height - MIN_WINDOW_HEIGHT;
        const clampedDy = Math.max(-startBounds.y, Math.min(maxTopDelta, dy));
        y = startBounds.y + clampedDy;
        height = startBounds.height - clampedDy;
      }

      onUpdateWindowBounds(
        session.windowId,
        {
          x: Math.round(x),
          y: Math.round(y),
          width: Math.round(width),
          height: Math.round(height),
        },
        false
      );
    };

    const handlePointerUp = () => {
      if (dragSessionRef.current) {
        dragSessionRef.current = null;
        setActiveInteractionWindowId(null);
      }
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [onUpdateWindowBounds]);

  const startMove = (e: React.PointerEvent<HTMLElement>, win: AppTab, index: number) => {
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest('button')) return;
    e.preventDefault();
    onFocusWindow(win.id);

    const workspaceRect = workspaceRef.current?.getBoundingClientRect();
    const scaleX = getResolutionScaleX();
    const workspaceWidth = workspaceRect ? workspaceRect.width / scaleX : window.innerWidth;
    const workspaceHeight = workspaceRect ? workspaceRect.height : Math.max(360, window.innerHeight - 44);
    const currentBounds = win.bounds ?? getDefaultWindowBounds(index);

    let startBounds = currentBounds;
    if (win.isMaximized && workspaceRect) {
      const pointerLocalX = (e.clientX - workspaceRect.left) / scaleX;
      const restoredX = Math.max(
        0,
        Math.min(workspaceWidth - currentBounds.width, Math.round(pointerLocalX - currentBounds.width / 2))
      );
      startBounds = {
        ...currentBounds,
        x: restoredX,
        y: 6,
      };
    }

    dragSessionRef.current = {
      type: 'move',
      windowId: win.id,
      startClientX: e.clientX,
      startClientY: e.clientY,
      scaleX,
      startBounds,
      workspaceWidth,
      workspaceHeight,
      wasMaximized: Boolean(win.isMaximized),
    };
    setActiveInteractionWindowId(win.id);
  };

  const startResize = (
    e: React.PointerEvent<HTMLDivElement>,
    win: AppTab,
    index: number,
    dir: ResizeDirection
  ) => {
    if (e.button !== 0 || win.isMaximized) return;
    e.preventDefault();
    e.stopPropagation();
    onFocusWindow(win.id);

    const workspaceRect = workspaceRef.current?.getBoundingClientRect();
    const scaleX = getResolutionScaleX();
    const workspaceWidth = workspaceRect ? workspaceRect.width / scaleX : window.innerWidth;
    const workspaceHeight = workspaceRect ? workspaceRect.height : Math.max(360, window.innerHeight - 44);

    dragSessionRef.current = {
      type: 'resize',
      windowId: win.id,
      dir,
      startClientX: e.clientX,
      startClientY: e.clientY,
      scaleX,
      startBounds: win.bounds ?? getDefaultWindowBounds(index),
      workspaceWidth,
      workspaceHeight,
      wasMaximized: false,
    };
    setActiveInteractionWindowId(win.id);
  };

  const visibleTopZ = windows.reduce((maxZ, w) => (!w.isMinimized ? Math.max(maxZ, w.zIndex ?? 1) : maxZ), 0);

  return (
    <div
      ref={workspaceRef}
      id="windowed-tabs-workspace"
      className="relative flex-1 min-h-0 w-full overflow-hidden select-none"
    >
      {windows.map((win, index) => {
        const bounds = win.bounds ?? getDefaultWindowBounds(index);
        const title = getTabTitle(win.route);
        const isMinimized = Boolean(win.isMinimized);
        const isMaximized = Boolean(win.isMaximized);
        const isFocused = !isMinimized && (win.id === activeWindowId || (win.zIndex ?? 1) === visibleTopZ);
        const isInteracting = activeInteractionWindowId === win.id;

        const pathname = win.route.split(/[?#]/)[0] || '/';
        const isFullBleed =
          pathname === '/' ||
          pathname === '/home' ||
          pathname === '/home-preview' ||
          pathname === '/news' ||
          pathname === '/updates' ||
          pathname.startsWith('/notes') ||
          pathname === '/write' ||
          pathname === '/present' ||
          pathname === '/table' ||
          pathname === '/craftmine' ||
          pathname === '/photopea' ||
          pathname === '/vlc' ||
          pathname === '/screenbox' ||
          pathname === '/screenbug' ||
          pathname === '/gallery' ||
          pathname === '/explorer' ||
          pathname === '/calculator' ||
          pathname === '/html-writer' ||
          pathname === '/media-player' ||
          pathname === '/draws' ||
          pathname.startsWith('/draws/') ||
          pathname === '/camera';

        return (
          <section
            key={win.id}
            id={`windowed-tab-${win.id}`}
            role="region"
            aria-label={title}
            aria-hidden={isMinimized}
            onPointerDownCapture={() => {
              if (!isFocused && !isMinimized) onFocusWindow(win.id);
            }}
            style={{
              zIndex: win.zIndex ?? index + 1,
              ...(isMaximized
                ? { left: 0, top: 0, width: '100%', height: '100%' }
                : {
                    left: `${bounds.x}px`,
                    top: `${bounds.y}px`,
                    width: `${bounds.width}px`,
                    height: `${bounds.height}px`,
                  }),
              pointerEvents: isMinimized ? 'none' : 'auto',
              visibility: isMinimized ? 'hidden' : 'visible',
              opacity: isMinimized ? 0 : 1,
              transform: isMinimized ? 'translateY(28px) scale(0.94)' : 'translateY(0) scale(1)',
            }}
            className={`windowed-tab-frame absolute flex flex-col overflow-hidden ${
              isInteracting ? 'transition-none' : 'transition-[opacity,transform,box-shadow] duration-150 ease-out'
            } ${
              isMaximized
                ? 'rounded-none border-0'
                : 'rounded-[10px] border border-black/[0.14] dark:border-white/[0.15]'
            } ${
              isFocused
                ? 'shadow-[0_22px_64px_rgba(0,0,0,0.42)] ring-1 ring-black/[0.08] dark:ring-white/[0.14]'
                : 'shadow-[0_12px_36px_rgba(0,0,0,0.24)]'
            } bg-[#f9f9f9]/96 backdrop-blur-2xl dark:bg-[#20242a]/96`}
          >
            {/* Window Title Bar */}
            <header
              onPointerDown={(e) => startMove(e, win, index)}
              onDoubleClick={(e) => {
                if ((e.target as HTMLElement).closest('button')) return;
                onToggleMaximizeWindow(win.id);
              }}
              className={`flex h-9 shrink-0 items-center justify-between border-b px-2.5 select-none ${
                isFocused
                  ? 'border-black/[0.08] bg-[#eef1f5]/95 dark:border-white/[0.08] dark:bg-[#1b1f24]/95'
                  : 'border-black/[0.06] bg-[#e5e8ed]/85 dark:border-white/[0.06] dark:bg-[#171a1f]/90'
              }`}
            >
              <div className="flex min-w-0 flex-1 items-center gap-2 pr-2">
                <span className="flex size-4 shrink-0 items-center justify-center" aria-hidden="true">
                  {getTabIcon(win.route, 'size-4 shrink-0')}
                </span>
                <span className="truncate text-[12px] font-medium text-[#111827] dark:text-white/95">
                  {title}
                </span>
              </div>

              <div className="flex shrink-0 items-center">
                {onCreateWindow && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onCreateWindow();
                    }}
                    aria-label="Open new window"
                    className="inline-flex h-7 w-8 cursor-pointer items-center justify-center rounded-[5px] text-[#374151] transition-colors hover:bg-black/[0.07] dark:text-white/80 dark:hover:bg-white/[0.09]"
                  >
                    <Plus className="size-3.5" aria-hidden="true" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onMinimizeWindow(win.id);
                  }}
                  aria-label={`Minimize ${title}`}
                  className="inline-flex h-7 w-9 cursor-pointer items-center justify-center rounded-[5px] text-[#374151] transition-colors hover:bg-black/[0.07] dark:text-white/85 dark:hover:bg-white/[0.09]"
                >
                  <Minus className="size-3.5" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleMaximizeWindow(win.id);
                  }}
                  aria-label={isMaximized ? `Restore ${title}` : `Maximize ${title}`}
                  className="inline-flex h-7 w-9 cursor-pointer items-center justify-center rounded-[5px] text-[#374151] transition-colors hover:bg-black/[0.07] dark:text-white/85 dark:hover:bg-white/[0.09]"
                >
                  {isMaximized ? (
                    <Copy className="size-3 -scale-x-100" aria-hidden="true" />
                  ) : (
                    <Square className="size-3" aria-hidden="true" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCloseWindow(win.id);
                  }}
                  aria-label={`Close ${title}`}
                  className="inline-flex h-7 w-9 cursor-pointer items-center justify-center rounded-[5px] text-[#374151] transition-colors hover:bg-[#e81123] hover:text-white dark:text-white/85 dark:hover:bg-[#e81123] dark:hover:text-white"
                >
                  <X className="size-3.5" aria-hidden="true" />
                </button>
              </div>
            </header>

            {/* Window Content Body */}
            <div
              className={`windowed-tab-body relative min-h-0 flex-1 overflow-y-auto overflow-x-hidden bg-[#f9f9f9] dark:bg-[#282c31] select-text ${
                isFullBleed ? 'p-0' : 'px-4 sm:px-6 md:px-8 py-5'
              } ${
                isInteracting ? 'pointer-events-none' : ''
              }`}
            >
              {renderWindowContent(win)}
            </div>

            {/* 8-Direction Resize Handles (hidden when maximized) */}
            {!isMaximized && (
              <>
                <div
                  onPointerDown={(e) => startResize(e, win, index, 'n')}
                  className="absolute top-0 right-2.5 left-2.5 z-30 h-1 cursor-n-resize"
                />
                <div
                  onPointerDown={(e) => startResize(e, win, index, 's')}
                  className="absolute right-2.5 bottom-0 left-2.5 z-30 h-1.5 cursor-s-resize"
                />
                <div
                  onPointerDown={(e) => startResize(e, win, index, 'w')}
                  className="absolute top-2.5 bottom-2.5 left-0 z-30 w-1.5 cursor-w-resize"
                />
                <div
                  onPointerDown={(e) => startResize(e, win, index, 'e')}
                  className="absolute top-2.5 right-0 bottom-2.5 z-30 w-1.5 cursor-e-resize"
                />
                <div
                  onPointerDown={(e) => startResize(e, win, index, 'nw')}
                  className="absolute top-0 left-0 z-40 size-2.5 cursor-nw-resize"
                />
                <div
                  onPointerDown={(e) => startResize(e, win, index, 'ne')}
                  className="absolute top-0 right-0 z-40 size-2.5 cursor-ne-resize"
                />
                <div
                  onPointerDown={(e) => startResize(e, win, index, 'sw')}
                  className="absolute bottom-0 left-0 z-40 size-2.5 cursor-sw-resize"
                />
                <div
                  onPointerDown={(e) => startResize(e, win, index, 'se')}
                  className="absolute right-0 bottom-0 z-40 size-3 cursor-se-resize"
                />
              </>
            )}
          </section>
        );
      })}
    </div>
  );
};
