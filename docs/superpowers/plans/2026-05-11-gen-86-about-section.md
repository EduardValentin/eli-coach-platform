# GEN-86 About Section Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the production landing-page About section with prototype copy, approved credential chips, waitlist-aware CTAs, and an accessible Instagram story widget.

**Architecture:** Create a route-local marketing feature in `apps/platform/app/routes/marketing/about/`, then compose it after `MarketingHero` in the homepage route. The section stays static-shell friendly: all copy/media metadata is local, widget interaction state is browser-local, and waitlist mode continues to come from the existing marketing outlet context and runtime query hydration.

**Tech Stack:** React 19, React Router v7, TypeScript, Vitest, Testing Library, `@eli-coach-platform/ui`, `lucide-react`, semantic Tailwind tokens from `packages/ui/src/styles.css`.

---

## Pre-Implementation Gate

- [ ] Move Linear issue `GEN-86` to `In Progress` before editing code.
- [ ] Confirm branch is still `codex/GEN-86`.
- [ ] Confirm working tree is clean except committed design/plan docs.

Run:

```bash
git branch --show-current
git status --short
```

Expected:

```text
codex/GEN-86
```

`git status --short` should show no unstaged code changes before Task 1 starts.

## File Structure

- Create: `apps/platform/app/routes/marketing/about/about-content.ts`
  - Owns static copy, approved chips, Instagram URL, portrait source, story media metadata, and story duration.
- Create: `apps/platform/app/routes/marketing/about/section-eyebrow.tsx`
  - Route-local equivalent of the reference app's `SectionEyebrow` pattern.
- Create: `apps/platform/app/routes/marketing/about/instagram-story-widget.tsx`
  - Owns story navigation, timer/progress behavior, per-story liked state, media fallback, reduced-motion behavior, and external Instagram handle link.
- Create: `apps/platform/app/routes/marketing/about/about.tsx`
  - Owns semantic section structure, portrait, bio, chips, closing line, and waitlist-aware CTAs.
- Create: `apps/platform/app/routes/marketing/about/about.test.tsx`
  - Covers static copy, approved credentials, heading level, CTA mode behavior, external handle attributes, and media source choices.
- Create: `apps/platform/app/routes/marketing/about/instagram-story-widget.test.tsx`
  - Covers pointer navigation, keyboard navigation, timer looping, per-story liked state, reduced-motion behavior, and media error fallback.
- Modify: `apps/platform/app/routes/marketing/home.tsx`
  - Renders `MarketingAbout` immediately after `MarketingHero`.
- Modify: `apps/platform/app/routes/marketing/layout/layout.ui-integration.test.tsx`
  - Extends the existing hydration coverage to prove About CTAs stay hidden in waitlist mode and appear when runtime waitlist mode is false.

## Task 1: Static About Section And Content Contract

**Files:**
- Create: `apps/platform/app/routes/marketing/about/about.test.tsx`
- Create: `apps/platform/app/routes/marketing/about/about-content.ts`
- Create: `apps/platform/app/routes/marketing/about/section-eyebrow.tsx`
- Create: `apps/platform/app/routes/marketing/about/instagram-story-widget.tsx`
- Create: `apps/platform/app/routes/marketing/about/about.tsx`

- [ ] **Step 1: Write the failing static About tests**

Create `apps/platform/app/routes/marketing/about/about.test.tsx`:

