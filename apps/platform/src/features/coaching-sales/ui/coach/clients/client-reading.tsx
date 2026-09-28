import type { ReactNode } from "react";

export const ABSENT_READING = "—";

type ClientReadingProps = {
  label: string;
  value: ReactNode;
  valueParity: string;
  className?: string;
};

export function ClientReading({
  className,
  label,
  value,
  valueParity,
}: ClientReadingProps) {
  return (
    <div className={className}>
      <dt className="text-label text-text-secondary uppercase">{label}</dt>
      <dd
        className="mt-1 text-sm font-medium text-text-primary"
        data-parity={valueParity}
      >
        {value}
      </dd>
    </div>
  );
}
