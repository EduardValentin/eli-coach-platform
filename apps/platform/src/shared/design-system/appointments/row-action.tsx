import { Loader2, type LucideIcon } from "lucide-react";
import type { ComponentPropsWithoutRef } from "react";
import { Link, type LinkProps } from "react-router";

import { Button, buttonVariants } from "../primitives/button";

type RowActionTone = "default" | "primary" | "destructive";

const BUTTON_VARIANT_BY_TONE = {
  default: "outline",
  destructive: "destructive-outline",
  primary: "primary",
} as const satisfies Record<RowActionTone, string>;

const ROW_ACTION_ICON_CLASS_NAME = "size-3.5 shrink-0";

type RowActionButtonProps = ComponentPropsWithoutRef<"button"> & {
  busy?: boolean;
  icon?: LucideIcon;
  tone?: RowActionTone;
};

export function RowActionButton({
  busy = false,
  children,
  disabled,
  icon: Icon,
  tone = "default",
  ...props
}: RowActionButtonProps) {
  return (
    <Button
      aria-busy={busy || undefined}
      disabled={disabled || busy}
      size="xs"
      variant={BUTTON_VARIANT_BY_TONE[tone]}
      {...props}
    >
      {busy ? (
        <Loader2 aria-hidden="true" className="size-3.5 animate-spin" />
      ) : (
        Icon && (
          <Icon aria-hidden="true" className={ROW_ACTION_ICON_CLASS_NAME} />
        )
      )}
      {children}
    </Button>
  );
}

type RowActionLinkProps = LinkProps & {
  icon?: LucideIcon;
  tone?: RowActionTone;
};

export function RowActionLink({
  children,
  className,
  icon: Icon,
  tone = "default",
  ...props
}: RowActionLinkProps) {
  return (
    <Link
      className={buttonVariants({
        className,
        size: "xs",
        variant: BUTTON_VARIANT_BY_TONE[tone],
      })}
      {...props}
    >
      {Icon && (
        <Icon aria-hidden="true" className={ROW_ACTION_ICON_CLASS_NAME} />
      )}
      {children}
    </Link>
  );
}
