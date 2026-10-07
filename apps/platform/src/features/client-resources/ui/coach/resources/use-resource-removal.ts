import { toast } from "@eli-coach-platform/ui/toast";
import { useEffect, useEffectEvent, useState } from "react";
import { useFetcher, useFetchers, useSubmit } from "react-router";

import { removedResourceAnswerSchema } from "~/features/client-resources/contracts/client-resources";
import { resourcePath } from "~/features/client-resources/contracts/paths";

const COPY = {
  removed: "Resource deleted.",
  failed: "The resource wasn’t deleted. Try again.",
} as const;

export function useResourceRemoval() {
  const submit = useSubmit();
  const [unanswered, setUnanswered] = useState<readonly string[]>([]);
  const pendingFetcherKeys = new Set(
    useFetchers().map((fetcher) => fetcher.key),
  );

  const remove = (resourceId: string) => {
    const action = resourcePath(resourceId);

    setUnanswered((current) => [...current, resourceId]);
    void submit(null, {
      action,
      fetcherKey: action,
      method: "delete",
      navigate: false,
    });
  };

  const answered = (resourceId: string) => {
    setUnanswered((current) => current.filter((id) => id !== resourceId));
  };

  return {
    isBeingRemoved: (resourceId: string) =>
      pendingFetcherKeys.has(resourcePath(resourceId)),
    awaitsAnswer: (resourceId: string) => unanswered.includes(resourceId),
    unanswered,
    answered,
    remove,
  };
}

export function useResourceRemovalAnswer(
  resourceId: string,
  onAnswered: (resourceId: string) => void,
) {
  const { data } = useFetcher<unknown>({ key: resourcePath(resourceId) });

  const answer = useEffectEvent((received: unknown) => {
    if (removedResourceAnswerSchema.safeParse(received).success) {
      toast.success(COPY.removed);
    } else {
      toast.error(COPY.failed);
    }
    onAnswered(resourceId);
  });

  useEffect(() => {
    if (data !== undefined) {
      answer(data);
    }
  }, [data]);
}
