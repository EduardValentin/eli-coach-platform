import { X } from "lucide-react";
import { Dialog as RadixDialog } from "radix-ui";
import {
  createContext,
  useContext,
  useLayoutEffect,
  type ReactNode,
  type RefObject,
} from "react";

import { cn } from "../lib/cn";
import { buttonVariants } from "../primitives/button";

export type ShownHeader = { description?: string };

export const ShownHeaderContext = createContext<
  (header: ShownHeader | null) => void
>(() => {});

export type SheetClose = "none" | "shown";

export const SheetCloseContext = createContext<SheetClose>("none");

type SheetDialogRule = "subtle" | "faint";

const RULE_COLOR_CLASS: Record<SheetDialogRule, string> = {
  subtle: "border-border-subtle",
  faint: "border-stroke-faint",
};

type SheetDialogHeaderProps = {
  eyebrow?: ReactNode;
  title: string;
  description?: string;
  rule?: SheetDialogRule;
  titleRef?: RefObject<HTMLHeadingElement | null>;
};

export function SheetDialogHeader({
  eyebrow,
  title,
  description,
  rule = "subtle",
  titleRef,
}: SheetDialogHeaderProps) {
  const announceHeader = useContext(ShownHeaderContext);
  const sheetClose = useContext(SheetCloseContext);

  useLayoutEffect(() => {
    announceHeader({ description });
    return () => announceHeader(null);
  }, [announceHeader, description]);

  return (
    <div
      className={cn(
        "relative shrink-0 border-b px-5 pt-6 pb-4 md:px-8 md:pt-8",
        RULE_COLOR_CLASS[rule],
      )}
      data-parity="sheet-header"
    >
      {sheetClose === "shown" && (
        <RadixDialog.Close
          aria-label="Close"
          className={buttonVariants({
            className: "absolute top-4 right-3",
            size: "icon-sm",
            variant: "ghost",
          })}
        >
          <X aria-hidden="true" />
        </RadixDialog.Close>
      )}
      {eyebrow}
      <RadixDialog.Title
        className="pr-10 text-lg leading-snug font-semibold text-text-primary outline-none md:text-xl"
        ref={titleRef}
        tabIndex={titleRef ? -1 : undefined}
      >
        {title}
      </RadixDialog.Title>
      {description && (
        <RadixDialog.Description
          className="mt-1 text-xs text-text-secondary sm:text-sm"
          data-parity="sheet-description"
        >
          {description}
        </RadixDialog.Description>
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

type SheetDialogFooterProps = {
  children: ReactNode;
  rule?: SheetDialogRule;
};

export function SheetDialogFooter({
  children,
  rule = "subtle",
}: SheetDialogFooterProps) {
  return (
    <div
      className={cn(
        "shrink-0 border-t bg-surface-base px-5 py-3 md:px-8 md:py-4",
        RULE_COLOR_CLASS[rule],
      )}
      data-parity="sheet-footer"
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
