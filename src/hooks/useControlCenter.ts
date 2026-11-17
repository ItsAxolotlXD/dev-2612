import { useSyncExternalStore } from 'react';

export interface ControlCenterState {
  wifiEnabled: boolean;
  bluetoothEnabled: boolean;
  nightLightEnabled: boolean;
  brightness: number; // 20..100, default 100 (no dim)
  volume: number; // 0..100, default 75
  isMuted: boolean;
}

const STORAGE_KEY = 'sparkle_control_center_state_v1';

const DEFAULT_CONTROL_CENTER_STATE: ControlCenterState = {
  wifiEnabled: true,
  bluetoothEnabled: true,
  nightLightEnabled: false,
  brightness: 100,
  volume: 75,
  isMuted: false,
};

const loadInitialState = (): ControlCenterState => {
  if (typeof window === 'undefined') return DEFAULT_CONTROL_CENTER_STATE;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CONTROL_CENTER_STATE;
    const parsed = JSON.parse(raw);
    return {
      wifiEnabled: typeof parsed.wifiEnabled === 'boolean' ? parsed.wifiEnabled : true,
      bluetoothEnabled: typeof parsed.bluetoothEnabled === 'boolean' ? parsed.bluetoothEnabled : true,
      nightLightEnabled: typeof parsed.nightLightEnabled === 'boolean' ? parsed.nightLightEnabled : false,
      brightness:
        typeof parsed.brightness === 'number'
          ? Math.max(20, Math.min(100, Math.round(parsed.brightness)))
          : 100,
      volume:
        typeof parsed.volume === 'number'
          ? Math.max(0, Math.min(100, Math.round(parsed.volume)))
          : 75,
      isMuted: typeof parsed.isMuted === 'boolean' ? parsed.isMuted : false,
    };
  } catch {
    return DEFAULT_CONTROL_CENTER_STATE;
  }
};

let currentState: ControlCenterState = loadInitialState();
const listeners = new Set<() => void>();

const emit = () => {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch (err) {
      console.error(err);
    }
  });
};

export const updateControlCenterState = (partial: Partial<ControlCenterState>) => {
  currentState = {
    ...currentState,
    ...partial,
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(currentState));
  } catch {}
  emit();
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const getSnapshot = () => currentState;

export const useControlCenter = () => {
  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return {
    state,
    updateState: updateControlCenterState,
  };
};
