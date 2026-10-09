import { Video } from "lucide-react";
import { Link, type LinkProps } from "react-router";

import { buttonVariants } from "../primitives/button";

type JoinLinkSize = "sm" | "xs";

type JoinLinkTone = "primary" | "quiet";

type JoinLinkProps = Omit<LinkProps, "children" | "className"> & {
  label: string;
  size?: JoinLinkSize;
  tone: JoinLinkTone;
};

const TONE_VARIANTS: Record<JoinLinkTone, "outline" | "primary"> = {
  primary: "primary",
  quiet: "outline",
};

export function JoinLink({
  label,
  size = "sm",
  tone,
  ...props
}: JoinLinkProps) {
  return (
    <Link
      className={buttonVariants({ size, variant: TONE_VARIANTS[tone] })}
      {...props}
    >
      <Video aria-hidden="true" className="size-4" />
      {label}
    </Link>
  );
}
