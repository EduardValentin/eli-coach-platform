import { buttonVariants } from "@eli-coach-platform/ui/primitives";
import { Video } from "lucide-react";
import { Link } from "react-router";

type JoinCallTone = "default" | "live";

const BUTTON_VARIANT_BY_TONE: Record<JoinCallTone, "outline" | "primary"> = {
  default: "outline",
  live: "primary",
};

type JoinCallLinkProps = {
  joinPath: string;
  tone: JoinCallTone;
};

export function JoinCallLink({ joinPath, tone }: JoinCallLinkProps) {
  return (
    <Link
      className={buttonVariants({
        size: "xs",
        variant: BUTTON_VARIANT_BY_TONE[tone],
      })}
      data-parity-root="JoinCallLink"
      to={joinPath}
    >
      <Video aria-hidden="true" className="size-3.5 shrink-0" />
      Join call
    </Link>
  );
}
