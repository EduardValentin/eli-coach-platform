import { cn } from "@eli-coach-platform/ui/lib";
import { User } from "lucide-react";
import { Link } from "react-router";

import type { ClientAvatarUrl } from "~/features/client-profile/public/client-avatar";
import { CLIENT_PROFILE_PATH } from "~/features/client-profile/public/paths";
import { clientAvatarSrc } from "~/features/client-profile/ui/shared/avatar/client-avatar-src";

type ClientNameBlockSize = "md" | "sm";

type ClientNameBlockProps = {
  avatarUrl: ClientAvatarUrl;
  displayName: string;
  size: ClientNameBlockSize;
  onNavigate?: () => void;
};

const AVATAR_BY_SIZE: Record<
  ClientNameBlockSize,
  { className: string; iconSize: number }
> = {
  md: { className: "size-10", iconSize: 20 },
  sm: { className: "size-9", iconSize: 18 },
};

export function ClientNameBlock(props: ClientNameBlockProps) {
  const { avatarUrl, displayName, onNavigate, size } = props;
  const avatar = AVATAR_BY_SIZE[size];
  const avatarSrc = clientAvatarSrc(avatarUrl);

  return (
    <Link
      className="flex min-w-0 items-center gap-3 rounded-control transition-opacity hover:opacity-80"
      data-parity="name-block"
      onClick={onNavigate}
      to={CLIENT_PROFILE_PATH}
    >
      {avatarSrc ? (
        <img
          alt=""
          className={cn(
            avatar.className,
            "shrink-0 rounded-full border border-border-subtle object-cover",
          )}
          data-parity="avatar"
          src={avatarSrc}
        />
      ) : (
        <div
          className={cn(
            avatar.className,
            "flex shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary",
          )}
          data-parity="avatar"
        >
          <User aria-hidden="true" size={avatar.iconSize} />
        </div>
      )}
      <div className="min-w-0">
        <p
          className="truncate text-sm font-medium text-text-primary"
          data-parity="name"
        >
          {displayName}
        </p>
      </div>
    </Link>
  );
}
