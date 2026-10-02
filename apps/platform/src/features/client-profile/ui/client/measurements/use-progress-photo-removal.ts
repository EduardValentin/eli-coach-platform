import { toast } from "@eli-coach-platform/ui/toast";
import { useEffect } from "react";
import { useFetcher } from "react-router";

import { MEASUREMENTS_COPY } from "~/features/client-profile/contracts/measurements";
import { progressPhotoPath } from "~/features/client-profile/contracts/paths";

export function useProgressPhotoRemoval() {
  const { data, state, submit } = useFetcher<unknown>();
  useEffect(() => {
    if (state === "idle" && data !== undefined) {
      toast.error(MEASUREMENTS_COPY.toasts.removeFailed);
    }
  }, [state, data]);

  return (photoId: string) =>
    submit(null, { action: progressPhotoPath(photoId), method: "delete" });
}
