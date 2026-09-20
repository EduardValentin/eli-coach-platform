import type { CSSProperties } from "react";
import { Toaster as SonnerToaster, type ToasterProps } from "sonner";

export { toast } from "sonner";

const TOAST_STYLE = {
  "--normal-bg": "var(--color-surface-base)",
  "--normal-border": "var(--color-border-default)",
  "--normal-text": "var(--color-text-primary)",
  "--success-text": "var(--color-feedback-success)",
  "--error-text": "var(--color-feedback-danger)",
} as CSSProperties;

export function Toaster(props: ToasterProps) {
  return (
    <SonnerToaster
      position="top-right"
      richColors
      style={TOAST_STYLE}
      {...props}
    />
  );
}