```tsx
// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router";

import { ABOUT_CREDENTIAL_CHIPS, ABOUT_INSTAGRAM_URL, ABOUT_STORIES } from "./about-content";
import { MarketingAbout } from "./about";

afterEach(() => {
  cleanup();
});

function renderAbout(waitlistMode: boolean) {
  const router = createMemoryRouter(
    [
      {
        element: <MarketingAbout waitlistMode={waitlistMode} />,
        path: "/",
      },
      {
        element: <div>Pricing page</div>,
        path: "/pricing",
      },
      {
        element: <div>Booking shell</div>,
        path: "/book",
      },
    ],
    { initialEntries: ["/"] },
  );

  return render(<RouterProvider router={router} />);
}

describe("MarketingAbout", () => {
  it("renders the approved prototype content and credentials", () => {
    renderAbout(true);

    expect(
      screen.getByRole("heading", { level: 2, name: "Meet Eli, your coach" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Strength & nutrition for women")).toBeInTheDocument();
    expect(
      screen.getByText("I'm a personal trainer and nutritionist", { exact: false }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Doors open soon. Get on the list so yours is held."),
    ).toBeInTheDocument();

    const list = screen.getByRole("list", { name: "Eli's credentials" });
    for (const chip of ABOUT_CREDENTIAL_CHIPS) {
      expect(within(list).getByText(chip)).toBeInTheDocument();
    }
  });

  it("shows both plan and pricing CTAs only in normal mode", () => {
    renderAbout(false);

    expect(
      screen.getByText("Ready to start? Let's build a plan you can actually stick to."),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Start my plan" })).toHaveAttribute(
      "href",
      "/book",
    );
    expect(screen.getByRole("link", { name: "See pricing" })).toHaveAttribute(
      "href",
      "/pricing",
    );
  });

  it("hides the plan and pricing CTAs in waitlist mode", () => {
    renderAbout(true);

    expect(screen.queryByRole("link", { name: "Start my plan" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "See pricing" })).not.toBeInTheDocument();
  });

  it("renders the Instagram widget with safe external handle and temporary hero media", () => {
    const { container } = renderAbout(true);

    expect(
      screen.getByRole("region", { name: "Instagram stories from Eli" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "@elilungu_ on Instagram" })).toHaveAttribute(
      "href",
      ABOUT_INSTAGRAM_URL,
    );
    expect(screen.getByRole("link", { name: "@elilungu_ on Instagram" })).toHaveAttribute(
      "target",
      "_blank",
    );
    expect(screen.getByRole("link", { name: "@elilungu_ on Instagram" })).toHaveAttribute(
      "rel",
      "noopener noreferrer",
    );

    const video = container.querySelector("video");
    expect(video).toHaveAttribute("poster", "/media/hero/hero-training-poster.jpg");
    expect(video?.querySelector("source[type='video/webm']")).toHaveAttribute(
      "src",
      "/media/hero/hero-training-loop.webm",
    );
    expect(video?.querySelector("source[type='video/mp4']")).toHaveAttribute(
      "src",
      "/media/hero/hero-training-loop.mp4",
    );
    expect(ABOUT_STORIES).toHaveLength(3);
  });
});
```

- [ ] **Step 2: Run the static About tests to verify they fail**

Run:

```bash
export NVM_DIR="$HOME/.nvm"
. "$NVM_DIR/nvm.sh"
nvm use 24.14.1
pnpm vitest run apps/platform/app/routes/marketing/about/about.test.tsx
```

Expected: FAIL because `./about-content` and `./about` do not exist.

- [ ] **Step 3: Add static content constants**

Create `apps/platform/app/routes/marketing/about/about-content.ts`:

```ts
import { joinBasePath } from "@eli-coach-platform/config";

export const ABOUT_INSTAGRAM_URL = "https://www.instagram.com/elilungu_";
export const ABOUT_INSTAGRAM_HANDLE = "@elilungu_";

export const ABOUT_CREDENTIAL_CHIPS = [
  "IFBB Certified Trainer",
  "Certified Nutritionist",
  "Women Focused",
] as const;

export const ABOUT_BIO_COPY =
  "I'm a personal trainer and nutritionist, and I work with women — online and in person. What I care about most is helping you actually understand your body, not just follow a plan. I build strength training programs around your cycle, your energy, and what your week actually looks like.";

export const ABOUT_NORMAL_CLOSING_LINE =
  "Ready to start? Let's build a plan you can actually stick to.";

export const ABOUT_WAITLIST_CLOSING_LINE =
  "Doors open soon. Get on the list so yours is held.";

export const ABOUT_PORTRAIT = {
  alt: "Eli, personal trainer and nutritionist for women, smiling outdoors",
  src: "https://images.unsplash.com/photo-1757347398206-7425300ef990?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxicnVuZXR0ZSUyMHNtaWxpbmclMjB3b21hbiUyMHBvcnRyYWl0JTIwb3V0ZG9vcnxlbnwxfHx8fDE3NzQ0MzE3MDR8MA&ixlib=rb-4.1.0&q=80&w=1080",
} as const;

export const ABOUT_STORY_DURATION_MS = 5_000;

export const ABOUT_STORY_POSTER_SOURCE = joinBasePath(
  import.meta.env.BASE_URL,
  "media/hero/hero-training-poster.jpg",
);

export const ABOUT_STORY_VIDEO_SOURCES = [
  {
    src: joinBasePath(import.meta.env.BASE_URL, "media/hero/hero-training-loop.webm"),
    type: "video/webm",
  },
  {
    src: joinBasePath(import.meta.env.BASE_URL, "media/hero/hero-training-loop.mp4"),
    type: "video/mp4",
  },
] as const;

export type AboutStory = {
  id: string;
  label: string;
  durationMs: number;
  poster: string;
  sources: typeof ABOUT_STORY_VIDEO_SOURCES;
};

export const ABOUT_STORIES: AboutStory[] = [
  {
    durationMs: ABOUT_STORY_DURATION_MS,
    id: "strength-session",
    label: "Strength session preview",
    poster: ABOUT_STORY_POSTER_SOURCE,
    sources: ABOUT_STORY_VIDEO_SOURCES,
  },
  {
    durationMs: ABOUT_STORY_DURATION_MS,
    id: "coaching-check-in",
    label: "Coaching check-in preview",
    poster: ABOUT_STORY_POSTER_SOURCE,
    sources: ABOUT_STORY_VIDEO_SOURCES,
  },
  {
    durationMs: ABOUT_STORY_DURATION_MS,
    id: "cycle-aware-plan",
    label: "Cycle-aware plan preview",
    poster: ABOUT_STORY_POSTER_SOURCE,
    sources: ABOUT_STORY_VIDEO_SOURCES,
  },
];
```

