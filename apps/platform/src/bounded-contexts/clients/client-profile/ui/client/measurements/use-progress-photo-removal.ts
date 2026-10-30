import { toast } from "~/shared/design-system/toast";
import { useEffect } from "react";
import { useFetcher } from "react-router";

import { MEASUREMENTS_COPY } from "~/bounded-contexts/clients/client-profile/public/measurements";
import { progressPhotoPath } from "~/bounded-contexts/clients/client-profile/public/paths";

export function useProgressPhotoRemoval() {
  const { data, state, submit } = useFetcher<unknown>();
  const removalRefused = state === "idle" && data !== undefined;

  useEffect(() => {
    if (removalRefused) {
      toast.error(MEASUREMENTS_COPY.toasts.removeFailed);
    }
  }, [removalRefused]);

  return (photoId: string) =>
    submit(null, { action: progressPhotoPath(photoId), method: "delete" });
}
