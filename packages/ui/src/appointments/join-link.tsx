import { Video } from "lucide-react";
import { Link, type LinkProps } from "react-router";

import { buttonVariants } from "../primitives/button";

type JoinLinkSize = "sm" | "xs";

type JoinLinkProps = Omit<LinkProps, "children" | "className"> & {
  emphasis: boolean;
  label: string;
  size?: JoinLinkSize;
};

export function JoinLink({
  emphasis,
  label,
  size = "sm",
  ...props
}: JoinLinkProps) {
  return (
    <Link
      className={buttonVariants({
        size,
        variant: emphasis ? "primary" : "outline",
      })}
      {...props}
    >
      <Video aria-hidden="true" className="size-4" />
      {label}
    </Link>
  );
}
