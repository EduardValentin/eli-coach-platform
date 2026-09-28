import { cn } from "@eli-coach-platform/ui/lib";
import { User } from "lucide-react";

type ClientNameBlockSize = "md" | "sm";

type ClientNameBlockProps = {
  displayName: string;
  size: ClientNameBlockSize;
};

const AVATAR_BY_SIZE: Record<
  ClientNameBlockSize,
  { className: string; iconSize: number }
> = {
  md: { className: "size-10", iconSize: 20 },
  sm: { className: "size-9", iconSize: 18 },
};

export function ClientNameBlock(props: ClientNameBlockProps) {
  const { displayName, size } = props;
  const avatar = AVATAR_BY_SIZE[size];

  return (
    <div className="flex min-w-0 items-center gap-3" data-parity="name-block">
      <div
        className={cn(
          avatar.className,
          "flex shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary",
        )}
        data-parity="avatar"
      >
        <User aria-hidden="true" size={avatar.iconSize} />
      </div>
      <div className="min-w-0">
        <p
          className="truncate text-sm font-medium text-text-primary"
          data-parity="name"
        >
          {displayName}
        </p>
      </div>
    </div>
  );
}
