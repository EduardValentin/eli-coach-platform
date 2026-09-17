export function createFocusRestoreTracker() {
  let opener: HTMLElement | null = null;
  let persistentControl: HTMLButtonElement | null = null;

  return {
    rememberOpener(nextOpener: HTMLElement): void {
      opener = nextOpener;
    },
    setPersistentControl(control: HTMLButtonElement | null): void {
      persistentControl = control;
    },
    // Takes rather than reads: the opener is consumed, so a second call
    // during the same close would resolve to a different target.
    take(): HTMLElement | null {
      const rememberedOpener = opener;
      opener = null;
      const focusTarget = rememberedOpener?.isConnected
        ? rememberedOpener
        : persistentControl;

      return focusTarget?.isConnected ? focusTarget : null;
    },
  };
}
