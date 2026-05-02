type WaitlistToastProps = {
  message: string | null;
};

export function WaitlistToast(props: WaitlistToastProps) {
  if (!props.message) {
    return null;
  }

  return (
    <div
      className="fixed right-4 top-24 z-[70] max-w-sm rounded-md border border-border-soft bg-surface-base px-4 py-3 text-body-sm font-medium text-text-primary shadow-raised"
      role="status"
    >
      {props.message}
    </div>
  );
}
