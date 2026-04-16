import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigation } from "react-router";

export const MAIN_CONTENT_ID = "main-content";
export const PAGE_HEADING_ATTRIBUTE = "true";

const PAGE_HEADING_SELECTOR = `[data-page-heading="${PAGE_HEADING_ATTRIBUTE}"]`;

export function getAnnouncementText(documentTitle: string, fallbackHeading: string | null) {
  const normalizedTitle = documentTitle
    .split("|")[0]
    ?.trim();

  if (normalizedTitle) {
    return normalizedTitle;
  }

  return fallbackHeading?.trim() ?? "";
}

function getFallbackHeadingText() {
  return document.querySelector<HTMLElement>(PAGE_HEADING_SELECTOR)?.textContent ?? null;
}

function focusCurrentPage() {
  const mainContent = document.getElementById(MAIN_CONTENT_ID);

  if (mainContent instanceof HTMLElement) {
    mainContent.focus({ preventScroll: true });
    return;
  }

  document.querySelector<HTMLElement>(PAGE_HEADING_SELECTOR)?.focus({ preventScroll: true });
}

export function AccessibilityManager() {
  const location = useLocation();
  const navigation = useNavigation();
  const [announcement, setAnnouncement] = useState("");
  const hasHandledInitialRender = useRef(false);

  useEffect(() => {
    if (navigation.state !== "idle") {
      return;
    }

    if (!hasHandledInitialRender.current) {
      hasHandledInitialRender.current = true;
      return;
    }

    const message = getAnnouncementText(document.title, getFallbackHeadingText());
    const focusHandle = window.requestAnimationFrame(() => {
      focusCurrentPage();
    });
    const announceHandle = window.setTimeout(() => {
      setAnnouncement(message);
    }, 0);

    setAnnouncement("");

    return () => {
      window.cancelAnimationFrame(focusHandle);
      window.clearTimeout(announceHandle);
    };
  }, [location.key, navigation.state]);

  return (
    <p aria-atomic="true" aria-live="polite" className="ui-sr-only" role="status">
      {announcement}
    </p>
  );
}