- [ ] **Step 4: Add the route-local section eyebrow**

Create `apps/platform/app/routes/marketing/about/section-eyebrow.tsx`:

```tsx
import { cn } from "@eli-coach-platform/ui";
import type { ComponentPropsWithoutRef } from "react";

type SectionEyebrowProps = ComponentPropsWithoutRef<"p">;

export function SectionEyebrow({ className, ...props }: SectionEyebrowProps) {
  return (
    <p
      className={cn(
        "mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-brand-primary md:text-sm",
        className,
      )}
      {...props}
    />
  );
}
```

- [ ] **Step 5: Add the initial Instagram widget shell**

Create `apps/platform/app/routes/marketing/about/instagram-story-widget.tsx`:

```tsx
import { cn } from "@eli-coach-platform/ui";
import { Heart, MoreHorizontal } from "lucide-react";

import {
  ABOUT_INSTAGRAM_HANDLE,
  ABOUT_INSTAGRAM_URL,
  ABOUT_STORIES,
} from "./about-content";

export function InstagramStoryWidget() {
  const activeStory = ABOUT_STORIES[0];

  return (
    <section
      aria-label="Instagram stories from Eli"
      className="relative mx-auto aspect-[9/16] w-full max-w-[18rem] overflow-hidden rounded-[1.5rem] border border-border-subtle bg-surface-inverted text-text-inverted shadow-soft lg:max-w-[21rem]"
    >
      <video
        aria-label={activeStory.label}
        autoPlay
        className="absolute inset-0 size-full object-cover opacity-80"
        loop
        muted
        playsInline
        poster={activeStory.poster}
        preload="metadata"
      >
        {activeStory.sources.map((source) => (
          <source key={source.type} src={source.src} type={source.type} />
        ))}
      </video>
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-b from-overlay-strong via-surface-inverted/10 to-overlay-strong"
      />
      <div aria-hidden="true" className="absolute left-4 right-4 top-5 z-20 flex gap-1">
        {ABOUT_STORIES.map((story, index) => (
          <span
            key={story.id}
            className="h-1 flex-1 overflow-hidden rounded-pill bg-text-inverted/30"
          >
            <span
              className={cn("block h-full rounded-pill bg-text-inverted", {
                "w-full": index === 0,
                "w-0": index !== 0,
              })}
            />
          </span>
        ))}
      </div>
      <div className="absolute left-4 right-4 top-10 z-30 flex items-center justify-between gap-3">
        <a
          className="inline-flex min-h-11 items-center rounded-pill text-body-sm font-medium text-text-inverted outline-none transition-colors duration-150 ease-out hover:text-brand-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-inverted"
          href={ABOUT_INSTAGRAM_URL}
          rel="noopener noreferrer"
          target="_blank"
        >
          {ABOUT_INSTAGRAM_HANDLE} on Instagram
        </a>
        <MoreHorizontal aria-hidden="true" className="size-5 text-text-inverted/80" />
      </div>
      <div className="absolute bottom-4 left-4 right-4 z-30 flex items-center gap-3">
        <div className="flex min-h-11 flex-1 items-center rounded-pill border border-text-inverted/35 px-4 text-body-sm text-text-inverted/80 backdrop-blur-sm">
          Send message...
        </div>
        <button
          aria-label="Like story"
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full text-text-inverted outline-none transition-colors duration-150 ease-out hover:text-brand-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-inverted"
          type="button"
        >
          <Heart aria-hidden="true" className="size-5" />
        </button>
      </div>
    </section>
  );
}
```

- [ ] **Step 6: Add the About section component**

Create `apps/platform/app/routes/marketing/about/about.tsx`:

