import { Link, type To } from "react-router";
import { tabsListVariants, tabsTriggerVariants } from "./tabs";
import { cn } from "./utils";

export type SegmentedNavItem = { label: string; to: To; current: boolean };

type SegmentedNavProps = {
  label: string;
  items: readonly SegmentedNavItem[];
  className?: string;
  onNavigate?: () => void;
};

export function SegmentedNav({ label, items, className, onNavigate }: SegmentedNavProps) {
  return (
    <nav
      aria-label={label}
      className={cn(tabsListVariants({ variant: "segmented" }), className)}
    >
      {items.map((item) => (
        <Link
          key={item.label}
          to={item.to}
          aria-current={item.current ? "page" : undefined}
          onClick={onNavigate}
          className={tabsTriggerVariants({ variant: "segmented" })}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
