import { useEffect } from 'react';
import { SpinningRing } from './SpinningRing';

interface WindowsBootScreenProps {
  onFinish: () => void;
}

export function WindowsBootScreen({ onFinish }: WindowsBootScreenProps) {
  useEffect(() => {
    const timer = window.setTimeout(onFinish, 5000);
    return () => window.clearTimeout(timer);
  }, [onFinish]);

  return (
      <div
        id="windows-boot-screen"
        className="fixed inset-0 z-[100001] flex select-none items-center justify-center overflow-hidden bg-black"
      >
        <div className="flex -translate-y-[90px] flex-col items-center">
          <div aria-hidden="true" className="grid size-[114px] grid-cols-2 grid-rows-2 gap-[3px]">
            <span className="bg-[#1296db]" />
            <span className="bg-[#0787d1]" />
            <span className="bg-[#0787d1]" />
            <span className="bg-[#0879c9]" />
          </div>
        </div>
        <SpinningRing
          size={24}
          ariaLabel="Đang khởi động"
          className="windows-boot-gif absolute"
        />
      </div>
  );
}
