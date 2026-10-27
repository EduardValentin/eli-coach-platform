import { useEffect, useEffectEvent, useRef } from "react";

type LoadOnOpening = {
  load: () => void;
  open: boolean;
};

export function useLoadOnOpening({ load, open }: LoadOnOpening): void {
  const loadedThisOpening = useRef(false);
  const loadOnOpening = useEffectEvent(load);

  useEffect(() => {
    if (!open) {
      loadedThisOpening.current = false;
      return;
    }

    if (loadedThisOpening.current) return;

    loadedThisOpening.current = true;
    loadOnOpening();
  }, [open]);
}
