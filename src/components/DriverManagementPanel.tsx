import React, { useEffect, useRef } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { DriversManagement } from '../pages/DriversManagement';

interface DriverManagementPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenDriverModal: () => void;
}

export const DriverManagementPanel: React.FC<DriverManagementPanelProps> = ({
  isOpen,
  onClose,
  onOpenDriverModal,
}) => {
  const shouldReduceMotion = useReducedMotion();
  const panelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const focusFrame = window.requestAnimationFrame(() => {
      panelRef.current?.focus({ preventScroll: true });
    });
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    const handleOutsidePointer = (event: MouseEvent | TouchEvent) => {
      const target = event.target;
      const isInsidePanel =
        target instanceof Element && Boolean(target.closest('[data-driver-management-panel]'));

      if (!isInsidePanel) onClose();
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleOutsidePointer);
    document.addEventListener('touchstart', handleOutsidePointer);

    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleOutsidePointer);
      document.removeEventListener('touchstart', handleOutsidePointer);
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.aside
          ref={panelRef}
          tabIndex={-1}
          key="driver-management-panel"
          data-driver-management-panel="true"
          role="region"
          aria-labelledby="driver-management-panel-title"
          initial={shouldReduceMotion ? { opacity: 0 } : { x: '100%', opacity: 1 }}
          animate={shouldReduceMotion ? { opacity: 1 } : { x: 0, opacity: 1 }}
          exit={shouldReduceMotion ? { opacity: 0 } : { x: '100%', opacity: 1 }}
          transition={
            shouldReduceMotion
              ? { duration: 0.12 }
              : { type: 'spring', stiffness: 320, damping: 34, mass: 0.85 }
          }
          className="fixed inset-y-0 right-0 z-[2147483647] h-[100dvh] w-[min(500px,100vw)] overflow-y-auto border-l border-black/10 bg-[#f9f9f9] text-[#111827] shadow-[-18px_0_48px_rgba(0,0,0,0.3)] dark:border-white/10 dark:bg-[#1b1f24] dark:text-white sidebar-scroller"
          style={{
            paddingTop: 'max(12px, env(safe-area-inset-top))',
            paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
          }}
        >
          <DriversManagement onClose={onClose} onOpenDriverModal={onOpenDriverModal} />
        </motion.aside>
      )}
    </AnimatePresence>
  );
};
