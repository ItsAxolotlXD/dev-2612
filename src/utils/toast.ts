export interface AppToastDetail {
  title?: string;
  message: string;
  appName?: string;
  actionLabel?: string;
  onAction?: () => void;
  id?: string | number;
}

export const showAppToast = (
  message: string,
  actionLabel?: string,
  onAction?: () => void,
  options?: { title?: string; appName?: string }
) => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent<AppToastDetail>('app:show-toast', {
        detail: {
          message,
          actionLabel,
          onAction,
          title: options?.title,
          appName: options?.appName,
          id: Date.now() + Math.random(),
        },
      })
    );
  }
};
