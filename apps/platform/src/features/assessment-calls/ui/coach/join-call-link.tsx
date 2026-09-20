import { buttonVariants } from "@eli-coach-platform/ui/primitives";
import { Link } from "react-router";

const JOIN_CALL_CLASSES = buttonVariants({
  size: "xs",
  textSize: "sm",
  variant: "inverted",
  weight: "semibold",
});

export function JoinCallLink({ joinPath }: { joinPath: string }) {
  return (
    <Link className={JOIN_CALL_CLASSES} to={joinPath}>
      Join call
    </Link>
  );
}
