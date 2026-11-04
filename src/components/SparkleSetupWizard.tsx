import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  Search,
  HardDrive,
  RefreshCw,
  Plus,
  Trash2,
  FolderOpen,
  Volume2,
  Mic,
  Keyboard,
  Sparkles,
  Tv,
  Layout,
  MessageSquareHeart
} from 'lucide-react';
import { SparkleRecoveryModal } from './SparkleRecoveryModal';
import { WINDOWS_LOADING_GIF } from '../constants/assets';

export interface SparkleSetupWizardProps {
  isOpen: boolean;
  onFinish: () => void;
  initialStep?: number;
}

// Country list for Step 1
const REGIONS = [
  { id: 'vn', name: 'Vietnam' },
  { id: 'us', name: 'United States' },
  { id: 'uk', name: 'United Kingdom' },
  { id: 'jp', name: 'Japan' },
  { id: 'kr', name: 'South Korea' },
  { id: 'sg', name: 'Singapore' },
  { id: 'fr', name: 'France' },
  { id: 'de', name: 'Germany' },
  { id: 'ca', name: 'Canada' },
  { id: 'au', name: 'Australia' },
  { id: 'th', name: 'Thailand' },
  { id: 'id', name: 'Indonesia' },
  { id: 'my', name: 'Malaysia' },
  { id: 'ph', name: 'Philippines' },
  { id: 'in', name: 'India' },
  { id: 'br', name: 'Brazil' },
  { id: 'tv', name: 'Tuvalu' },
  { id: 'um', name: 'U.S. Minor Outlying Islands' },
  { id: 'vi', name: 'U.S. Virgin Islands' },
  { id: 'ug', name: 'Uganda' },
  { id: 'ua', name: 'Ukraine' },
  { id: 'ae', name: 'United Arab Emirates' }
];

const KEYBOARD_LAYOUTS = [
  { id: 'vi-telex', name: 'Vietnamese (Telex)' },
  { id: 'vi-vni', name: 'Vietnamese (VNI)' },
  { id: 'en-us', name: 'English (United States)' },
  { id: 'en-intl', name: 'United States-International' },
  { id: 'jp-ime', name: 'Japanese (Microsoft IME)' }
];

const AVATAR_OPTIONS = [
  { id: 'astronaut', emoji: '🧑‍🚀', label: 'Astronaut' },
  { id: 'sparkle', emoji: '✨', label: 'Sparkle' },
  { id: 'gamer', emoji: '🎮', label: 'Gamer' },
  { id: 'artist', emoji: '🎨', label: 'Creator' },
  { id: 'cat', emoji: '🐱', label: 'Mascot' },
  { id: 'flower', emoji: '🌸', label: 'Lotus' }
];

export interface DrivePartition {
  id: string;
  name: string;
  total: string;
  free: string;
  type: 'System' | 'Primary' | 'Logical' | 'Unallocated';
  sizeMb: number;
}

const INITIAL_PARTITIONS: DrivePartition[] = [
  { id: 'part-1', name: 'Drive 0 Partition 1: System Reserved', total: '500.0 MB', free: '420.0 MB', type: 'System', sizeMb: 500 },
  { id: 'part-2', name: 'Drive 0 Partition 2: Sparkle OS (C:)', total: '256.0 GB', free: '184.5 GB', type: 'Primary', sizeMb: 262144 },
  { id: 'part-3', name: 'Drive 0 Partition 3: Media & Data (D:)', total: '500.0 GB', free: '450.0 GB', type: 'Primary', sizeMb: 512000 },
  { id: 'part-4', name: 'Drive 0 Unallocated Space', total: '268.0 GB', free: '268.0 GB', type: 'Unallocated', sizeMb: 274432 }
];

