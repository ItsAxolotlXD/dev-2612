export interface AppPortalCoordinates {
  x: number;
  y: number;
}

export const getAppPortalTarget = (): HTMLElement | null => {
  if (typeof document === 'undefined') return null;
  return document.getElementById('sparkle-app-root') ?? document.body;
};

export const toAppPortalCoordinates = (clientX: number, clientY: number): AppPortalCoordinates => {
  if (typeof document === 'undefined') return { x: clientX, y: clientY };

  const appRoot = document.getElementById('sparkle-app-root');
  if (!appRoot) return { x: clientX, y: clientY };

  // Portalized overlays need viewport points converted back into the transformed app root's local space.
  const bounds = appRoot.getBoundingClientRect();
  const scaleX = bounds.width / appRoot.offsetWidth || 1;
  const scaleY = bounds.height / appRoot.offsetHeight || 1;

  return {
    x: (clientX - bounds.left) / scaleX,
    y: (clientY - bounds.top) / scaleY,
  };
};
