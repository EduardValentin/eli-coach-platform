import { RowActionLink } from "@eli-coach-platform/ui/appointments";
import { Video } from "lucide-react";

type JoinCallTone = "default" | "live";

const ROW_ACTION_TONE_BY_JOIN_CALL_TONE = {
  default: "default",
  live: "primary",
} as const satisfies Record<JoinCallTone, string>;

type JoinCallLinkProps = {
  joinPath: string;
  tone: JoinCallTone;
};

export function JoinCallLink({ joinPath, tone }: JoinCallLinkProps) {
  return (
    <RowActionLink
      data-parity-root="JoinCallLink"
      icon={Video}
      to={joinPath}
      tone={ROW_ACTION_TONE_BY_JOIN_CALL_TONE[tone]}
    >
      Join call
    </RowActionLink>
  );
}
