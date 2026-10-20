import { useCallback, useEffect, useRef, useState } from 'react';
import type { RowTarget } from '../../../domain/programEditing';

export function useLibraryPicker() {
  const [target, setTarget] = useState<RowTarget | null>(null);
  const opener = useRef<HTMLElement | null>(null);
  const closing = useRef(false);

  const open = useCallback((next: RowTarget) => {
    if (document.activeElement instanceof HTMLElement) opener.current = document.activeElement;
    setTarget(next);
  }, []);

  const close = useCallback(() => {
    closing.current = true;
    setTarget(null);
  }, []);

  useEffect(() => {
    if (target !== null || !closing.current) return;
    closing.current = false;
    if (opener.current?.isConnected) opener.current.focus();
  }, [target]);

  return { target, open, close };
}