```tsx
import {
  Badge,
  buttonVariants,
  cn,
  Link as UiLink,
} from "@eli-coach-platform/ui";
import { ArrowRight, Check } from "lucide-react";
import { Link } from "react-router";

import {
  ABOUT_BIO_COPY,
  ABOUT_CREDENTIAL_CHIPS,
  ABOUT_NORMAL_CLOSING_LINE,
  ABOUT_PORTRAIT,
  ABOUT_WAITLIST_CLOSING_LINE,
} from "./about-content";
import { InstagramStoryWidget } from "./instagram-story-widget";
import { SectionEyebrow } from "./section-eyebrow";

type MarketingAboutProps = {
  waitlistMode: boolean;
};

export function MarketingAbout(props: MarketingAboutProps) {
  const closingLine = props.waitlistMode
    ? ABOUT_WAITLIST_CLOSING_LINE
    : ABOUT_NORMAL_CLOSING_LINE;

  return (
    <section className="bg-surface-page px-6 py-24 text-text-primary">
      <div className="mx-auto grid max-w-7xl items-center gap-16 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.76fr)] lg:gap-24">
        <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
          <div className="relative mb-8 size-48 rounded-full p-2 md:size-56">
            <div
              aria-hidden="true"
              className="absolute inset-0 rounded-full bg-gradient-to-tr from-brand-primary to-brand-secondary opacity-80 blur-md"
            />
            <div
              aria-hidden="true"
              className="absolute inset-1 rounded-full bg-surface-page"
            />
            <img
              alt={ABOUT_PORTRAIT.alt}
              className="relative size-full rounded-full object-cover shadow-soft"
              src={ABOUT_PORTRAIT.src}
            />
          </div>

          <SectionEyebrow>Strength & nutrition for women</SectionEyebrow>
          <h2 className="mb-6 max-w-2xl font-heading text-[2.5rem] font-medium leading-tight text-text-primary md:text-[3.25rem]">
            Meet Eli, your coach
          </h2>
          <div className="max-w-2xl space-y-4 text-body-lg leading-body text-text-secondary">
            <p>{ABOUT_BIO_COPY}</p>
            <p className="font-medium text-text-primary">{closingLine}</p>
          </div>

          <ul
            aria-label="Eli's credentials"
            className="mt-8 flex flex-wrap justify-center gap-3 lg:justify-start"
          >
            {ABOUT_CREDENTIAL_CHIPS.map((chip) => (
              <li key={chip}>
                <Badge className="gap-1.5 normal-case tracking-normal" variant="default">
                  <Check aria-hidden="true" className="size-4 text-brand-primary" />
                  {chip}
                </Badge>
              </li>
            ))}
          </ul>

          {props.waitlistMode ? null : (
            <div className="mt-10 flex flex-wrap items-center justify-center gap-5 lg:justify-start">
              <Link className={cn(buttonVariants({ size: "lg" }), "px-8")} to="/book">
                Start my plan
                <ArrowRight aria-hidden="true" size={20} />
              </Link>
              <UiLink to="/pricing" variant="inline">
                See pricing
              </UiLink>
            </div>
          )}
        </div>

        <div className="flex w-full justify-center lg:justify-end">
          <InstagramStoryWidget />
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 7: Run the static About tests to verify they pass**

Run:

```bash
export NVM_DIR="$HOME/.nvm"
. "$NVM_DIR/nvm.sh"
nvm use 24.14.1
pnpm vitest run apps/platform/app/routes/marketing/about/about.test.tsx
```

Expected: PASS.

- [ ] **Step 8: Commit Task 1**

Run:

```bash
git add apps/platform/app/routes/marketing/about/about.test.tsx \
  apps/platform/app/routes/marketing/about/about-content.ts \
  apps/platform/app/routes/marketing/about/section-eyebrow.tsx \
  apps/platform/app/routes/marketing/about/instagram-story-widget.tsx \
  apps/platform/app/routes/marketing/about/about.tsx
git commit -m "GEN-86 add marketing about section"
```

## Task 2: Instagram Story Widget Behavior

**Files:**
- Modify: `apps/platform/app/routes/marketing/about/instagram-story-widget.tsx`
- Create: `apps/platform/app/routes/marketing/about/instagram-story-widget.test.tsx`

- [ ] **Step 1: Write failing widget interaction tests**

Create `apps/platform/app/routes/marketing/about/instagram-story-widget.test.tsx`:

```tsx
// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ABOUT_STORY_DURATION_MS } from "./about-content";
import { InstagramStoryWidget } from "./instagram-story-widget";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function stubReducedMotion(matches: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockReturnValue({
      addEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
      matches,
      media: "(prefers-reduced-motion: reduce)",
      onchange: null,
      removeEventListener: vi.fn(),
    }),
  );
}

