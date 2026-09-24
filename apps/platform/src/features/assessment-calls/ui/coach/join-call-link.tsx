import { buttonVariants } from "@eli-coach-platform/ui/primitives";
import { Video } from "lucide-react";
import { Link } from "react-router";

type JoinCallLinkProps = {
  joinPath: string;
  live?: boolean;
};

export function JoinCallLink({ joinPath, live = false }: JoinCallLinkProps) {
  return (
    <Link
      className={buttonVariants({
        size: "xs",
        variant: live ? "primary" : "outline",
      })}
      data-parity-root="JoinCallLink"
      to={joinPath}
    >
      <Video aria-hidden="true" className="size-3.5 shrink-0" />
      Join call
    </Link>
  );
}
