import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft } from 'lucide-react';
import { SpinningRing } from './SpinningRing';
import { DEFAULT_SETTINGS } from '../hooks/useSettings';

interface SparkleRecoveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  navigate?: (route: string) => void;
}

// Slide up together at the same time without staggered delay
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

export const SparkleRecoveryModal: React.FC<SparkleRecoveryModalProps> = ({
  isOpen,
  onClose,
  navigate,
}) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Transition state: 5-second transition dialog between steps
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionDesc, setTransitionDesc] = useState('');
  const transitionTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Step 2 state
  const [reasonBug, setReasonBug] = useState(false);
  const [bugDetails, setBugDetails] = useState('');
  const [reasonDefaults, setReasonDefaults] = useState(false);
  const [reasonResetOOBE, setReasonResetOOBE] = useState(false);
  const [reasonOther, setReasonOther] = useState(false);
  const [otherDetails, setOtherDetails] = useState('');

  // Submit opinion to feedback checkbox (enabled by default)
  const [submitToFeedback, setSubmitToFeedback] = useState(true);

  // Step 4 progress state
  const [progress, setProgress] = useState(0);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setIsTransitioning(false);
      setTransitionDesc('');
      setReasonBug(false);
      setBugDetails('');
      setReasonDefaults(false);
      setReasonResetOOBE(false);
      setReasonOther(false);
      setOtherDetails('');
      setSubmitToFeedback(true);
      setProgress(0);
    }
    return () => {
      if (transitionTimerRef.current) {
        clearTimeout(transitionTimerRef.current);
      }
    };
  }, [isOpen]);

  // Handle escape key (disabled during step 4 recovery or transition to step 4)
  useEffect(() => {
    if (!isOpen || step === 4) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (transitionTimerRef.current) {
          clearTimeout(transitionTimerRef.current);
        }
        setIsTransitioning(false);
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, step, onClose]);

  // Transition helper: displays "Preparing next step" for 5 seconds before changing step
  const startTransition = (targetStep: 1 | 2 | 3 | 4, desc: string) => {
    if (transitionTimerRef.current) {
      clearTimeout(transitionTimerRef.current);
    }
    setTransitionDesc(desc);
    setIsTransitioning(true);

    transitionTimerRef.current = setTimeout(() => {
      setIsTransitioning(false);
      setStep(targetStep);
    }, 5000);
  };

  // Step 4 recovery timer: runs for 1 minute (60 seconds) then resets to defaults and reloads
  useEffect(() => {
    if (step !== 4 || isTransitioning) return;

    const DURATION_MS = 60000; // 1 minute (60 seconds)
    const startTime = Date.now();

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, Math.floor((elapsed / DURATION_MS) * 100));
      setProgress(pct);

      if (elapsed >= DURATION_MS) {
        clearInterval(interval);
        // Reset all options to default values
        try {
          localStorage.removeItem('waves_sidebar_collapsed');
          localStorage.removeItem('vplay_recent_channel_id');
          localStorage.removeItem('vplay_font_size');
          localStorage.removeItem('sparkle_setup_wizard_completed');
          localStorage.setItem('waves_system_settings', JSON.stringify(DEFAULT_SETTINGS));
        } catch (err) {
          console.error('Failed to reset settings:', err);
        }
        // Refresh the page
        window.location.reload();
      }
    }, 200);

    return () => clearInterval(interval);
  }, [step, isTransitioning]);

  if (!isOpen) return null;

  const handleNextFromStep2 = () => {
    // If submitToFeedback is checked, aggregate opinions into the Feedback tab (localStorage)
    if (submitToFeedback) {
      try {
        const existing = localStorage.getItem('waves_user_feedbacks');
        const list = existing ? JSON.parse(existing) : [];

        const opinionLines: string[] = [];
        if (reasonBug) {
          opinionLines.push('Issue: Something went wrong with the app.');
          if (bugDetails.trim()) {
            opinionLines.push(`Details: ${bugDetails.trim()}`);
          }
        }
        if (reasonDefaults) {
          opinionLines.push('Option: I want to reset my app to defaults.');
        }
        if (reasonResetOOBE) {
          opinionLines.push('Option: Reset Out of Box Experience (OOBE).');
          try {
            localStorage.removeItem('sparkle_setup_wizard_completed');
          } catch {}
        }
        if (reasonOther) {
          opinionLines.push(`Other reason: ${otherDetails.trim() || 'General feedback'}`);
        }

        const summaryDesc = opinionLines.join('\n\n') || 'Recovery opinion submitted from Sparkle Recovery wizard.';
        const feedbackTitle = bugDetails.trim() || otherDetails.trim() || (reasonBug ? 'Recovery - Bug Report' : 'Recovery - User Feedback');

        const newFeedbackItem = {
          id: 'fb-recovery-' + Date.now(),
          category: reasonBug ? 'bug' : 'suggestion',
          title: feedbackTitle.length > 38 ? feedbackTitle.slice(0, 38) + '...' : feedbackTitle,
          description: summaryDesc,
          rating: 5,
          savedDiagnostics: true,
          createdAt: Date.now(),
        };

        localStorage.setItem('waves_user_feedbacks', JSON.stringify([newFeedbackItem, ...list]));
      } catch (err) {
        console.error('Failed to submit opinion to Feedback:', err);
      }
    }

    if (reasonBug || submitToFeedback) {
      startTransition(3, 'Preparing feedback submission...');
    } else {
      startTransition(4, 'Preparing recovery environment...');
    }
  };

  const handleGoToFeedback = () => {
    if (transitionTimerRef.current) {
      clearTimeout(transitionTimerRef.current);
    }
    onClose();
    if (navigate) {
      navigate('/feedback');
    }
  };

  const handleCancel = () => {
    if (transitionTimerRef.current) {
      clearTimeout(transitionTimerRef.current);
    }
    setIsTransitioning(false);
    onClose();
  };

  // Button style with compact width and height
  const buttonStyle: React.CSSProperties = {
    border: '2px solid #ffffff',
    borderWidth: '2px',
    borderStyle: 'solid',
    borderColor: '#ffffff',
    backgroundColor: 'transparent',
    color: '#ffffff',
    fontWeight: 400,
    fontFamily: "'Segoe UI Variable Text', 'Segoe UI', system-ui, sans-serif",
    outline: 'none',
  };

  const currentStepKey = isTransitioning ? 'transition' : `step-${step}`;

  const modalContent = (
    <AnimatePresence>
      <div id="sparkle-recovery-modal-container" className="fixed inset-0 z-[100000] select-none">
        <section
          role="dialog"
          aria-modal="true"
          aria-labelledby="sparkle-recovery-title"
          className="fluent-modal-dialog sparkle-recovery-dialog flex min-h-dvh w-full flex-col overflow-y-auto rounded-none border-0 bg-[#2165B5] px-6 py-6 text-white shadow-none sm:px-10 sm:py-8 select-text"
          style={{
            backgroundColor: '#2165B5',
            borderRadius: 0,
            fontFamily: "'Segoe UI Variable Text', 'Segoe UI', system-ui, sans-serif"
          }}
        >
          <header className="mx-auto flex w-full max-w-[1100px] items-center gap-5">
            <button
              type="button"
              onClick={onClose}
              aria-label="Back to setup"
              className="inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-white/40 text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <ArrowLeft className="size-5" aria-hidden="true" />
            </button>
            <h1 id="sparkle-recovery-title" className="text-[28px] font-normal tracking-tight sm:text-[34px]">
              Advanced options
            </h1>
          </header>
          <div className="mx-auto flex w-full max-w-[960px] flex-1 flex-col justify-start py-8">
            <AnimatePresence mode="wait">
            {/* TRANSITION DIALOG (5 seconds between steps) */}
            {isTransitioning ? (
              <motion.div
                key={currentStepKey}
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
                  Preparing next step
                </motion.div>
                <motion.p
                  variants={slideUpVariant}
                  initial="hidden"
                  animate="visible"
                  className="text-[13.5px] sm:text-[14px] text-white/95 leading-normal mt-2.5 sm:mt-3 font-normal"
                  style={{ fontWeight: 400 }}
                >
                  {transitionDesc || 'Preparing next step...'}
                </motion.p>

                <motion.div
                  variants={slideUpVariant}
                  initial="hidden"
                  animate="visible"
                  className="flex items-center gap-3.5 mt-5 sm:mt-6"
                >
                  <SpinningRing size={24} className="shrink-0" ariaLabel="Please wait" />
                  <span className="text-white text-xs sm:text-[13.5px] font-normal tracking-wide" style={{ fontWeight: 400 }}>
                    Please wait
                  </span>
                </motion.div>
              </motion.div>
            ) : (
              <>
                {/* STEP 1 */}
                {step === 1 && (
                  <motion.div
                    key="step-1"
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
                      Welcome to recovery wizard
                    </motion.div>
                    <motion.p
                      variants={slideUpVariant}
                      initial="hidden"
                      animate="visible"
                      className="text-[13.5px] sm:text-[14px] text-white/95 leading-normal mt-2.5 sm:mt-3 font-normal"
                      style={{ fontWeight: 400 }}
                    >
                      If something went wrong with the app or you wan to reset all the options to default value, you can try recover your Sparkle. If yes, click &quot;Start recover&quot; to continue
                    </motion.p>

                    <motion.div
                      variants={slideUpVariant}
                      initial="hidden"
                      animate="visible"
                      className="flex items-center justify-end gap-3 mt-5 sm:mt-6"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          try {
                            localStorage.removeItem('sparkle_setup_wizard_completed');
                          } catch {}
                          onClose();
                          window.dispatchEvent(new CustomEvent('launch-sparkle-setup'));
                        }}
                        className="sparkle-recovery-btn border-2 border-solid border-white px-3.5 py-1 sm:px-4 sm:py-1 text-[11.5px] sm:text-[12px] font-normal transition-colors cursor-pointer select-none rounded-none tracking-normal"
                        style={buttonStyle}
                      >
                        Reset OOBE
                      </button>
                      <button
                        type="button"
                        onClick={() => startTransition(2, 'Preparing recovery options...')}
                        className="sparkle-recovery-btn border-2 border-solid border-white px-3.5 py-1 sm:px-4 sm:py-1 text-[11.5px] sm:text-[12px] font-normal transition-colors cursor-pointer select-none rounded-none tracking-normal"
                        style={buttonStyle}
                      >
                        Start recover
                      </button>
                      <button
                        type="button"
                        onClick={onClose}
                        className="sparkle-recovery-btn border-2 border-solid border-white px-3.5 py-1 sm:px-4 sm:py-1 text-[11.5px] sm:text-[12px] font-normal transition-colors cursor-pointer select-none rounded-none tracking-normal"
                        style={buttonStyle}
                      >
                        Close
                      </button>
                    </motion.div>
                  </motion.div>
                )}

                {/* STEP 2 */}
                {step === 2 && (
                  <motion.div
                    key="step-2"
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
                      Why do you recover your app?
                    </motion.div>

                    <motion.div
                      variants={slideUpVariant}
                      initial="hidden"
                      animate="visible"
                      className="mt-3.5 sm:mt-4 space-y-2.5 sm:space-y-3"
                    >
                      {/* Checkbox 1 */}
                      <div>
                        <label className="flex items-center gap-3 cursor-pointer select-none group">
                          <div
                            onClick={() => setReasonBug(!reasonBug)}
                            style={{ border: '2px solid #ffffff', boxSizing: 'border-box' }}
                            className={`w-4.5 h-4.5 sm:w-5 sm:h-5 shrink-0 flex items-center justify-center transition-colors rounded-none ${
                              reasonBug ? 'bg-white' : 'bg-transparent group-hover:bg-white/15'
                            }`}
                          >
                            {reasonBug && (
                              <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 fill-[#0078d7]" aria-hidden="true">
                                <path d="M13.485 3.429a1 1 0 0 1 .086 1.411l-7 8a1 1 0 0 1-1.474.025l-3.5-3.75a1 1 0 1 1 1.45-1.38l2.748 2.944 6.279-7.174a1 1 0 0 1 1.411-.076z" />
                              </svg>
                            )}
                          </div>
                          <span
                            onClick={() => setReasonBug(!reasonBug)}
                            className="text-white text-xs sm:text-[13.5px] font-normal leading-normal"
                            style={{ fontWeight: 400 }}
                          >
                            Something went wrong with the app
                          </span>
                        </label>

                        {reasonBug && (
                          <div className="mt-2 pl-7 sm:pl-8">
                            <input
                              type="text"
                              autoFocus
                              placeholder="Tell us more..."
                              value={bugDetails}
                              onChange={(e) => setBugDetails(e.target.value)}
                              style={{
                                border: '1px solid rgba(255, 255, 255, 0.85)',
                                outline: 'none',
                                backgroundColor: 'rgba(255, 255, 255, 0.18)',
                                opacity: 0.6,
                                color: '#ffffff',
                              }}
                              className="sparkle-recovery-input w-full px-3 py-1.5 text-white placeholder-white text-xs sm:text-[13px] rounded-none focus:opacity-85 transition-opacity"
                            />
                          </div>
                        )}
                      </div>

                      {/* Checkbox 2 */}
                      <div>
                        <label className="flex items-center gap-3 cursor-pointer select-none group">
                          <div
                            onClick={() => setReasonDefaults(!reasonDefaults)}
                            style={{ border: '2px solid #ffffff', boxSizing: 'border-box' }}
                            className={`w-4.5 h-4.5 sm:w-5 sm:h-5 shrink-0 flex items-center justify-center transition-colors rounded-none ${
                              reasonDefaults ? 'bg-white' : 'bg-transparent group-hover:bg-white/15'
                            }`}
                          >
                            {reasonDefaults && (
                              <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 fill-[#0078d7]" aria-hidden="true">
                                <path d="M13.485 3.429a1 1 0 0 1 .086 1.411l-7 8a1 1 0 0 1-1.474.025l-3.5-3.75a1 1 0 1 1 1.45-1.38l2.748 2.944 6.279-7.174a1 1 0 0 1 1.411-.076z" />
                              </svg>
                            )}
                          </div>
                          <span
                            onClick={() => setReasonDefaults(!reasonDefaults)}
                            className="text-white text-xs sm:text-[13.5px] font-normal leading-normal"
                            style={{ fontWeight: 400 }}
                          >
                            I want to reset my app to defaults
                          </span>
                        </label>
                      </div>

                      {/* Checkbox: Reset Out of Box Experience (OOBE) */}
                      <div>
                        <label className="flex items-center gap-3 cursor-pointer select-none group">
                          <div
                            onClick={() => setReasonResetOOBE(!reasonResetOOBE)}
                            style={{ border: '2px solid #ffffff', boxSizing: 'border-box' }}
                            className={`w-4.5 h-4.5 sm:w-5 sm:h-5 shrink-0 flex items-center justify-center transition-colors rounded-none ${
                              reasonResetOOBE ? 'bg-white' : 'bg-transparent group-hover:bg-white/15'
                            }`}
                          >
                            {reasonResetOOBE && (
                              <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 fill-[#0078d7]" aria-hidden="true">
                                <path d="M13.485 3.429a1 1 0 0 1 .086 1.411l-7 8a1 1 0 0 1-1.474.025l-3.5-3.75a1 1 0 1 1 1.45-1.38l2.748 2.944 6.279-7.174a1 1 0 0 1 1.411-.076z" />
                              </svg>
                            )}
                          </div>
                          <span
                            onClick={() => setReasonResetOOBE(!reasonResetOOBE)}
                            className="text-white text-xs sm:text-[13.5px] font-normal leading-normal"
                            style={{ fontWeight: 400 }}
                          >
                            Reset Out of Box Experience (OOBE) setup wizard
                          </span>
                        </label>
                      </div>

                      {/* Checkbox 3 */}
                      <div>
                        <label className="flex items-center gap-3 cursor-pointer select-none group">
                          <div
                            onClick={() => setReasonOther(!reasonOther)}
                            style={{ border: '2px solid #ffffff', boxSizing: 'border-box' }}
                            className={`w-4.5 h-4.5 sm:w-5 sm:h-5 shrink-0 flex items-center justify-center transition-colors rounded-none ${
                              reasonOther ? 'bg-white' : 'bg-transparent group-hover:bg-white/15'
                            }`}
                          >
                            {reasonOther && (
                              <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 fill-[#0078d7]" aria-hidden="true">
                                <path d="M13.485 3.429a1 1 0 0 1 .086 1.411l-7 8a1 1 0 0 1-1.474.025l-3.5-3.75a1 1 0 1 1 1.45-1.38l2.748 2.944 6.279-7.174a1 1 0 0 1 1.411-.076z" />
                              </svg>
                            )}
                          </div>
                          <span
                            onClick={() => setReasonOther(!reasonOther)}
                            className="text-white text-xs sm:text-[13.5px] font-normal leading-normal"
                            style={{ fontWeight: 400 }}
                          >
                            Other
                          </span>
                        </label>

                        {reasonOther && (
                          <div className="mt-2 pl-7 sm:pl-8">
                            <input
                              type="text"
                              autoFocus={!reasonBug}
                              placeholder="Tell us more..."
                              value={otherDetails}
                              onChange={(e) => setOtherDetails(e.target.value)}
                              style={{
                                border: '1px solid rgba(255, 255, 255, 0.85)',
                                outline: 'none',
                                backgroundColor: 'rgba(255, 255, 255, 0.18)',
                                opacity: 0.6,
                                color: '#ffffff',
                              }}
                              className="sparkle-recovery-input w-full px-3 py-1.5 text-white placeholder-white text-xs sm:text-[13px] rounded-none focus:opacity-85 transition-opacity"
                            />
                          </div>
                        )}
                      </div>

                      {/* Checkbox 4: Submit your opinion to Feedback (enabled by default) */}
                      <div className="pt-2 sm:pt-2.5 border-t border-white/20 mt-2">
                        <label className="flex items-center gap-3 cursor-pointer select-none group">
                          <div
                            onClick={() => setSubmitToFeedback(!submitToFeedback)}
                            style={{ border: '2px solid #ffffff', boxSizing: 'border-box' }}
                            className={`w-4.5 h-4.5 sm:w-5 sm:h-5 shrink-0 flex items-center justify-center transition-colors rounded-none ${
                              submitToFeedback ? 'bg-white' : 'bg-transparent group-hover:bg-white/15'
                            }`}
                          >
                            {submitToFeedback && (
                              <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 fill-[#0078d7]" aria-hidden="true">
                                <path d="M13.485 3.429a1 1 0 0 1 .086 1.411l-7 8a1 1 0 0 1-1.474.025l-3.5-3.75a1 1 0 1 1 1.45-1.38l2.748 2.944 6.279-7.174a1 1 0 0 1 1.411-.076z" />
                              </svg>
                            )}
                          </div>
                          <span
                            onClick={() => setSubmitToFeedback(!submitToFeedback)}
                            className="text-white text-xs sm:text-[13.5px] font-normal leading-normal"
                            style={{ fontWeight: 400 }}
                          >
                            Submit your opinion to Feedback
                          </span>
                        </label>
                      </div>
                    </motion.div>

                    <motion.div
                      variants={slideUpVariant}
                      initial="hidden"
                      animate="visible"
                      className="flex items-center justify-end gap-3 mt-5 sm:mt-6"
                    >
                      <button
                        type="button"
                        onClick={handleNextFromStep2}
                        className="sparkle-recovery-btn border-2 border-solid border-white px-4 py-1 sm:px-5 sm:py-1 text-[11.5px] sm:text-[12px] font-normal transition-colors cursor-pointer select-none rounded-none tracking-normal"
                        style={buttonStyle}
                      >
                        Next
                      </button>
                    </motion.div>
                  </motion.div>
                )}

                {/* STEP 3 */}
                {step === 3 && (
                  <motion.div
                    key="step-3"
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
                      We&apos;ve received your opinion
                    </motion.div>
                    <motion.p
                      variants={slideUpVariant}
                      initial="hidden"
                      animate="visible"
                      className="text-[13.5px] sm:text-[14px] text-white/95 leading-normal mt-2.5 sm:mt-3 font-normal"
                      style={{ fontWeight: 400 }}
                    >
                      Your opinion has been submitted to Feedback and our developers will reply back as soon as possible
                    </motion.p>

                    <motion.div
                      variants={slideUpVariant}
                      initial="hidden"
                      animate="visible"
                      className="flex items-center justify-end gap-3 mt-5 sm:mt-6"
                    >
                      <button
                        type="button"
                        onClick={handleGoToFeedback}
                        className="sparkle-recovery-btn border-2 border-solid border-white px-3.5 py-1 sm:px-4 sm:py-1 text-[11.5px] sm:text-[12px] font-normal transition-colors cursor-pointer select-none rounded-none tracking-normal"
                        style={buttonStyle}
                      >
                        Go to Feedback
                      </button>
                      <button
                        type="button"
                        onClick={() => startTransition(4, 'Preparing recovery environment...')}
                        className="sparkle-recovery-btn border-2 border-solid border-white px-3.5 py-1 sm:px-4 sm:py-1 text-[11.5px] sm:text-[12px] font-normal transition-colors cursor-pointer select-none rounded-none tracking-normal"
                        style={buttonStyle}
                      >
                        Continue recover
                      </button>
                    </motion.div>
                  </motion.div>
                )}

                {/* STEP 4 (Recovery in progress) */}
                {step === 4 && (
                  <motion.div
                    key="step-4"
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
                      Getting things ready for you
                    </motion.div>
                    <motion.p
                      variants={slideUpVariant}
                      initial="hidden"
                      animate="visible"
                      className="text-[13.5px] sm:text-[14px] text-white/95 leading-normal mt-2.5 sm:mt-3 font-normal"
                      style={{ fontWeight: 400 }}
                    >
                      Recovering your Sparkle experience. This might take several minutes...
                    </motion.p>

                    <motion.div
                      variants={slideUpVariant}
                      initial="hidden"
                      animate="visible"
                      className="flex items-center gap-3.5 mt-5 sm:mt-6"
                    >
                      <SpinningRing size={24} className="shrink-0" ariaLabel="Recovery in progress" />
                      <span className="text-white text-xs sm:text-[13.5px] font-normal tracking-wide" style={{ fontWeight: 400 }}>
                        {progress}% completed
                      </span>
                    </motion.div>

                    {/* Cancel button: Visible until progress > 50% */}
                    {progress <= 50 && (
                      <motion.div
                        variants={slideUpVariant}
                        initial="hidden"
                        animate="visible"
                        className="flex items-center justify-end mt-5 sm:mt-6"
                      >
                        <button
                          type="button"
                          onClick={handleCancel}
                          className="sparkle-recovery-btn border-2 border-solid border-white px-3.5 py-1 sm:px-4 sm:py-1 text-[11.5px] sm:text-[12px] font-normal transition-colors cursor-pointer select-none rounded-none tracking-normal"
                          style={buttonStyle}
                        >
                          Cancel
                        </button>
                      </motion.div>
                    )}
                  </motion.div>
                )}
              </>
            )}
            </AnimatePresence>
          </div>
        </section>
      </div>
    </AnimatePresence>
  );

  return modalContent;
};
