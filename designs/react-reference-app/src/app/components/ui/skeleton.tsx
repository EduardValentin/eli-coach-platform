import { cn } from "./utils";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("bg-surface-muted animate-pulse rounded-field", className)}
      {...props}
    />
  );
}

export { Skeleton };
