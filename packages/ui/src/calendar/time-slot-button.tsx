import { cn } from "../lib/cn";
import { Skeleton } from "../primitives/skeleton";

export type TimeSlotDetail =
  | { kind: "text"; parity: string; text: string }
  | { kind: "loading"; parity: string };

type TimeSlotButtonProps = {
  detail?: TimeSlotDetail;
  isSelected: boolean;
  label: string;
  onSelect: () => void;
};

type TimeSlotDetailSlotProps = {
  detail: TimeSlotDetail;
  isSelected: boolean;
};

const DETAIL_PLACEMENT_CLASS =
  "absolute top-1/2 left-full ml-2 -translate-y-1/2 whitespace-nowrap";

function TimeSlotDetailSlot({ detail, isSelected }: TimeSlotDetailSlotProps) {
  if (detail.kind === "loading") {
    return (
      <Skeleton
        aria-hidden="true"
        className={cn(DETAIL_PLACEMENT_CLASS, "h-3 w-12")}
        data-parity={detail.parity}
      />
    );
  }

  return (
    <>
      <span className="sr-only"> </span>
      <span
        className={cn(DETAIL_PLACEMENT_CLASS, "text-xs", {
          "text-status-pending": !isSelected,
        })}
        data-parity={detail.parity}
      >
        {detail.text}
      </span>
    </>
  );
}

export function TimeSlotButton({
  detail,
  isSelected,
  label,
  onSelect,
}: TimeSlotButtonProps) {
  return (
    <button
      aria-pressed={isSelected}
      className={cn(
        "w-full rounded-control border px-4 py-3 text-sm font-medium transition-all duration-200",
        {
          "border-primary/30 bg-surface-base text-primary hover:border-primary hover:bg-primary/5":
            !isSelected,
          "border-primary bg-primary text-primary-foreground shadow-card":
            isSelected,
        },
      )}
      onClick={onSelect}
      type="button"
    >
      <span className="relative">
        <span>{label}</span>
        {detail && (
          <TimeSlotDetailSlot detail={detail} isSelected={isSelected} />
        )}
      </span>
    </button>
  );
}
