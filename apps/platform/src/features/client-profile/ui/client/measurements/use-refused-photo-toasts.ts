import { toast } from "@eli-coach-platform/ui/toast";
import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router";

import { MEASUREMENTS_COPY } from "~/features/client-profile/contracts/measurements";
import { refusedPhotoViewsIn } from "~/features/client-profile/ui/shared/photos/refused-photos-state";

export function useRefusedPhotoToasts(): void {
  const location = useLocation();
  const navigate = useNavigate();
  const toastedLocationKey = useRef<string | null>(null);

  useEffect(() => {
    const refusedViews = refusedPhotoViewsIn(location.state);
    if (
      refusedViews.length === 0 ||
      toastedLocationKey.current === location.key
    ) {
      return;
    }

    toastedLocationKey.current = location.key;
    refusedViews.forEach((view) =>
      toast.error(MEASUREMENTS_COPY.toasts.photoRefused(view)),
    );
    void navigate(
      {
        hash: location.hash,
        pathname: location.pathname,
        search: location.search,
      },
      { preventScrollReset: true, replace: true, state: null },
    );
  }, [location, navigate]);
}
