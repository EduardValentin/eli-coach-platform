import { cn } from "./utils";

function Skeleton({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="skeleton"
      className={cn("block bg-surface-muted animate-pulse rounded-field motion-reduce:animate-none", className)}
      {...props}
    />
  );
}

export { Skeleton };