describe("InstagramStoryWidget", () => {
  it("advances and rewinds stories with pointer controls", async () => {
    const user = userEvent.setup();
    render(<InstagramStoryWidget />);

    expect(screen.getByText("Story 1 of 3")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Next story" }));
    expect(screen.getByText("Story 2 of 3")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Previous story" }));
    expect(screen.getByText("Story 1 of 3")).toBeInTheDocument();
  });

  it("loops after the last story", async () => {
    const user = userEvent.setup();
    render(<InstagramStoryWidget />);

    await user.click(screen.getByRole("button", { name: "Next story" }));
    await user.click(screen.getByRole("button", { name: "Next story" }));
    expect(screen.getByText("Story 3 of 3")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Next story" }));
    expect(screen.getByText("Story 1 of 3")).toBeInTheDocument();
  });

  it("supports arrow-key navigation when the widget has focus", async () => {
    const user = userEvent.setup();
    render(<InstagramStoryWidget />);

    const widget = screen.getByRole("region", { name: "Instagram stories from Eli" });
    widget.focus();

    await user.keyboard("{ArrowRight}");
    expect(screen.getByText("Story 2 of 3")).toBeInTheDocument();

    await user.keyboard("{ArrowLeft}");
    expect(screen.getByText("Story 1 of 3")).toBeInTheDocument();
  });

  it("keeps liked state per story", async () => {
    const user = userEvent.setup();
    render(<InstagramStoryWidget />);

    await user.click(screen.getByRole("button", { name: "Like story 1" }));
    expect(screen.getByRole("button", { name: "Unlike story 1" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Next story" }));
    expect(screen.getByRole("button", { name: "Like story 2" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Previous story" }));
    expect(screen.getByRole("button", { name: "Unlike story 1" })).toBeInTheDocument();
  });

  it("auto-advances on the story timer and loops to the first story", async () => {
    vi.useFakeTimers();
    render(<InstagramStoryWidget />);

    await act(async () => {
      vi.advanceTimersByTime(ABOUT_STORY_DURATION_MS);
    });
    expect(screen.getByText("Story 2 of 3")).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(ABOUT_STORY_DURATION_MS * 2);
    });
    expect(screen.getByText("Story 1 of 3")).toBeInTheDocument();
  });

  it("keeps timer navigation in reduced motion without animated progress fill", async () => {
    vi.useFakeTimers();
    stubReducedMotion(true);
    render(<InstagramStoryWidget />);

    expect(screen.getByTestId("story-progress-active")).toHaveStyle({ width: "100%" });

    await act(async () => {
      vi.advanceTimersByTime(ABOUT_STORY_DURATION_MS);
    });

    expect(screen.getByText("Story 2 of 3")).toBeInTheDocument();
    expect(screen.getByTestId("story-progress-active")).toHaveStyle({ width: "100%" });
  });

  it("shows a fallback when the active story media fails", () => {
    const { container } = render(<InstagramStoryWidget />);
    const video = container.querySelector("video");

    expect(video).toBeInTheDocument();
    fireEvent.error(video as HTMLVideoElement);

    expect(screen.getByText("Story media unavailable")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next story" })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run widget tests to verify they fail**

Run:

```bash
export NVM_DIR="$HOME/.nvm"
. "$NVM_DIR/nvm.sh"
nvm use 24.14.1
pnpm vitest run apps/platform/app/routes/marketing/about/instagram-story-widget.test.tsx
```

Expected: FAIL because the shell widget has no navigation, no timer, no per-story liked state, and no fallback handling.

- [ ] **Step 3: Replace the shell with the full widget implementation**

Replace `apps/platform/app/routes/marketing/about/instagram-story-widget.tsx` with:

```tsx
import { cn, usePrefersReducedMotion } from "@eli-coach-platform/ui";
import { Heart, MoreHorizontal } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type KeyboardEvent } from "react";

import {
  ABOUT_INSTAGRAM_HANDLE,
  ABOUT_INSTAGRAM_URL,
  ABOUT_STORIES,
} from "./about-content";

const PROGRESS_TICK_MS = 100;

export function InstagramStoryWidget() {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progressPercent, setProgressPercent] = useState(0);
  const [likedStoryIds, setLikedStoryIds] = useState<Set<string>>(() => new Set());
  const [failedStoryIds, setFailedStoryIds] = useState<Set<string>>(() => new Set());
  const activeStory = ABOUT_STORIES[currentIndex];
  const isLiked = likedStoryIds.has(activeStory.id);
  const hasMediaFailed = failedStoryIds.has(activeStory.id);

  const goToNextStory = useCallback(() => {
    setCurrentIndex((index) => (index + 1) % ABOUT_STORIES.length);
  }, []);

  const goToPreviousStory = useCallback(() => {
    setCurrentIndex((index) => (index === 0 ? ABOUT_STORIES.length - 1 : index - 1));
  }, []);

  useEffect(() => {
    setProgressPercent(prefersReducedMotion ? 100 : 0);

    const timeoutId = window.setTimeout(goToNextStory, activeStory.durationMs);
    let intervalId: number | undefined;

    if (!prefersReducedMotion) {
      intervalId = window.setInterval(() => {
        setProgressPercent((currentProgress) =>
          Math.min(
            100,
            currentProgress + (PROGRESS_TICK_MS / activeStory.durationMs) * 100,
          ),
        );
      }, PROGRESS_TICK_MS);
    }

    return () => {
      window.clearTimeout(timeoutId);
      if (intervalId) {
        window.clearInterval(intervalId);
      }
    };
  }, [activeStory.durationMs, currentIndex, goToNextStory, prefersReducedMotion]);

  const progressValues = useMemo(
    () =>
      ABOUT_STORIES.map((story, index) => {
        if (index < currentIndex) {
          return { id: story.id, value: 100 };
        }

        if (index === currentIndex) {
          return { id: story.id, value: progressPercent };
        }

        return { id: story.id, value: 0 };
      }),
    [currentIndex, progressPercent],
  );

  const toggleLike = () => {
    setLikedStoryIds((currentLikedStoryIds) => {
      const nextLikedStoryIds = new Set(currentLikedStoryIds);

      if (nextLikedStoryIds.has(activeStory.id)) {
        nextLikedStoryIds.delete(activeStory.id);
      } else {
        nextLikedStoryIds.add(activeStory.id);
      }

      return nextLikedStoryIds;
    });
  };

  const markMediaFailed = () => {
    setFailedStoryIds((currentFailedStoryIds) => {
      const nextFailedStoryIds = new Set(currentFailedStoryIds);
      nextFailedStoryIds.add(activeStory.id);
      return nextFailedStoryIds;
    });
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      goToPreviousStory();
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      goToNextStory();
    }
  };

  return (
    <section
      aria-label="Instagram stories from Eli"
      className="relative mx-auto aspect-[9/16] w-full max-w-[18rem] overflow-hidden rounded-[1.5rem] border border-border-subtle bg-surface-inverted text-text-inverted shadow-soft outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-primary lg:max-w-[21rem]"
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {hasMediaFailed ? (
        <div className="absolute inset-0 flex items-center justify-center bg-surface-inverted px-8 text-center text-body-sm text-text-inverted/80">
          Story media unavailable
        </div>
      ) : (
        <video
          key={activeStory.id}
          aria-label={activeStory.label}
          autoPlay={!prefersReducedMotion}
          className="absolute inset-0 size-full object-cover opacity-80"
          loop
          muted
          onError={markMediaFailed}
          playsInline
          poster={activeStory.poster}
          preload="metadata"
        >
          {activeStory.sources.map((source) => (
            <source key={source.type} src={source.src} type={source.type} />
          ))}
        </video>
      )}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-b from-overlay-strong via-surface-inverted/10 to-overlay-strong"
      />
      <button
        aria-label="Previous story"
        className="absolute bottom-20 left-0 top-20 z-10 w-1/2 cursor-pointer outline-none focus-visible:outline-2 focus-visible:outline-offset-[-0.5rem] focus-visible:outline-text-inverted"
        onClick={goToPreviousStory}
        type="button"
      />
      <button
        aria-label="Next story"
        className="absolute bottom-20 right-0 top-20 z-10 w-1/2 cursor-pointer outline-none focus-visible:outline-2 focus-visible:outline-offset-[-0.5rem] focus-visible:outline-text-inverted"
        onClick={goToNextStory}
        type="button"
      />
      <div aria-hidden="true" className="absolute left-4 right-4 top-5 z-20 flex gap-1">
        {progressValues.map((progressValue, index) => (
          <span
            key={progressValue.id}
            className="h-1 flex-1 overflow-hidden rounded-pill bg-text-inverted/30"
          >
            <span
              className="block h-full rounded-pill bg-text-inverted transition-[width] duration-100 ease-linear motion-reduce:transition-none"
              data-testid={index === currentIndex ? "story-progress-active" : undefined}
              style={{ width: `${progressValue.value}%` }}
            />
          </span>
        ))}
      </div>
      <div className="absolute left-4 right-4 top-10 z-30 flex items-center justify-between gap-3">
        <a
          className="inline-flex min-h-11 items-center rounded-pill text-body-sm font-medium text-text-inverted outline-none transition-colors duration-150 ease-out hover:text-brand-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-inverted"
          href={ABOUT_INSTAGRAM_URL}
          rel="noopener noreferrer"
          target="_blank"
        >
          {ABOUT_INSTAGRAM_HANDLE} on Instagram
        </a>
        <MoreHorizontal aria-hidden="true" className="size-5 text-text-inverted/80" />
      </div>
      <div className="absolute bottom-4 left-4 right-4 z-30 flex items-center gap-3">
        <div className="flex min-h-11 flex-1 items-center rounded-pill border border-text-inverted/35 px-4 text-body-sm text-text-inverted/80 backdrop-blur-sm">
          Send message...
        </div>
        <button
          aria-label={isLiked ? `Unlike story ${currentIndex + 1}` : `Like story ${currentIndex + 1}`}
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full text-text-inverted outline-none transition-colors duration-150 ease-out hover:text-brand-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-inverted"
          onClick={toggleLike}
          type="button"
        >
          <Heart
            aria-hidden="true"
            className={cn("size-5", {
              "fill-brand-primary text-brand-primary": isLiked,
            })}
          />
        </button>
      </div>
      <p className="sr-only" aria-live="polite">
        Story {currentIndex + 1} of {ABOUT_STORIES.length}
      </p>
    </section>
  );
}
```

- [ ] **Step 4: Run widget and static About tests**

Run:

```bash
export NVM_DIR="$HOME/.nvm"
. "$NVM_DIR/nvm.sh"
nvm use 24.14.1
pnpm vitest run \
  apps/platform/app/routes/marketing/about/about.test.tsx \
  apps/platform/app/routes/marketing/about/instagram-story-widget.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit Task 2**

Run:

```bash
git add apps/platform/app/routes/marketing/about/instagram-story-widget.tsx \
  apps/platform/app/routes/marketing/about/instagram-story-widget.test.tsx
git commit -m "GEN-86 add Instagram story widget behavior"
```

## Task 3: Homepage Composition And Hydration Coverage

**Files:**
- Modify: `apps/platform/app/routes/marketing/home.tsx`
- Modify: `apps/platform/app/routes/marketing/layout/layout.ui-integration.test.tsx`

- [ ] **Step 1: Extend marketing layout integration tests**

Modify `apps/platform/app/routes/marketing/layout/layout.ui-integration.test.tsx`:

```tsx
// In the existing "hydrates the static shell with the live waitlist snapshot" test,
// after the first waitFor assertion, add:
expect(
  screen.getByRole("heading", { level: 2, name: "Meet Eli, your coach" }),
).toBeInTheDocument();
expect(screen.queryByRole("link", { name: "Start my plan" })).not.toBeInTheDocument();
expect(screen.queryByRole("link", { name: "See pricing" })).not.toBeInTheDocument();

// In the existing "switches the static shell to normal mode when the live snapshot disables waitlist mode" test,
// after the h1 assertion, add:
expect(screen.getByRole("link", { name: "Start my plan" })).toHaveAttribute(
  "href",
  "/book",
);
expect(screen.getByRole("link", { name: "See pricing" })).toHaveAttribute(
  "href",
  "/pricing",
);
```

The final two tests should read like this:

```tsx
  it("hydrates the static shell with the live waitlist snapshot", async () => {
    server.use(
      http.get("/api/waitlist", () =>
        HttpResponse.json({
          enabled: true,
          cap: 10,
          spotsRemaining: 4,
        }),
      ),
    );

    renderMarketingHomeShell();

    expect(screen.queryByText("4 of 10 spots remaining")).not.toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("4 of 10 spots remaining")).toBeInTheDocument();
    });
    expect(
      screen.getByRole("heading", { level: 2, name: "Meet Eli, your coach" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Start my plan" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "See pricing" })).not.toBeInTheDocument();
  });

  it("switches the static shell to normal mode when the live snapshot disables waitlist mode", async () => {
    server.use(
      http.get("/api/waitlist", () =>
        HttpResponse.json({
          enabled: false,
          cap: 10,
          spotsRemaining: 0,
        }),
      ),
    );

    renderMarketingHomeShell();

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { level: 1, name: "Strength training for women." }),
      ).toBeInTheDocument();
    });
    expect(screen.queryByLabelText("Email address")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Start my plan" })).toHaveAttribute(
      "href",
      "/book",
    );
    expect(screen.getByRole("link", { name: "See pricing" })).toHaveAttribute(
      "href",
      "/pricing",
    );
  });
```

- [ ] **Step 2: Run layout integration test to verify it fails**

Run:

```bash
export NVM_DIR="$HOME/.nvm"
. "$NVM_DIR/nvm.sh"
nvm use 24.14.1
pnpm vitest run apps/platform/app/routes/marketing/layout/layout.ui-integration.test.tsx
```

Expected: FAIL because `HomeRoute` does not render `MarketingAbout` yet.

- [ ] **Step 3: Compose About into the homepage**

Modify `apps/platform/app/routes/marketing/home.tsx`:

```tsx
import type { MetaFunction } from "react-router";
import { useOutletContext } from "react-router";

import { MarketingAbout } from "./about/about";
import { MarketingHero } from "./hero/hero";
import type { MarketingOutletContext } from "./layout/layout";

export const meta: MetaFunction = () => [
  { title: "Strength Coaching for Women, Online or In Person — with Eli" },
  {
    name: "description",
    content:
      "Strength and nutrition coaching for women, online or in person. Plans that take your cycle into account, with weekly check-ins and clear form videos.",
  },
];

export default function HomeRoute() {
  const { botDetectionConfig, waitlist } = useOutletContext<MarketingOutletContext>();

  return (
    <>
      <MarketingHero botDetectionConfig={botDetectionConfig} waitlist={waitlist} />
      <MarketingAbout waitlistMode={waitlist.enabled} />
    </>
  );
}
```

- [ ] **Step 4: Run targeted marketing tests**

Run:

```bash
export NVM_DIR="$HOME/.nvm"
. "$NVM_DIR/nvm.sh"
nvm use 24.14.1
pnpm vitest run \
  apps/platform/app/routes/marketing/about/about.test.tsx \
  apps/platform/app/routes/marketing/about/instagram-story-widget.test.tsx \
  apps/platform/app/routes/marketing/layout/layout.ui-integration.test.tsx \
  apps/platform/app/routes/marketing/hero/hero.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit Task 3**

Run:

```bash
git add apps/platform/app/routes/marketing/home.tsx \
  apps/platform/app/routes/marketing/layout/layout.ui-integration.test.tsx
git commit -m "GEN-86 render about section on homepage"
```

## Task 4: Full Verification And Browser Check

**Files:**
- No planned source edits. If verification finds an issue, fix the smallest relevant file and add/update tests next to that file.

- [ ] **Step 1: Run full automated verification**

Run:

```bash
export NVM_DIR="$HOME/.nvm"
. "$NVM_DIR/nvm.sh"
nvm use 24.14.1
pnpm lint
pnpm typecheck
pnpm test
pnpm test:a11y
pnpm test:lighthouse
```

Expected: all commands pass. If `pnpm test:lighthouse` requires a dev server or fails for environment reasons, capture the exact failure and run the closest available Lighthouse/manual browser verification before reporting.

- [ ] **Step 2: Start the production app dev server**

Run:

```bash
export NVM_DIR="$HOME/.nvm"
. "$NVM_DIR/nvm.sh"
nvm use 24.14.1
LOCAL_POSTGRES_PORT=55437 pnpm dev:platform
```

Expected: React Router dev server starts and serves the platform app. Keep this process running for browser verification.

- [ ] **Step 3: Browser-check the About section in waitlist mode**

Open the local app in the browser at the dev-server URL.

Check:

- Page has exactly one visible H1 in the Hero.
- About section appears immediately after Hero.
- About heading is `Meet Eli, your coach`.
- Approved chips render exactly.
- `Start my plan` and `See pricing` are hidden while waitlist mode is enabled.
- Instagram widget is visible and sized correctly on desktop, tablet, and mobile widths.
- Instagram handle opens `https://www.instagram.com/elilungu_` in a new tab.
- Like button can receive focus and toggles visual state.
- ArrowLeft and ArrowRight change stories.
- Pointer next/previous zones change stories.

- [ ] **Step 4: Browser-check normal mode**

Use a runtime waitlist snapshot with `enabled: false` or the existing local mechanism for `WAITLIST_MODE=false`.

Check:

- About closing line says `Ready to start? Let's build a plan you can actually stick to.`
- `Start my plan` is visible and points to `/book`.
- `See pricing` is visible and points to `/pricing`.
- No layout overflow or text overlap at mobile, tablet, or desktop widths.

- [ ] **Step 5: Commit verification fixes if needed**

If verification required source/test fixes, commit them:

```bash
git add <changed-files>
git commit -m "GEN-86 polish about section verification"
```

If no fixes were needed, do not create an empty commit.