export const SparkleSetupWizard: React.FC<SparkleSetupWizardProps> = ({
  isOpen,
  onFinish,
  initialStep = 1
}) => {
  // Current step 1 to 6
  const [currentStep, setCurrentStep] = useState<number>(initialStep);

  // Transition state: 5-second "Just a moment..." spinning ring between steps
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);
  const transitionTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Modal dialog recovery state (triggered when selecting 'Recover Sparkle')
  const [isRecoveryModalOpen, setIsRecoveryModalOpen] = useState<boolean>(false);

  // Post-Wizard Sequence states:
  // 'none' -> 'just-a-moment-10s' -> 'hi' (3s, black) -> 'ready' (3s, black)
  // -> 'blue-1' ("This might take a few minutes")
  // -> 'blue-2' ("We'd love to hear your feedback")
  // -> 'blue-3' ("Be sure to keep your tab and browser open")
  // -> 'blue-4' ("Making sure everything is ready for you")
  // -> 'blue-5' ("Don't worry it won't take long")
  // -> 'almost-there' (3s, BLACK background) -> 'complete'
  type PostWizardPhase =
    | 'none'
    | 'just-a-moment-10s'
    | 'hi'
    | 'ready'
    | 'blue-1'
    | 'blue-2'
    | 'blue-3'
    | 'blue-4'
    | 'blue-5'
    | 'almost-there'
    | 'complete';

  const [postPhase, setPostPhase] = useState<PostWizardPhase>('none');
  const postTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Form selections
  const [selectedRegion, setSelectedRegion] = useState<string>('vn');
  const [selectedKeyboard, setSelectedKeyboard] = useState<string>('vi-telex');
  const [installMode, setInstallMode] = useState<'install' | 'recover'>('install');

  // Partitions state (supports create new and delete)
  const [partitions, setPartitions] = useState<DrivePartition[]>(INITIAL_PARTITIONS);
  const [selectedPartition, setSelectedPartition] = useState<string>('part-2');
  const [isCreatingNew, setIsCreatingNew] = useState<boolean>(false);
  const [newPartitionSizeMb, setNewPartitionSizeMb] = useState<number>(51200);

  const [username, setUsername] = useState<string>('Sparkle User');
  const [selectedAvatar, setSelectedAvatar] = useState<string>('sparkle');
  const [licenseAccepted, setLicenseAccepted] = useState<boolean>(true);
  const [licenseDeclineWarning, setLicenseDeclineWarning] = useState<boolean>(false);

  // Search filter for countries
  const [regionSearch, setRegionSearch] = useState<string>('');

  // Reset step whenever opened
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(initialStep);
      setIsTransitioning(false);
      setPostPhase('none');
      setInstallMode('install');
      setIsCreatingNew(false);
    }
  }, [isOpen, initialStep]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
      if (postTimerRef.current) clearTimeout(postTimerRef.current);
    };
  }, []);

  if (!isOpen) return null;

  // Move between steps with 5-second spinning circle transition
  const goToNextStep = (nextStep: number) => {
    setIsTransitioning(true);

    if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
    transitionTimerRef.current = setTimeout(() => {
      setIsTransitioning(false);
      setCurrentStep(nextStep);
    }, 5000);
  };

  const goToPreviousStep = (prevStep: number) => {
    if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
    setIsTransitioning(false);
    setCurrentStep(prevStep);
  };

  // Partition Delete Handler
  const handleDeletePartition = () => {
    if (!selectedPartition) return;
    const target = partitions.find((p) => p.id === selectedPartition);
    if (!target) return;
    if (target.type === 'Unallocated') return;

    setPartitions((prev) => {
      const remaining = prev.filter((p) => p.id !== selectedPartition);
      const unalloc = remaining.find((p) => p.type === 'Unallocated');
      if (unalloc) {
        const newSizeMb = unalloc.sizeMb + target.sizeMb;
        const newTotal = (newSizeMb / 1024).toFixed(1) + ' GB';
        return remaining.map((p) =>
          p.id === unalloc.id ? { ...p, sizeMb: newSizeMb, total: newTotal, free: newTotal } : p
        );
      } else {
        const newUnalloc: DrivePartition = {
          id: 'part-' + Date.now(),
          name: 'Drive 0 Unallocated Space',
          total: (target.sizeMb / 1024).toFixed(1) + ' GB',
          free: (target.sizeMb / 1024).toFixed(1) + ' GB',
          type: 'Unallocated',
          sizeMb: target.sizeMb,
        };
        return [...remaining, newUnalloc];
      }
    });

    const nextPart = partitions.find((p) => p.id !== selectedPartition);
    if (nextPart) setSelectedPartition(nextPart.id);
  };

  // Partition Create New Handler
  const handleApplyNewPartition = () => {
    const sizeToUse = Math.max(1024, newPartitionSizeMb);
    const unalloc = partitions.find((p) => p.type === 'Unallocated');

    const partNumber = partitions.filter((p) => p.type !== 'Unallocated').length + 1;
    const sizeGb = (sizeToUse / 1024).toFixed(1) + ' GB';

    const newPart: DrivePartition = {
      id: 'part-' + Date.now(),
      name: `Drive 0 Partition ${partNumber}: New Volume`,
      total: sizeGb,
      free: sizeGb,
      type: 'Primary',
      sizeMb: sizeToUse
    };

    setPartitions((prev) => {
      const listWithoutUnalloc = prev.filter((p) => p.type !== 'Unallocated');
      if (unalloc && unalloc.sizeMb > sizeToUse) {
        const remSizeMb = unalloc.sizeMb - sizeToUse;
        const remTotal = (remSizeMb / 1024).toFixed(1) + ' GB';
        return [
          ...listWithoutUnalloc,
          newPart,
          { ...unalloc, sizeMb: remSizeMb, total: remTotal, free: remTotal }
        ];
      } else {
        return [...listWithoutUnalloc, newPart];
      }
    });

    setSelectedPartition(newPart.id);
    setIsCreatingNew(false);
  };

  // Start the post-wizard sequence after step 6:
  // 1. "Just a moment" loading circle for 10 seconds
  // 2. "Hi." for 3s (black bg)
  // 3. "Getting things ready for you" for 3s (black bg)
  // 4. Blue screens with "Don't close the tab or browser" at bottom:
  //    - "This might take a few minutes"
  //    - "We'd love to hear your feedback"
  //    - "Be sure to keep your tab and browser open"
  //    - "Making sure everything is ready for you"
  //    - "Don't worry it won't take long"
  // 5. "Almost there!" for 3s (BLACK bg)
  // 6. Enter app
  const startPostWizardSequence = () => {
    // Save preferences
    try {
      localStorage.setItem('sparkle_username', username.trim() || 'Sparkle User');
      localStorage.setItem('sparkle_region', selectedRegion);
      localStorage.setItem('sparkle_keyboard', selectedKeyboard);
      localStorage.setItem('sparkle_avatar', selectedAvatar);
      localStorage.setItem('sparkle_install_mode', installMode);
    } catch {}

    // Phase 1: Just a moment loading circle GIF for 10 seconds
    setPostPhase('just-a-moment-10s');

    postTimerRef.current = setTimeout(() => {
      // Phase 2: "Hi." (stays static for 3s, black bg)
      setPostPhase('hi');

      postTimerRef.current = setTimeout(() => {
        // Phase 3: "Getting things ready for you" (stays static for 3s, black bg)
        setPostPhase('ready');

        postTimerRef.current = setTimeout(() => {
          // Blue Screen 1: "This might take a few minutes" (3.5s)
          setPostPhase('blue-1');

          postTimerRef.current = setTimeout(() => {
            // Blue Screen 2: "We'd love to hear your feedback" (3.5s)
            setPostPhase('blue-2');

            postTimerRef.current = setTimeout(() => {
              // Blue Screen 3: "Be sure to keep your tab and browser open" (3.5s)
              setPostPhase('blue-3');

              postTimerRef.current = setTimeout(() => {
                // Blue Screen 4: "Making sure everything is ready for you" (3.5s)
                setPostPhase('blue-4');

                postTimerRef.current = setTimeout(() => {
                  // Blue Screen 5: "Don't worry it won't take long" (3.5s)
                  setPostPhase('blue-5');

                  postTimerRef.current = setTimeout(() => {
                    // Final Phase: "Almost there!" (stays static for 3s, BLACK bg)
                    setPostPhase('almost-there');

                    postTimerRef.current = setTimeout(() => {
                      // Complete and enter app
                      try {
                        localStorage.setItem('sparkle_setup_wizard_completed', 'true');
                      } catch {}
                      setPostPhase('complete');
                      onFinish();
                    }, 3000);
                  }, 3500);
                }, 3500);
              }, 3500);
            }, 3500);
          }, 3500);
        }, 3000);
      }, 3000);
    }, 10000);
  };

  // Bypass the setup steps and any running post-install sequence.
  const handleQuickSkip = () => {
    if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
    if (postTimerRef.current) clearTimeout(postTimerRef.current);
    try {
      localStorage.setItem('sparkle_setup_wizard_completed', 'true');
      localStorage.setItem('sparkle_username', username.trim() || 'Sparkle User');
    } catch {}
    onFinish();
  };

  // Helper for Category Header at top: Basics (1-2), Account (3-4), Services (5-6)
  const getCategoryTitle = () => {
    if (currentStep <= 2) return 'Basics';
    if (currentStep <= 4) return 'Account';
    return 'Services';
  };

  // Filtered country list
  const filteredRegions = REGIONS.filter((r) =>
    r.name.toLowerCase().includes(regionSearch.toLowerCase())
  );

  // RENDER POST-WIZARD FULLSCREEN SEQUENCES (Images 2 & 3 style)
  // Behind all fade-in / fade-out transitions is a solid BLACK screen (bg-black)
  if (postPhase !== 'none' && postPhase !== 'complete') {
    const isBlueScreen =
      postPhase === 'blue-1' ||
      postPhase === 'blue-2' ||
      postPhase === 'blue-3' ||
      postPhase === 'blue-4' ||
      postPhase === 'blue-5';

    const getBlueText = () => {
      switch (postPhase) {
        case 'blue-1':
          return 'This might take a few minutes';
        case 'blue-2':
          return "We'd love to hear your feedback";
        case 'blue-3':
          return 'Be sure to keep your tab and browser open';
        case 'blue-4':
          return 'Making sure everything is ready for you';
        case 'blue-5':
          return "Don't worry it won't take long";
        default:
          return '';
      }
    };

    return (
      <div className="fixed inset-0 z-[2147483647] select-none flex items-center justify-center overflow-hidden font-sans bg-black">
        <button
          type="button"
          onClick={handleQuickSkip}
          aria-label="Skip setup"
          className="absolute right-6 top-6 z-10 border border-white/60 bg-black/45 px-4 py-2 text-sm text-white transition-colors hover:bg-black/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          Skip
        </button>
        {/* 4:3 native ratio stretched to 16:9 fullscreen */}
        <div
          className="w-full h-full flex flex-col items-center justify-center overflow-hidden"
          style={{
            width: '75%',
            height: '100%',
            transform: 'scaleX(1.333333)',
            transformOrigin: 'center center'
          }}
        >
          <AnimatePresence mode="wait">
            {/* Phase: Just a moment (10s) on a black background */}
            {postPhase === 'just-a-moment-10s' && (
              <motion.div
                key="post-just-a-moment"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.5, ease: 'easeInOut' }}
                className="w-full h-full flex flex-col items-center justify-center bg-black text-white"
              >
                <div className="flex flex-col items-center gap-6">
                  <img
                    src={WINDOWS_LOADING_GIF}
                    alt="Loading..."
                    className="w-14 h-14 object-contain select-none pointer-events-none"
                  />
                  <div
                    className="text-[22px] sm:text-[24px] !font-normal tracking-wide text-white/95"
                    style={{ fontWeight: 400, fontFamily: "'Segoe UI Variable Display', 'Segoe UI', system-ui, sans-serif" }}
                  >
                    Just a moment...
                  </div>
                </div>
              </motion.div>
            )}

            {/* Phase: "Hi." (3s static) - Black Background like Image 2, Font Regular */}
            {postPhase === 'hi' && (
              <motion.div
                key="post-hi"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.5, ease: 'easeInOut' }}
                className="w-full h-full flex flex-col items-center justify-center bg-black text-white px-6 text-center"
              >
                <div
                  className="text-[36px] sm:text-[46px] md:text-[54px] text-white tracking-wide select-none !font-normal"
                  style={{
                    fontWeight: 400,
                    fontFamily: "'Segoe UI Variable Display', 'Segoe UI', system-ui, sans-serif"
                  }}
                >
                  Hi.
                </div>
              </motion.div>
            )}

            {/* Phase: "Getting things ready for you" (3s static) - Black Background like Image 2, Font Regular */}
            {postPhase === 'ready' && (
              <motion.div
                key="post-ready"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.5, ease: 'easeInOut' }}
                className="w-full h-full flex flex-col items-center justify-center bg-black text-white px-6 text-center"
              >
                <div
                  className="text-[28px] sm:text-[38px] md:text-[44px] text-white/95 tracking-normal select-none !font-normal"
                  style={{
                    fontWeight: 400,
                    fontFamily: "'Segoe UI Variable Display', 'Segoe UI', system-ui, sans-serif"
                  }}
                >
                  Getting things ready for you
                </div>
              </motion.div>
            )}

            {/* Blue Screens (Image 3 style: solid blue background, font regular, no line wrap) */}
            {isBlueScreen && (
              <motion.div
                key={postPhase}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.5, ease: 'easeInOut' }}
                className="w-full h-full flex flex-col items-center justify-between py-16 px-6 relative bg-[#00477e] text-white text-center"
                style={{ backgroundColor: '#00477e' }}
              >
                <div className="w-full" />
                <div className="space-y-4 max-w-5xl mx-auto flex items-center justify-center px-4">
                  <div
                    className="text-[24px] sm:text-[34px] md:text-[42px] lg:text-[46px] text-white/95 tracking-normal leading-tight whitespace-nowrap select-none !font-normal"
                    style={{
                      fontWeight: 400,
                      fontFamily: "'Segoe UI Variable Display', 'Segoe UI', system-ui, sans-serif"
                    }}
                  >
                    {getBlueText()}
                  </div>
                </div>

                {/* Bottom notice like "Don't turn off your PC" in Image 3 */}
                <div
                  className="text-[15px] sm:text-[17px] text-white/85 select-none !font-normal"
                  style={{
                    fontWeight: 400,
                    fontFamily: "'Segoe UI Variable Text', 'Segoe UI', system-ui, sans-serif"
                  }}
                >
                  Don&apos;t close the tab or browser
                </div>
              </motion.div>
            )}

            {/* Phase: "Almost there!" (3s static) - BLACK BACKGROUND as requested, Font Regular */}
            {postPhase === 'almost-there' && (
              <motion.div
                key="post-almost-there"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.5, ease: 'easeInOut' }}
                className="w-full h-full flex flex-col items-center justify-center bg-black text-white px-6 text-center"
              >
                <div
                  className="text-[32px] sm:text-[42px] md:text-[50px] text-white/95 tracking-wide select-none !font-normal"
                  style={{
                    fontWeight: 400,
                    fontFamily: "'Segoe UI Variable Display', 'Segoe UI', system-ui, sans-serif"
                  }}
                >
                  Almost there!
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  // MAIN WINDOWS 10 OOBE FULLSCREEN LAYOUT (4:3 NATIVE RATIO STRETCHED TO 16:9)
  return (
    <div
      id="sparkle-setup-wizard-overlay"
      className="fixed inset-0 z-[2147483646] flex items-center justify-center select-none overflow-hidden bg-black text-white"
    >
      {/* 4:3 native ratio stretched to 16:9 fullscreen (width: 75% scaled horizontally by 4/3 = 1.333333x) */}
      <div
        className="w-full h-full flex flex-col justify-between overflow-hidden bg-[#00477e] text-white"
        style={{
          width: '75%',
          height: '100%',
          transform: 'scaleX(1.333333)',
          transformOrigin: 'center center',
          backgroundColor: '#00477e',
          fontFamily: "'Segoe UI Variable Text', 'Segoe UI', system-ui, sans-serif"
        }}
      >
        {/* 1. TOP HEADER BAR: SAME DARK COLOR AS BOTTOM BAR (bg-black/90) */}
        <div className="w-full h-9 bg-black/90 px-6 flex items-center justify-between text-xs tracking-wider uppercase font-medium text-white/80 relative select-none">
          {/* Back button at top-left: Styled in OOBE Blue with border */}
          <div className="w-24 flex items-center">
            {currentStep > 1 && (
              <button
                type="button"
                onClick={() => goToPreviousStep(currentStep - 1)}
                className="px-2.5 py-1 bg-[#00477e] hover:bg-[#005a9e] active:bg-[#003c6b] border border-white/40 text-white text-xs font-normal transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
                title="Back"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span className="text-[11px] uppercase tracking-wider">Back</span>
              </button>
            )}
          </div>

          {/* Top Center Category indicator tab with white underline (like Basics / Account / Services) */}
          <div className="flex flex-col items-center cursor-default">
            <span className="text-[12.5px] tracking-wide text-white font-normal lowercase first-letter:uppercase">
              {getCategoryTitle()}
            </span>
            <div className="w-28 h-[2px] bg-white mt-0.5 rounded-full" />
          </div>

          <div className="w-24 flex items-center justify-end">
            <button
              type="button"
              onClick={handleQuickSkip}
              aria-label="Skip setup"
              className="px-2.5 py-1 bg-[#00477e] hover:bg-[#005a9e] active:bg-[#003c6b] border border-white/40 text-white text-xs font-normal transition-colors cursor-pointer shadow-xs"
            >
              Skip
            </button>
          </div>
        </div>

      {/* 2. MAIN CENTER CONTENT AREA */}
      <div className="flex-1 w-full max-w-4xl mx-auto px-6 py-4 flex flex-col justify-center items-center overflow-y-auto">
        <AnimatePresence mode="wait">
          {/* 5-SECOND TRANSITION SPINNER BETWEEN STEPS WITH USER GIF */}
          {isTransitioning ? (
            <motion.div
              key="step-transitioning"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col items-center justify-center py-16 gap-6"
            >
              <img
                src={WINDOWS_LOADING_GIF}
                alt="Loading..."
                className="w-14 h-14 object-contain select-none pointer-events-none"
              />
              <div
                className="text-[22px] !font-normal text-white/95"
                style={{ fontWeight: 400, fontFamily: "'Segoe UI Variable Display', 'Segoe UI', system-ui, sans-serif" }}
              >
                Just a moment...
              </div>
            </motion.div>
          ) : (
            <div className="w-full flex flex-col items-center justify-center">
              {/* STEP 1: REGION & KEYBOARD (Image 1 Style, Font Regular) */}
              {currentStep === 1 && (
                <motion.div
                  key="win10-step-1"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="w-full flex flex-col items-center text-center space-y-6"
                >
                  {/* Title Header: Regular Font */}
                  <div
                    className="text-[28px] sm:text-[34px] md:text-[38px] text-white tracking-normal leading-snug !font-normal"
                    style={{
                      fontWeight: 400,
                      fontFamily: "'Segoe UI Variable Display', 'Segoe UI', system-ui, sans-serif"
                    }}
                  >
                    Let&apos;s start with region. Is this correct?
                  </div>

                  {/* Vertical Region List (exact replica of Image 1) */}
                  <div className="w-full max-w-[340px] sm:max-w-[380px] text-left">
                    {/* Search filter */}
                    <div className="relative mb-2">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-white/50" />
                      <input
                        type="text"
                        placeholder="Search countries..."
                        value={regionSearch}
                        onChange={(e) => setRegionSearch(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 text-xs bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:border-white"
                      />
                    </div>

                    {/* Scrollable list box with Windows 10 blue highlight */}
                    <div className="h-[210px] overflow-y-auto bg-[#00477e] border border-white/20 p-1 space-y-0.5 win-scroll">
                      {filteredRegions.map((region) => {
                        const isSelected = selectedRegion === region.id;
                        return (
                          <div
                            key={region.id}
                            onClick={() => setSelectedRegion(region.id)}
                            className={`w-full px-4 py-2 text-left text-[14px] cursor-pointer transition-colors select-none ${
                              isSelected
                                ? 'bg-[#0067c0] text-white border border-dashed border-white/70 font-medium'
                                : 'text-white/85 hover:bg-white/10'
                            }`}
                          >
                            {region.name}
                          </div>
                        );
                      })}
                    </div>

                    {/* Keyboard layout dropdown */}
                    <div className="mt-4 pt-2 border-t border-white/15">
                      <label className="block text-xs font-normal text-white/70 mb-1.5">
                        Keyboard & input method:
                      </label>
                      <select
                        value={selectedKeyboard}
                        onChange={(e) => setSelectedKeyboard(e.target.value)}
                        className="w-full px-3 py-2 text-[13px] bg-[#003c6b] text-white border border-white/30 focus:outline-none focus:border-white"
                      >
                        {KEYBOARD_LAYOUTS.map((k) => (
                          <option key={k.id} value={k.id} className="bg-[#003c6b] text-white">
                            {k.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* STEP 2: CHOOSE WHAT YOU WANT TO DO (Install / Recover, Font Regular) */}
              {currentStep === 2 && (
                <motion.div
                  key="win10-step-2"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="w-full max-w-xl flex flex-col items-center text-center space-y-6"
                >
                  {/* Title Header: Regular Font */}
                  <div
                    className="text-[28px] sm:text-[34px] md:text-[38px] text-white tracking-normal leading-snug !font-normal"
                    style={{
                      fontWeight: 400,
                      fontFamily: "'Segoe UI Variable Display', 'Segoe UI', system-ui, sans-serif"
                    }}
                  >
                    Choose what you want to do
                  </div>
                  <p className="text-[14px] text-white/80 max-w-md !font-normal">
                    Select how you would like to proceed with setting up Sparkle on this device.
                  </p>

                  <div className="w-full space-y-3.5 text-left pt-2">
                    {/* Option 1: Install Sparkle */}
                    <div
                      onClick={() => setInstallMode('install')}
                      className={`p-4 border-2 transition-all cursor-pointer select-none flex items-start gap-4 ${
                        installMode === 'install'
                          ? 'border-white bg-[#00477e] shadow-md'
                          : 'border-white/30 bg-white/5 hover:border-white/60'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                          installMode === 'install' ? 'border-white' : 'border-white/50'
                        }`}
                      >
                        {installMode === 'install' && <div className="w-2.5 h-2.5 rounded-full bg-white" />}
                      </div>
                      <div>
                        <div className="text-[16px] font-medium text-white flex items-center gap-2">
                          <span>Install Sparkle</span>
                          <span className="text-[11px] px-2 py-0.5 rounded bg-[#00477e] border border-white/40 text-white font-normal">
                            Recommended
                          </span>
                        </div>
                        <p className="text-[13px] text-white/80 mt-1 leading-relaxed !font-normal">
                          Clean installation with full Vietnamese TV channels, EPG guide, notes workspace, and media decoders.
                        </p>
                      </div>
                    </div>

                    {/* Option 2: Recover Sparkle (OPENS RECOVERY MODAL DIALOG ON CLICK) */}
                    <div
                      onClick={() => {
                        setInstallMode('recover');
                        setIsRecoveryModalOpen(true);
                      }}
                      className={`p-4 border-2 transition-all cursor-pointer select-none flex items-start gap-4 ${
                        installMode === 'recover'
                          ? 'border-white bg-[#00477e] shadow-md'
                          : 'border-white/30 bg-white/5 hover:border-white/60'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                          installMode === 'recover' ? 'border-white' : 'border-white/50'
                        }`}
                      >
                        {installMode === 'recover' && <div className="w-2.5 h-2.5 rounded-full bg-white" />}
                      </div>
                      <div>
                        <div className="text-[16px] font-medium text-white flex items-center gap-2">
                          <span>Recover Sparkle</span>
                          <span className="text-[11px] px-2 py-0.5 rounded bg-amber-400 text-black font-semibold">
                            Opens Recovery Tool
                          </span>
                        </div>
                        <p className="text-[13px] text-white/80 mt-1 leading-relaxed !font-normal">
                          Troubleshoot corrupt settings, reset options to default, or submit diagnostic feedback.
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* STEP 3: DRIVE PARTITION TABLE (Create New & Delete Support) */}
              {currentStep === 3 && (
                <motion.div
                  key="win10-step-3"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="w-full max-w-2xl flex flex-col items-center text-center space-y-5"
                >
                  {/* Title Header: Regular Font */}
                  <div
                    className="text-[26px] sm:text-[32px] md:text-[36px] text-white tracking-normal leading-snug !font-normal"
                    style={{
                      fontWeight: 400,
                      fontFamily: "'Segoe UI Variable Display', 'Segoe UI', system-ui, sans-serif"
                    }}
                  >
                    Where do you want to install Sparkle?
                  </div>

                  {/* Windows 10 Installer Partition Box */}
                  <div className="w-full border border-white/25 overflow-hidden bg-[#003c6b] text-left">
                    <div className="grid grid-cols-12 bg-black/20 px-4 py-2.5 text-[12px] font-medium text-white/80 border-b border-white/20">
                      <span className="col-span-6">Name</span>
                      <span className="col-span-2 text-right">Total size</span>
                      <span className="col-span-2 text-right">Free space</span>
                      <span className="col-span-2 text-right">Type</span>
                    </div>
                    <div className="divide-y divide-white/10 max-h-[220px] overflow-y-auto win-scroll">
                      {partitions.map((part) => {
                        const isSelected = selectedPartition === part.id;
                        return (
                          <div
                            key={part.id}
                            onClick={() => setSelectedPartition(part.id)}
                            className={`grid grid-cols-12 px-4 py-2.5 text-[13px] cursor-pointer transition-colors select-none items-center ${
                              isSelected
                                ? 'bg-[#00477e] text-white font-medium border border-dashed border-white/60'
                                : 'text-white/85 hover:bg-white/10'
                            }`}
                          >
                            <div className="col-span-6 flex items-center gap-2 truncate">
                              <HardDrive className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-white' : 'text-white/70'}`} />
                              <span className="truncate">{part.name}</span>
                            </div>
                            <span className="col-span-2 text-right">{part.total}</span>
                            <span className="col-span-2 text-right">{part.free}</span>
                            <span className="col-span-2 text-right truncate">{part.type}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Inline Create New Partition Input Box */}
                  {isCreatingNew && (
                    <div className="w-full flex items-center justify-between p-2.5 bg-[#00335c] border border-white/30 text-xs">
                      <div className="flex items-center gap-2.5">
                        <span className="text-white/90">Size (MB):</span>
                        <input
                          type="number"
                          min={1024}
                          value={newPartitionSizeMb}
                          onChange={(e) => setNewPartitionSizeMb(Number(e.target.value))}
                          className="w-28 px-2 py-1 bg-white text-black text-xs outline-none"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        {/* OOBE Blue Action Buttons */}
                        <button
                          type="button"
                          onClick={handleApplyNewPartition}
                          className="px-3 py-1 bg-[#00477e] hover:bg-[#005a9e] active:bg-[#003c6b] border border-white/40 text-white text-xs font-normal cursor-pointer shadow-xs"
                        >
                          Apply
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsCreatingNew(false)}
                          className="px-3 py-1 bg-[#00477e] hover:bg-[#005a9e] active:bg-[#003c6b] border border-white/40 text-white text-xs font-normal cursor-pointer shadow-xs"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Partition Action Toolbar (ALL BUTTONS OOBE BLUE #00477e) */}
                  <div className="flex flex-wrap items-center gap-3 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setPartitions(INITIAL_PARTITIONS);
                        setSelectedPartition('part-2');
                        setIsCreatingNew(false);
                      }}
                      className="px-3 py-1 bg-[#00477e] hover:bg-[#005a9e] active:bg-[#003c6b] border border-white/40 text-white flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Refresh</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleDeletePartition}
                      className="px-3 py-1 bg-[#00477e] hover:bg-[#005a9e] active:bg-[#003c6b] border border-white/40 text-white flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsCreatingNew(true)}
                      className="px-3 py-1 bg-[#00477e] hover:bg-[#005a9e] active:bg-[#003c6b] border border-white/40 text-white flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>New</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        // Format selected partition
                        setPartitions((prev) =>
                          prev.map((p) => (p.id === selectedPartition ? { ...p, free: p.total } : p))
                        );
                      }}
                      className="px-3 py-1 bg-[#00477e] hover:bg-[#005a9e] active:bg-[#003c6b] border border-white/40 text-white flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                    >
                      <FolderOpen className="w-3.5 h-3.5" />
                      <span>Format</span>
                    </button>
                  </div>
                </motion.div>
              )}

              {/* STEP 4: WHO IS GOING TO USE SPARKLE (Image 2 Style, Font Regular) */}
              {currentStep === 4 && (
                <motion.div
                  key="win10-step-4"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="w-full max-w-md flex flex-col items-center text-center space-y-6"
                >
                  {/* Microsoft 4-Color Logo & Title (exact replica of Image 2) */}
                  <div className="flex items-center justify-center gap-3">
                    <div className="grid grid-cols-2 gap-0.5 w-6 h-6 shrink-0">
                      <div className="bg-[#f25022] w-2.5 h-2.5" />
                      <div className="bg-[#7fba00] w-2.5 h-2.5" />
                      <div className="bg-[#00a4ef] w-2.5 h-2.5" />
                      <div className="bg-[#ffb900] w-2.5 h-2.5" />
                    </div>
                    {/* Title Header: Regular Font */}
                    <div
                      className="text-[26px] sm:text-[30px] text-white tracking-normal !font-normal"
                      style={{
                        fontWeight: 400,
                        fontFamily: "'Segoe UI Variable Display', 'Segoe UI', system-ui, sans-serif"
                      }}
                    >
                      Sign in with Sparkle
                    </div>
                  </div>

                  {/* Large Blue Circular User Avatar (exact replica of Image 2) */}
                  <div className="w-24 h-24 rounded-full bg-[#0078d7] border-2 border-white/20 flex items-center justify-center shadow-lg my-1">
                    <svg viewBox="0 0 48 48" className="w-14 h-14 fill-none stroke-white stroke-[3]">
                      <circle cx="24" cy="18" r="9" />
                      <path d="M8 40 C8 30 16 28 24 28 C32 28 40 30 40 40" strokeLinecap="round" />
                    </svg>
                  </div>

                  {/* White Rectangular Input Box (exact replica of Image 2) */}
                  <div className="w-full text-left space-y-2">
                    <input
                      type="text"
                      autoFocus
                      placeholder="Email, phone, or name"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full h-10 px-3 bg-white text-[#111827] placeholder-[#666666] text-[14px] outline-none border border-black/20 focus:ring-2 focus:ring-[#00477e]"
                    />
                    <div className="flex items-center justify-between text-xs text-white/80 pt-1">
                      <span className="hover:underline cursor-pointer">Create account</span>
                      <span className="text-white/60">Local offline profile</span>
                    </div>
                  </div>

                  {/* Avatar choices with OOBE blue buttons */}
                  <div className="flex items-center justify-center gap-2 pt-1 flex-wrap">
                    {AVATAR_OPTIONS.map((av) => (
                      <button
                        key={av.id}
                        type="button"
                        onClick={() => setSelectedAvatar(av.id)}
                        className={`w-9 h-9 rounded flex items-center justify-center text-lg transition-transform cursor-pointer ${
                          selectedAvatar === av.id
                            ? 'bg-[#00477e] scale-110 ring-2 ring-white border border-white/40 shadow-xs'
                            : 'bg-[#00477e]/80 hover:bg-[#005a9e] border border-white/30'
                        }`}
                      >
                        {av.emoji}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* STEP 5: APPLICABLE NOTICES AND LICENSE TERMS (Font Regular) */}
              {currentStep === 5 && (
                <motion.div
                  key="win10-step-5"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="w-full max-w-2xl flex flex-col items-center text-center space-y-5"
                >
                  {/* Title Header: Regular Font */}
                  <div
                    className="text-[26px] sm:text-[32px] md:text-[36px] text-white tracking-normal leading-snug !font-normal"
                    style={{
                      fontWeight: 400,
                      fontFamily: "'Segoe UI Variable Display', 'Segoe UI', system-ui, sans-serif"
                    }}
                  >
                    Applicable notices and license terms
                  </div>

                  {/* License agreement scroll box */}
                  <div className="w-full h-[200px] overflow-y-auto p-4 border border-white/25 bg-[#003c6b] text-left text-xs font-mono text-white/80 space-y-3 leading-relaxed win-scroll">
                    <div className="font-bold text-white">
                      SPARKLE COMMUNITY SOFTWARE LICENSE TERMS
                    </div>
                    <p>
                      These license terms are an agreement between you and Sparkle Platform. They apply to the Sparkle Web Application, including all television streaming players, WinUI 3 interface components, and related services.
                    </p>
                    <div className="font-semibold text-white/95">
                      1. ENTERTAINMENT & TELEVISION STREAMING
                    </div>
                    <p>
                      You may use the Sparkle player to watch public Vietnamese national and regional broadcast channels (VTV, HTV, SCTV, VTC, and provincial channels) indexed for community and non-commercial educational reception.
                    </p>
                    <div className="font-semibold text-white/95">
                      2. PRIVACY & LOCAL STORAGE
                    </div>
                    <p>
                      Sparkle respects your personal privacy. All note files, drawn canvases, customized playlists, and favorites are stored locally in your browser storage or indexed database without server-side telemetry.
                    </p>
                  </div>

                  {/* Accept Checkbox */}
                  <label className="flex items-center gap-3 cursor-pointer select-none pt-1 text-sm text-white/90">
                    <input
                      type="checkbox"
                      checked={licenseAccepted}
                      onChange={(e) => {
                        setLicenseAccepted(e.target.checked);
                        setLicenseDeclineWarning(false);
                      }}
                      className="w-4 h-4 text-[#00477e] accent-[#00477e]"
                    />
                    <span>I accept the Sparkle Software License Terms</span>
                  </label>

                  {licenseDeclineWarning && (
                    <p className="text-xs text-rose-300 font-medium">
                      You must accept the license terms to continue installing Sparkle.
                    </p>
                  )}
                </motion.div>
              )}

              {/* STEP 6: NOW LET'S SEE WHAT'S NEW ON SPARKLE (Image 3 Style, Font Regular) */}
              {currentStep === 6 && (
                <motion.div
                  key="win10-step-6"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="w-full max-w-2xl flex flex-col items-center text-center space-y-4"
                >
                  {/* Title Header: Regular Font */}
                  <div
                    className="text-[26px] sm:text-[32px] md:text-[38px] text-white tracking-normal leading-snug !font-normal"
                    style={{
                      fontWeight: 400,
                      fontFamily: "'Segoe UI Variable Display', 'Segoe UI', system-ui, sans-serif"
                    }}
                  >
                    Now let&apos;s see what&apos;s new on Sparkle
                  </div>

                  {/* Centered Laptop & Graphic Illustration (like Image 3) */}
                  <div className="relative w-64 h-32 flex items-center justify-center my-1">
                    <svg viewBox="0 0 240 120" className="w-full h-full select-none" fill="none">
                      {/* Laptop Screen */}
                      <rect x="50" y="10" width="140" height="90" rx="6" fill="#1C2D42" stroke="#FFFFFF" strokeWidth="2.5" />
                      <rect x="56" y="16" width="128" height="78" rx="3" fill="#2563EB" />
                      {/* Laptop Base */}
                      <polygon points="35,102 205,102 215,110 25,110" fill="#CBD5E1" stroke="#FFFFFF" strokeWidth="1.5" />
                      {/* Laptop Screen Content - Activity Tiles */}
                      <g transform="translate(62, 22)">
                        <rect x="0" y="0" width="36" height="20" rx="2" fill="#FFFFFF" fillOpacity="0.8" />
                        <rect x="40" y="0" width="36" height="20" rx="2" fill="#FFFFFF" fillOpacity="0.4" />
                        <rect x="80" y="0" width="36" height="20" rx="2" fill="#FFFFFF" fillOpacity="0.4" />
                        <rect x="0" y="24" width="36" height="20" rx="2" fill="#FFFFFF" fillOpacity="0.4" />
                        <rect x="40" y="24" width="36" height="20" rx="2" fill="#FFFFFF" fillOpacity="0.8" />
                        <rect x="80" y="24" width="36" height="20" rx="2" fill="#FFFFFF" fillOpacity="0.4" />
                      </g>
                      {/* Potted Plant beside laptop */}
                      <g transform="translate(195, 35)">
                        <polygon points="5,50 25,50 22,70 8,70" fill="#EA580C" />
                        <path d="M15 50 C10 30 2 25 0 20 C10 20 15 35 15 50 Z" fill="#22C55E" />
                        <path d="M15 50 C20 30 28 25 30 20 C20 20 15 35 15 50 Z" fill="#16A34A" />
                      </g>
                      {/* Coffee Cup / Water bottle */}
                      <rect x="30" y="55" width="12" height="25" rx="3" fill="#38BDF8" />
                      <rect x="33" y="50" width="6" height="5" rx="1" fill="#FFFFFF" />
                    </svg>
                  </div>

                  {/* 4 Feature Highlights */}
                  <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3 text-left pt-1">
                    <div className="p-3 bg-white/10 border border-white/20 flex items-start gap-3">
                      <Tv className="w-5 h-5 text-white shrink-0 mt-0.5" />
                      <div>
                        <div className="text-[13.5px] font-medium text-white">Unlimited entertainment</div>
                        <p className="text-[11.5px] text-white/75 mt-0.5 leading-snug !font-normal">
                          Hundreds of live Vietnamese TV channels, radio streams & on-air EPG guides.
                        </p>
                      </div>
                    </div>

                    <div className="p-3 bg-white/10 border border-white/20 flex items-start gap-3">
                      <Search className="w-5 h-5 text-white shrink-0 mt-0.5" />
                      <div>
                        <div className="text-[13.5px] font-medium text-white">Smarter search experience</div>
                        <p className="text-[11.5px] text-white/75 mt-0.5 leading-snug !font-normal">
                          Universal spotlight search, Vietnamese voice recognition & instant filtering.
                        </p>
                      </div>
                    </div>

                    <div className="p-3 bg-white/10 border border-white/20 flex items-start gap-3">
                      <Layout className="w-5 h-5 text-white shrink-0 mt-0.5" />
                      <div>
                        <div className="text-[13.5px] font-medium text-white">Modern WinUI design system</div>
                        <p className="text-[11.5px] text-white/75 mt-0.5 leading-snug !font-normal">
                          Fluent materials, Spatial Glass depth, Reveal lighting & customizable fonts.
                        </p>
                      </div>
                    </div>

                    <div className="p-3 bg-white/10 border border-white/20 flex items-start gap-3">
                      <MessageSquareHeart className="w-5 h-5 text-white shrink-0 mt-0.5" />
                      <div>
                        <div className="text-[13.5px] font-medium text-white">Developers hear from your speak</div>
                        <p className="text-[11.5px] text-white/75 mt-0.5 leading-snug !font-normal">
                          Integrated Feedback Hub, diagnostic tools & direct developer conversation.
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* 3. BOTTOM ACTION BAR & TASKBAR STRIP (ALL BUTTONS BLUE) */}
      <div className="w-full flex flex-col">
        {/* Buttons Row (Flat Rectangular Windows 10 Blue Buttons) */}
        {!isTransitioning && (
          <div className="w-full max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
            {/* Bottom-left links (Privacy & Cookies, Terms of Use - Image 2 style) */}
            <div className="flex items-center gap-4 text-xs text-white/75">
              <span className="hover:underline cursor-pointer">Privacy &amp; Cookies</span>
              <span className="hover:underline cursor-pointer">Terms of Use</span>
            </div>

            {/* Bottom-right action buttons (ALL MATCH OOBE BLUE #00477e) */}
            <div className="flex items-center gap-3">
              {currentStep === 5 && (
                <button
                  type="button"
                  onClick={() => {
                    setLicenseAccepted(false);
                    setLicenseDeclineWarning(true);
                  }}
                  className="px-8 py-2 bg-[#00477e] hover:bg-[#005a9e] active:bg-[#003c6b] border border-white/40 text-white text-[13.5px] font-normal transition-colors cursor-pointer shadow-sm"
                >
                  Decline
                </button>
              )}

              {currentStep < 6 ? (
                <button
                  type="button"
                  onClick={() => {
                    if (currentStep === 5 && !licenseAccepted) {
                      setLicenseDeclineWarning(true);
                      return;
                    }
                    goToNextStep(currentStep + 1);
                  }}
                  className="px-10 py-2 bg-[#00477e] hover:bg-[#005a9e] active:bg-[#003c6b] border border-white/40 text-white text-[13.5px] font-normal transition-colors cursor-pointer min-w-[90px] shadow-sm"
                >
                  {currentStep === 1 ? 'Yes' : currentStep === 5 ? 'Accept' : 'Next'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={startPostWizardSequence}
                  className="px-10 py-2 bg-[#00477e] hover:bg-[#005a9e] active:bg-[#003c6b] border border-white/40 text-white text-[13.5px] font-normal transition-colors cursor-pointer flex items-center gap-2 shadow-sm"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Get Started</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Black Bottom Taskbar Strip with Ease of Access / Volume / Mic icons */}
        <div className="w-full h-8 bg-black/90 px-6 flex items-center justify-between text-white/70 text-xs">
          {/* Bottom-left system icons */}
          <div className="flex items-center gap-3.5">
            <svg viewBox="0 0 16 16" className="w-4 h-4 fill-white/80 hover:fill-white cursor-pointer" title="Ease of access">
              <path d="M8 1a7 7 0 1 0 7 7A7.008 7.008 0 0 0 8 1zm0 12.6A5.6 5.6 0 1 1 13.6 8 5.606 5.606 0 0 1 8 13.6zm0-8.9a1.2 1.2 0 1 1-1.2 1.2A1.2 1.2 0 0 1 8 4.7zm2.2 4.1H9v3H7v-3H5.8a.5.5 0 0 1-.5-.5.5.5 0 0 1 .5-.5h4.4a.5.5 0 0 1 .5.5.5.5 0 0 1-.5.5z" />
            </svg>
            <Mic className="w-3.5 h-3.5 hover:text-white cursor-pointer" title="Microphone" />
          </div>

          {/* Bottom-right volume / keyboard icons */}
          <div className="flex items-center gap-3.5">
            <Keyboard className="w-4 h-4 hover:text-white cursor-pointer" title="Keyboard layout" />
            <Volume2 className="w-4 h-4 hover:text-white cursor-pointer" title="Volume" />
          </div>
        </div>
      </div>

      {/* Embedded Recovery Modal triggered when clicking Recover Sparkle */}
      <SparkleRecoveryModal
        isOpen={isRecoveryModalOpen}
        onClose={() => {
          setIsRecoveryModalOpen(false);
        }}
      />
    </div>
  </div>
);
};
