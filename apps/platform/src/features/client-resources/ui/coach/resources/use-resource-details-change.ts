import type { ResourceDetailsProblems } from "@eli-coach-platform/domain/client-resources";
import { useEffect, useEffectEvent } from "react";
import { useFetcher } from "react-router";

import {
  changedResourceAnswerSchema,
  resourceDetailsProblemsAnswerSchema,
} from "~/features/client-resources/contracts/client-resources";
import { resourcePath } from "~/features/client-resources/contracts/paths";

export type ResourceDetailsChangeOutcome =
  | { status: "changed" }
  | { status: "details-refused"; problems: ResourceDetailsProblems }
  | { status: "failed" };

export type ResourceDetailsChange = {
  title: string;
  description: string;
};

function outcomeOf(answer: unknown): ResourceDetailsChangeOutcome {
  if (changedResourceAnswerSchema.safeParse(answer).success) {
    return { status: "changed" };
  }

  const detailsRefused = resourceDetailsProblemsAnswerSchema.safeParse(answer);
  if (detailsRefused.success) {
    return {
      status: "details-refused",
      problems: detailsRefused.data.problems,
    };
  }

  return { status: "failed" };
}

export function useResourceDetailsChange(
  resourceId: string,
  onSettled: (outcome: ResourceDetailsChangeOutcome) => void,
) {
  const { data, state, submit } = useFetcher<unknown>();

  const settle = useEffectEvent((answer: unknown) => {
    onSettled(outcomeOf(answer));
  });

  useEffect(() => {
    if (data !== undefined) {
      settle(data);
    }
  }, [data]);

  const change = (details: ResourceDetailsChange) => {
    void submit(details, {
      action: resourcePath(resourceId),
      encType: "application/json",
      method: "patch",
    });
  };

  return { change, saving: state === "submitting" };
}
