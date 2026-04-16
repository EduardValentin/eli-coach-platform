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

export function getHeadingHierarchyIssues(levels: readonly number[]) {
  const issues: string[] = [];
  const h1Count = levels.filter((level) => level === 1).length;

  if (h1Count !== 1) {
    issues.push(`Expected exactly one h1, found ${h1Count}.`);
  }

  const firstHeadingLevel = levels[0];

  if (typeof firstHeadingLevel === "number" && firstHeadingLevel !== 1) {
    issues.push(`Expected the first heading to be h1, found h${firstHeadingLevel}.`);
  }

  for (let index = 1; index < levels.length; index += 1) {
    const previousLevel = levels[index - 1];
    const currentLevel = levels[index];

    if (currentLevel - previousLevel > 1) {
      issues.push(`Heading levels skip from h${previousLevel} to h${currentLevel}.`);
    }
  }

  return issues;
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

function auditHeadingHierarchy(pathname: string) {
  const mainContent = document.getElementById(MAIN_CONTENT_ID);

  if (!(mainContent instanceof HTMLElement)) {
    console.warn(`[a11y] Missing #${MAIN_CONTENT_ID} on ${pathname}.`);
    return;
  }

  const headingElements = Array.from(mainContent.querySelectorAll("h1, h2, h3, h4, h5, h6"));
  const levels = headingElements.map((headingElement) => Number.parseInt(headingElement.tagName.slice(1), 10));
  const issues = getHeadingHierarchyIssues(levels);

  if (issues.length > 0) {
    console.warn(`[a11y] Heading hierarchy issue on ${pathname}: ${issues.join(" ")}`);
  }
}

export function AccessibilityManager() {
  const location = useLocation();
  const navigation = useNavigation();
  const [announcement, setAnnouncement] = useState("");
  const hasHandledInitialRender = useRef(false);
  const isDevelopment = process.env.NODE_ENV !== "production";

  useEffect(() => {
    if (!isDevelopment || navigation.state !== "idle") {
      return;
    }

    const auditHandle = window.requestAnimationFrame(() => {
      auditHeadingHierarchy(location.pathname);
    });

    return () => {
      window.cancelAnimationFrame(auditHandle);
    };
  }, [isDevelopment, location.pathname, navigation.state]);

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
