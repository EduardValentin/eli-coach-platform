import { CheckCircle2 } from "lucide-react";
import { createPortal } from "react-dom";

type WaitlistToastProps = {
  message: string | null;
};

export function WaitlistToast(props: WaitlistToastProps) {
  if (!props.message || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      className="fixed left-4 right-4 top-4 z-[90] flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-body-sm font-semibold text-green-700 shadow-raised"
      role="status"
    >
      <CheckCircle2 aria-hidden="true" className="shrink-0" size={18} />
      <span>{props.message}</span>
    </div>,
    document.body,
  );
}
