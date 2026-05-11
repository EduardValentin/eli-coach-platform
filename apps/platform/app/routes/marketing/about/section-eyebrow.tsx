import type { ComponentPropsWithoutRef } from "react";

type SectionEyebrowProps = ComponentPropsWithoutRef<"p">;

const sectionEyebrowClassName =
  "mb-4 text-label font-semibold uppercase text-brand-primary";

export function SectionEyebrow({ className, ...props }: SectionEyebrowProps) {
  return (
    <p
      className={[sectionEyebrowClassName, className].filter(Boolean).join(" ")}
      {...props}
    />
  );
}
