import { InlineProblem } from "@eli-coach-platform/ui/primitives";

import {
  PAYMENT_METHOD_UNAVAILABLE_MESSAGE,
  PAYMENT_PROBLEM_LINE,
} from "./payment-method-copy";

export type PaymentMethodProblem = "payment-problem" | "hand-off-failed";

type PaymentMethodProblemsProps = {
  ids: Readonly<Record<PaymentMethodProblem, string>>;
  shown: readonly PaymentMethodProblem[];
};

const PROBLEM_LINES = {
  "payment-problem": {
    copy: PAYMENT_PROBLEM_LINE,
    parity: "payment-problem",
    role: "status",
  },
  "hand-off-failed": {
    copy: PAYMENT_METHOD_UNAVAILABLE_MESSAGE,
    parity: "payment-method-problem",
    role: "alert",
  },
} as const satisfies Record<
  PaymentMethodProblem,
  { copy: string; parity: string; role: "status" | "alert" }
>;

export function PaymentMethodProblems({
  ids,
  shown,
}: PaymentMethodProblemsProps) {
  return shown.map((problem) => {
    const line = PROBLEM_LINES[problem];

    return (
      <InlineProblem
        data-parity={line.parity}
        id={ids[problem]}
        key={problem}
        role={line.role}
      >
        {line.copy}
      </InlineProblem>
    );
  });
}
