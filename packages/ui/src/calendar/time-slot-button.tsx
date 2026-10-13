import { cn } from "../lib/cn";

type TimeSlotDetail = {
  parity: string;
  text: string;
};

type TimeSlotButtonProps = {
  detail?: TimeSlotDetail;
  isSelected: boolean;
  label: string;
  onSelect: () => void;
};

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
      <span>{label}</span>
      {detail && (
        <span
          className={cn("ml-2 text-xs", {
            "text-status-pending": !isSelected,
          })}
          data-parity={detail.parity}
        >
          {detail.text}
        </span>
      )}
    </button>
  );
}
