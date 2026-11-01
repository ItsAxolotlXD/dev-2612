import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { SPINNING_RING_GIF_URL } from './SpinningRing';
import { useDrivers } from '../hooks/useDrivers';
import { showAppToast } from '../utils/toast';

interface SparkleDriverModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFinishedAll?: () => void;
}

const slideUpVariant = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.32,
      ease: [0.16, 1, 0.3, 1],
      delay: 0,
    },
  },
};

const buttonStyle: React.CSSProperties = {
  backgroundColor: '#0078d4',
  color: '#ffffff',
  borderColor: '#ffffff',
  boxShadow: 'none',
  outline: 'none',
  fontWeight: 400,
  fontFamily: "'Segoe UI Variable Text', 'Segoe UI', system-ui, sans-serif",
};

export const SparkleDriverModal: React.FC<SparkleDriverModalProps> = ({
  isOpen,
  onClose,
  onFinishedAll,
}) => {
  // Steps 1 -> 2 -> 3
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Transition state: installing animation between steps
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionTitle, setTransitionTitle] = useState('Installing driver');
  const [transitionDesc, setTransitionDesc] = useState('');
  const transitionTimerRef = useRef<NodeJS.Timeout | null>(null);

  const {
    installVisualDriver,
    rollbackVisualDriver,
    installResolutionDriver,
    rollbackResolutionDriver,
  } = useDrivers();

  // Reset state on open
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setIsTransitioning(false);
      setTransitionTitle('Installing driver');
      setTransitionDesc('');
    }
    return () => {
      if (transitionTimerRef.current) {
        clearTimeout(transitionTimerRef.current);
      }
    };
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen || isTransitioning) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isTransitioning, onClose]);

  if (!isOpen) return null;

  // Step 1: Install drivers -> Go to Step 2
  const handleStep1InstallDrivers = () => {
    setIsTransitioning(true);
    setTransitionTitle('Checking device hardware');
    setTransitionDesc('Scanning GPU display adapter and composition components...');

    if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
    transitionTimerRef.current = setTimeout(() => {
      setIsTransitioning(false);
      setStep(2);
    }, 2500);
  };

  // Step 1: Close -> Close modal without installing
  const handleStep1Close = () => {
    if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
    setIsTransitioning(false);
    onClose();
    showAppToast('Driver installation skipped. Sparkle will run in low 4:3 stretched mode.', 'info');
    if (onFinishedAll) onFinishedAll();
  };

  // Step 2: Install visual drivers
  const handleStep2InstallVisual = () => {
    setIsTransitioning(true);
    setTransitionTitle('Installing visual drivers');
    setTransitionDesc('Configuring Acrylic transparency, backdrop blur and WinUI 3 motion system...');

    if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
    transitionTimerRef.current = setTimeout(() => {
      installVisualDriver();
      setIsTransitioning(false);
      setStep(3);
      showAppToast('Sparkle Visual Composition Driver installed successfully.', 'success');
    }, 2800);
  };

  // Step 2: Ignore visual drivers
  const handleStep2IgnoreVisual = () => {
    rollbackVisualDriver();
    setStep(3);
    showAppToast('Visual drivers ignored. Surfaces will display solid colors without blur.', 'warning');
  };

  // Step 3: Install resolution drivers
  const handleStep3InstallResolution = () => {
    setIsTransitioning(true);
    const screenWidth = typeof window !== 'undefined' ? window.screen.width : 1920;
    const screenHeight = typeof window !== 'undefined' ? window.screen.height : 1080;
    setTransitionTitle('Installing resolution drivers');
    setTransitionDesc(`Detected monitor resolution: ${screenWidth}x${screenHeight}. Adapting display mode to native viewport...`);

    if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
    transitionTimerRef.current = setTimeout(() => {
      installResolutionDriver();
      setIsTransitioning(false);
      onClose();
      showAppToast(`Native resolution activated: ${screenWidth}x${screenHeight}. Stretched 4:3 mode disabled.`, 'success');
      if (onFinishedAll) onFinishedAll();
    }, 3000);
  };

  // Step 3: Ignore resolution drivers
  const handleStep3IgnoreResolution = () => {
    rollbackResolutionDriver();
    onClose();
    showAppToast('Resolution driver ignored. Sparkle will remain in 4:3 stretched mode.', 'info');
    if (onFinishedAll) onFinishedAll();
  };

  return (
    <div
      id="sparkle-driver-modal-container"
      className="fixed inset-0 z-[100000] flex items-center justify-center p-4 sm:p-6 select-none font-sans"
    >
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        onClick={() => {
          if (!isTransitioning) onClose();
        }}
        className="fixed inset-0 bg-black/70 backdrop-blur-[2px]"
      />

      {/* Windows Blue Dialog Frame (#0078d7) matching SparkleRecoveryModal */}
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 w-full max-w-[620px] bg-[#0078d7] text-white rounded-none px-6 py-5 sm:px-8 sm:py-6 shadow-[0_24px_64px_rgba(0,0,0,0.85)] select-text border-none"
        style={{
          backgroundColor: '#0078d7',
          fontFamily: "'Segoe UI Variable Text', 'Segoe UI', system-ui, sans-serif",
        }}
      >
        <AnimatePresence mode="wait">
          {/* Transition / Installing dialog with Spinning Ring */}
          {isTransitioning ? (
            <motion.div
              key="driver-transitioning"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <motion.div
                variants={slideUpVariant}
                initial="hidden"
                animate="visible"
                className="sparkle-recovery-header-regular text-[21px] sm:text-[23px] text-white tracking-normal leading-tight font-normal"
                style={{ fontWeight: 400 }}
              >
                {transitionTitle}
              </motion.div>
              <motion.p
                variants={slideUpVariant}
                initial="hidden"
                animate="visible"
                className="text-[13.5px] sm:text-[14px] text-white/95 leading-normal mt-2.5 sm:mt-3 font-normal"
                style={{ fontWeight: 400 }}
              >
                {transitionDesc}
              </motion.p>

              <motion.div
                variants={slideUpVariant}
                initial="hidden"
                animate="visible"
                className="flex items-center gap-3.5 mt-5 sm:mt-6"
              >
                <div
                  aria-hidden="true"
                  className="w-6 h-6 bg-white shrink-0"
                  style={{
                    WebkitMaskImage: `url("${SPINNING_RING_GIF_URL}")`,
                    maskImage: `url("${SPINNING_RING_GIF_URL}")`,
                    WebkitMaskSize: 'contain',
                    maskSize: 'contain',
                    WebkitMaskRepeat: 'no-repeat',
                    maskRepeat: 'no-repeat',
                    WebkitMaskPosition: 'center',
                    maskPosition: 'center',
                  }}
                />
                <span className="text-white text-xs sm:text-[13.5px] font-normal tracking-wide" style={{ fontWeight: 400 }}>
                  Please wait while installing...
                </span>
              </motion.div>
            </motion.div>
          ) : (
            <>
              {/* MODAL DIALOG 1: Install driver for Sparkle now */}
              {step === 1 && (
                <motion.div
                  key="driver-step-1"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <motion.div
                    variants={slideUpVariant}
                    initial="hidden"
                    animate="visible"
                    className="sparkle-recovery-header-regular text-[21px] sm:text-[23px] text-white tracking-normal leading-tight font-normal"
                    style={{ fontWeight: 400 }}
                  >
                    Install driver for Sparkle now
                  </motion.div>
                  <motion.p
                    variants={slideUpVariant}
                    initial="hidden"
                    animate="visible"
                    className="text-[13.5px] sm:text-[14px] text-white/95 leading-normal mt-2.5 sm:mt-3 font-normal"
                    style={{ fontWeight: 400 }}
                  >
                    Your Sparkle build is missing some important drivers. Let&apos;s install them, otherwise your app will stay in a low 4:3 resolution and won&apos;t have visual effects.
                  </motion.p>

                  <motion.div
                    variants={slideUpVariant}
                    initial="hidden"
                    animate="visible"
                    className="flex items-center justify-end gap-3 mt-5 sm:mt-6"
                  >
                    <button
                      type="button"
                      onClick={handleStep1InstallDrivers}
                      className="sparkle-recovery-btn border-2 border-solid border-white px-3.5 py-1 sm:px-4 sm:py-1 text-[11.5px] sm:text-[12px] font-normal transition-colors cursor-pointer select-none rounded-none tracking-normal"
                      style={buttonStyle}
                    >
                      Install drivers
                    </button>
                    <button
                      type="button"
                      onClick={handleStep1Close}
                      className="sparkle-recovery-btn border-2 border-solid border-white px-3.5 py-1 sm:px-4 sm:py-1 text-[11.5px] sm:text-[12px] font-normal transition-colors cursor-pointer select-none rounded-none tracking-normal"
                      style={buttonStyle}
                    >
                      Close
                    </button>
                  </motion.div>
                </motion.div>
              )}

              {/* MODAL DIALOG 2: Install visual drivers */}
              {step === 2 && (
                <motion.div
                  key="driver-step-2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <motion.div
                    variants={slideUpVariant}
                    initial="hidden"
                    animate="visible"
                    className="sparkle-recovery-header-regular text-[21px] sm:text-[23px] text-white tracking-normal leading-tight font-normal"
                    style={{ fontWeight: 400 }}
                  >
                    Install visual drivers
                  </motion.div>
                  <motion.p
                    variants={slideUpVariant}
                    initial="hidden"
                    animate="visible"
                    className="text-[13.5px] sm:text-[14px] text-white/95 leading-normal mt-2.5 sm:mt-3 font-normal"
                    style={{ fontWeight: 400 }}
                  >
                    Sparkle uses a lot of animations, backdrop blur and transparency effects in the UI system.
                  </motion.p>

                  <motion.div
                    variants={slideUpVariant}
                    initial="hidden"
                    animate="visible"
                    className="flex items-center justify-end gap-3 mt-5 sm:mt-6"
                  >
                    <button
                      type="button"
                      onClick={handleStep2InstallVisual}
                      className="sparkle-recovery-btn border-2 border-solid border-white px-3.5 py-1 sm:px-4 sm:py-1 text-[11.5px] sm:text-[12px] font-normal transition-colors cursor-pointer select-none rounded-none tracking-normal"
                      style={buttonStyle}
                    >
                      Install now
                    </button>
                    <button
                      type="button"
                      onClick={handleStep2IgnoreVisual}
                      className="sparkle-recovery-btn border-2 border-solid border-white px-3.5 py-1 sm:px-4 sm:py-1 text-[11.5px] sm:text-[12px] font-normal transition-colors cursor-pointer select-none rounded-none tracking-normal"
                      style={buttonStyle}
                    >
                      Ignore
                    </button>
                  </motion.div>
                </motion.div>
              )}

              {/* MODAL DIALOG 3: Install resolution drivers */}
              {step === 3 && (
                <motion.div
                  key="driver-step-3"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <motion.div
                    variants={slideUpVariant}
                    initial="hidden"
                    animate="visible"
                    className="sparkle-recovery-header-regular text-[21px] sm:text-[23px] text-white tracking-normal leading-tight font-normal"
                    style={{ fontWeight: 400 }}
                  >
                    Install resolution drivers
                  </motion.div>
                  <motion.p
                    variants={slideUpVariant}
                    initial="hidden"
                    animate="visible"
                    className="text-[13.5px] sm:text-[14px] text-white/95 leading-normal mt-2.5 sm:mt-3 font-normal"
                    style={{ fontWeight: 400 }}
                  >
                    Detect your screen resolution and adapt the app resolution to fit your device.
                  </motion.p>

                  <motion.div
                    variants={slideUpVariant}
                    initial="hidden"
                    animate="visible"
                    className="flex items-center justify-end gap-3 mt-5 sm:mt-6"
                  >
                    <button
                      type="button"
                      onClick={handleStep3InstallResolution}
                      className="sparkle-recovery-btn border-2 border-solid border-white px-3.5 py-1 sm:px-4 sm:py-1 text-[11.5px] sm:text-[12px] font-normal transition-colors cursor-pointer select-none rounded-none tracking-normal"
                      style={buttonStyle}
                    >
                      Install now
                    </button>
                    <button
                      type="button"
                      onClick={handleStep3IgnoreResolution}
                      className="sparkle-recovery-btn border-2 border-solid border-white px-3.5 py-1 sm:px-4 sm:py-1 text-[11.5px] sm:text-[12px] font-normal transition-colors cursor-pointer select-none rounded-none tracking-normal"
                      style={buttonStyle}
                    >
                      Ignore
                    </button>
                  </motion.div>
                </motion.div>
              )}
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
