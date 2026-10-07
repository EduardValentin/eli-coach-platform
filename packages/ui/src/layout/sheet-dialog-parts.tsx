import type { ReactNode } from "react";

type SheetDialogHeaderProps = {
  title: string;
  description?: string;
};

export function SheetDialogHeader({
  title,
  description,
}: SheetDialogHeaderProps) {
  return (
    <div className="shrink-0 border-b border-border-subtle px-5 pt-6 pb-4 md:px-8 md:pt-8">
      <h3 className="pr-10 text-lg leading-snug font-semibold text-text-primary md:text-xl">
        {title}
      </h3>
      {description && (
        <p className="mt-1 text-xs text-text-secondary sm:text-sm">
          {description}
        </p>
      )}
    </div>
  );
}

export function SheetDialogBody({ children }: { children: ReactNode }) {
  return (
    <div
      className="min-h-0 flex-1 overflow-y-auto px-5 pt-5 pb-6 md:px-8 md:pt-6 md:pb-8"
      data-parity="sheet-body"
    >
      {children}
    </div>
  );
}

export function SheetDialogActions({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col-reverse gap-3 sm:flex-row-reverse">
      {children}
    </div>
  );
}
