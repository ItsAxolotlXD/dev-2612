import { useState, useEffect, useCallback } from 'react';

export type DriverStatus = 'installed' | 'ignored' | 'missing';

export interface UseDriversReturn {
  resolutionStatus: DriverStatus;
  visualStatus: DriverStatus;
  isResolutionInstalled: boolean;
  isVisualInstalled: boolean;
  installResolutionDriver: () => void;
  rollbackResolutionDriver: () => void;
  installVisualDriver: () => void;
  rollbackVisualDriver: () => void;
  resetAllDrivers: () => void;
}

export const DRIVER_EVENT_NAME = 'sparkle_driver_status_change';

export function getResolutionDriverStatus(): DriverStatus {
  try {
    const val = localStorage.getItem('sparkle_driver_resolution');
    if (val === 'installed') return 'installed';
    if (val === 'ignored') return 'ignored';
    return 'missing';
  } catch {
    return 'missing';
  }
}

export function getVisualDriverStatus(): DriverStatus {
  try {
    const val = localStorage.getItem('sparkle_driver_visual');
    if (val === 'installed') return 'installed';
    if (val === 'ignored') return 'ignored';
    return 'missing';
  } catch {
    return 'missing';
  }
}

export function useDrivers(): UseDriversReturn {
  const [resolutionStatus, setResolutionStatus] = useState<DriverStatus>(getResolutionDriverStatus);
  const [visualStatus, setVisualStatus] = useState<DriverStatus>(getVisualDriverStatus);

  const syncStatuses = useCallback(() => {
    setResolutionStatus(getResolutionDriverStatus());
    setVisualStatus(getVisualDriverStatus());
  }, []);

  useEffect(() => {
    const handler = () => syncStatuses();
    window.addEventListener(DRIVER_EVENT_NAME, handler);
    window.addEventListener('storage', handler);
    return () => {
      window.removeEventListener(DRIVER_EVENT_NAME, handler);
      window.removeEventListener('storage', handler);
    };
  }, [syncStatuses]);

  const notifyChange = () => {
    try {
      window.dispatchEvent(new Event(DRIVER_EVENT_NAME));
    } catch {}
  };

  const installResolutionDriver = useCallback(() => {
    try {
      localStorage.setItem('sparkle_driver_resolution', 'installed');
    } catch {}
    setResolutionStatus('installed');
    notifyChange();
  }, []);

  const rollbackResolutionDriver = useCallback(() => {
    try {
      localStorage.setItem('sparkle_driver_resolution', 'ignored');
    } catch {}
    setResolutionStatus('ignored');
    notifyChange();
  }, []);

  const installVisualDriver = useCallback(() => {
    try {
      localStorage.setItem('sparkle_driver_visual', 'installed');
    } catch {}
    setVisualStatus('installed');
    notifyChange();
  }, []);

  const rollbackVisualDriver = useCallback(() => {
    try {
      localStorage.setItem('sparkle_driver_visual', 'ignored');
    } catch {}
    setVisualStatus('ignored');
    notifyChange();
  }, []);

  const resetAllDrivers = useCallback(() => {
    try {
      localStorage.removeItem('sparkle_driver_resolution');
      localStorage.removeItem('sparkle_driver_visual');
    } catch {}
    setResolutionStatus('missing');
    setVisualStatus('missing');
    notifyChange();
  }, []);

  return {
    resolutionStatus,
    visualStatus,
    isResolutionInstalled: resolutionStatus === 'installed',
    isVisualInstalled: visualStatus === 'installed',
    installResolutionDriver,
    rollbackResolutionDriver,
    installVisualDriver,
    rollbackVisualDriver,
    resetAllDrivers,
  };
}
