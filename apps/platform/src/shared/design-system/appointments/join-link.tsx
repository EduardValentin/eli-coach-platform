import { Video } from "lucide-react";
import { Link, type LinkProps } from "react-router";

import { cn } from "../lib/cn";
import { buttonVariants } from "../primitives/button";

type JoinLinkSize = "sm" | "xs";

type JoinLinkTone = "primary" | "quiet";

type JoinLinkWidth = "content" | "full";

type JoinLinkProps = Omit<LinkProps, "children" | "reloadDocument"> & {
  label: string;
  size?: JoinLinkSize;
  tone: JoinLinkTone;
  width?: JoinLinkWidth;
};

const TONE_VARIANTS: Record<JoinLinkTone, "outline" | "primary"> = {
  primary: "primary",
  quiet: "outline",
};

const WIDTH_CLASS_NAMES: Record<JoinLinkWidth, string> = {
  content: "",
  full: "w-full",
};

export function JoinLink({
  className,
  label,
  size = "sm",
  tone,
  width = "content",
  ...props
}: JoinLinkProps) {
  return (
    <Link
      className={buttonVariants({
        className: cn(WIDTH_CLASS_NAMES[width], className),
        size,
        variant: TONE_VARIANTS[tone],
      })}
      {...props}
      reloadDocument
    >
      <Video aria-hidden="true" className="size-4" />
      {label}
    </Link>
  );
}
