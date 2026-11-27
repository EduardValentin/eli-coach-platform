import type { ReactNode } from 'react';

interface PhoneFrameProps {
  children: ReactNode;
  statusBarVariant?: 'light' | 'dark';
  time?: string;
  className?: string;
  'aria-label'?: string;
}

export function PhoneFrame({
  children,
  statusBarVariant = 'dark',
  time = '9:41',
  className = '',
  'aria-label': ariaLabel,
}: PhoneFrameProps) {
  const textClass = statusBarVariant === 'light' ? 'text-white' : 'text-foreground';
  const dotClass = statusBarVariant === 'light' ? 'bg-white' : 'bg-foreground';

  return (
    <div
      aria-label={ariaLabel}
      className={`relative rounded-phone-frame border-4 border-foreground/10 bg-card shadow-phone-frame overflow-hidden ${className}`}
    >
      {children}

      <div
        aria-hidden="true"
        data-parity="phone-frame-notch"
        className="absolute top-2 left-1/2 -translate-x-1/2 w-24 h-5 bg-foreground rounded-full z-30"
      />

      <div
        aria-hidden="true"
        className={`absolute top-0 left-0 right-0 h-10 flex items-center justify-between px-6 pt-2.5 text-micro font-semibold z-20 tabular-nums pointer-events-none ${textClass}`}
      >
        <span>{time}</span>
        <span className="flex items-center gap-1">
          <span data-parity="phone-frame-status-dot-1" className={`block w-1 h-1 rounded-full ${dotClass}`} />
          <span data-parity="phone-frame-status-dot-2" className={`block w-1 h-1 rounded-full ${dotClass}`} />
          <span data-parity="phone-frame-status-dot-3" className={`block w-1 h-1 rounded-full ${dotClass}`} />
        </span>
      </div>
    </div>
  );
}
