import * as React from "react";
import { Toast as RadixToast } from "radix-ui";

import { cn } from "../lib/cn";

export type ToastTone = "success" | "error" | "info";

export type ToastOptions = {
  description?: string;
  title: string;
  tone?: ToastTone;
};

type ToastRecord = {
  description?: string;
  id: number;
  title: string;
  tone: ToastTone;
};

type ToastContextValue = { notify: (options: ToastOptions) => void };

const ToastContext = React.createContext<ToastContextValue | null>(null);
const TOAST_DURATION_MS = 5000;
const toneBorderClasses: Record<ToastTone, string> = {
  error: "border-feedback-danger/30",
  info: "border-feedback-info/30",
  success: "border-feedback-success/30",
};
const toneTitleClasses: Record<ToastTone, string> = {
  error: "text-feedback-danger",
  info: "text-feedback-info",
  success: "text-feedback-success",
};

export type ToastRegionProps = React.PropsWithChildren<{
}>;

/** Mounted once per surface: the queue `useToast` feeds, and the viewport it drains into. */
export function ToastRegion(props: ToastRegionProps) {
  const { children } = props;
  const [toasts, setToasts] = React.useState<ToastRecord[]>([]);
  const nextId = React.useRef(0);
  const notify = React.useCallback((options: ToastOptions) => {
    nextId.current += 1;
    const id = nextId.current;

    setToasts((current) => [
      ...current,
      {
        description: options.description,
        id,
        title: options.title,
        tone: options.tone ?? "info",
      },
    ]);
  }, []);
  const value = React.useMemo(() => ({ notify }), [notify]);

  function dismiss(id: number) {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }

  return (
    <ToastContext.Provider value={value}>
      <RadixToast.Provider duration={TOAST_DURATION_MS} swipeDirection="right">
        {children}
        {toasts.map((toast) => (
          <RadixToast.Root
            className={cn(
              "grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 rounded-md border bg-surface-base p-4 shadow-raised",
              toneBorderClasses[toast.tone],
            )}
            key={toast.id}
            onOpenChange={(open) => {
              if (!open) {
                dismiss(toast.id);
              }
            }}
            // Radix maps `type` straight onto `aria-live`: `foreground` is
            // assertive and cuts off whatever the reader is mid-way through —
            // the focus landing after a dialog closes, say. A confirmation can
            // wait its turn, which is what a status region promises.
            type="background"
          >
            <RadixToast.Title
              className={cn(
                "text-body-sm font-semibold",
                toneTitleClasses[toast.tone],
              )}
            >
              {toast.title}
            </RadixToast.Title>
            <RadixToast.Close
              aria-label="Dismiss notification"
              className="row-span-2 inline-flex size-8 items-center justify-center rounded-pill text-text-muted hover:bg-surface-subtle hover:text-text-primary focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-primary"
            >
              <span aria-hidden="true" className="text-xl leading-none">
                ×
              </span>
            </RadixToast.Close>
            {toast.description ? (
              <RadixToast.Description className="text-body-sm text-text-secondary">
                {toast.description}
              </RadixToast.Description>
            ) : null}
          </RadixToast.Root>
        ))}
        <RadixToast.Viewport
          className="fixed right-4 top-4 z-[80] flex w-[min(100%-2rem,24rem)] flex-col gap-2 outline-none"
          label="Notifications ({hotkey})"
        />
      </RadixToast.Provider>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = React.useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used within a ToastRegion.");
  }

  return context;
}
