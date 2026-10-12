import { cn } from './ui/utils';

export function NavigationCount({
  count,
  className,
}: {
  count: number;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'w-5 h-5 rounded-full bg-status-pending text-white text-micro font-bold flex items-center justify-center',
        className,
      )}
      data-parity="navigation-count"
    >
      {count}
    </span>
  );
}

export function NavigationCountLabel({ count }: { count: number }) {
  return <span className="sr-only"> ({count} waiting on you)</span>;
}
