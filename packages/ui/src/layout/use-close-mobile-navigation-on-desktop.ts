import { useEffect, type RefObject } from "react";

type CloseMobileNavigationOptions = {
  close: () => void;
  isOpen: boolean;
  mobileControlRef: RefObject<HTMLElement | null>;
};

function isHiddenByDisplay(element: HTMLElement) {
  let currentElement: HTMLElement | null = element;

  while (currentElement !== null) {
    if (window.getComputedStyle(currentElement).display === "none") {
      return true;
    }
    currentElement = currentElement.parentElement;
  }

  return false;
}

function focusMainContent() {
  const mainContent = document.querySelector<HTMLElement>("main");
  if (mainContent === null) {
    return;
  }

  if (!mainContent.hasAttribute("tabindex")) {
    mainContent.tabIndex = -1;
  }
  mainContent.focus({ preventScroll: true });
}

export function useCloseMobileNavigationOnDesktop(
  options: CloseMobileNavigationOptions,
) {
  const { close, isOpen, mobileControlRef } = options;

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const closeWhenControlIsHidden = () => {
      const mobileControl = mobileControlRef.current;
      if (mobileControl !== null && isHiddenByDisplay(mobileControl)) {
        close();
        window.requestAnimationFrame(focusMainContent);
      }
    };

    window.addEventListener("resize", closeWhenControlIsHidden);
    closeWhenControlIsHidden();

    return () => {
      window.removeEventListener("resize", closeWhenControlIsHidden);
    };
  }, [close, isOpen, mobileControlRef]);
}
