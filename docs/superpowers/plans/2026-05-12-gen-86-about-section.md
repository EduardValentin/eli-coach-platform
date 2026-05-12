# GEN-86 About Section Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the prototype-matched landing-page About section with a reusable phone frame and route-local Instagram story widget.

**Architecture:** Add a generic `PhoneFrame` primitive to `packages/ui`, then compose a route-local `MarketingAbout` feature under `apps/platform/app/routes/marketing/about/`. The homepage renders `MarketingHero` followed by `MarketingAbout`, and the About feature consumes the existing `MarketingOutletContext.waitlist` snapshot for normal/waitlist branching.

**Tech Stack:** React Router, React state/effects, Vitest, Testing Library, `@eli-coach-platform/ui`, lucide-react, Tailwind v4 semantic tokens, first-party hero media assets.

---

## File Structure

- Create `packages/ui/src/components/phone-frame.tsx`: reusable phone chrome only.
- Create `packages/ui/src/components/phone-frame.test.tsx`: primitive contract tests.
- Modify `packages/ui/src/index.tsx`: export `PhoneFrame`.
- Modify `packages/ui/src/styles.css`: add phone-frame role tokens and classes.
- Modify `DESIGN.md` and `designs/react-reference-app/DESIGN.md`: document the reusable phone-frame role.
- Create `apps/platform/app/routes/marketing/about/about-content.ts`: static copy, chip labels, story data, and hero-media URLs.
- Create `apps/platform/app/routes/marketing/about/about.tsx`: section layout, portrait, bio, chips, and waitlist-gated CTAs.
- Create `apps/platform/app/routes/marketing/about/instagram-story-widget.tsx`: story widget behavior and UI.
- Create `apps/platform/app/routes/marketing/about/about.test.tsx`: About section rendering and CTA tests.
- Create `apps/platform/app/routes/marketing/about/instagram-story-widget.test.tsx`: story behavior tests.
- Modify `apps/platform/app/routes/marketing/home.tsx`: render `MarketingAbout` after `MarketingHero`.
- Modify `apps/platform/app/routes/marketing/layout/layout.ui-integration.test.tsx`: homepage integration coverage.

---

### Task 1: Shared PhoneFrame Primitive

**Files:**
- Create: `packages/ui/src/components/phone-frame.tsx`
- Create: `packages/ui/src/components/phone-frame.test.tsx`
- Modify: `packages/ui/src/index.tsx:1-31`
- Modify: `packages/ui/src/styles.css:48-72`, `136-200`, `321-380`, `456-465`
- Modify: `DESIGN.md:22-29`
- Modify: `designs/react-reference-app/DESIGN.md:22-29`

**Element mapping:**
- Prototype: Scoping row `designs/react-reference-app/src/app/components/InstagramWidget.tsx:60-144` (`PhoneFrame`)
- Planned production: `packages/ui/src/components/phone-frame.tsx:22` (new `<div className="ui-phone-frame ...">`)
- Prototype: Scoping row `designs/react-reference-app/src/app/components/PhoneFrame.tsx:25-28` (`div`, notch)
- Planned production: `packages/ui/src/components/phone-frame.tsx:35` (new decorative notch `<div>`)
- Prototype: Scoping row `designs/react-reference-app/src/app/components/PhoneFrame.tsx:30-40` (`div`, status bar)
- Planned production: `packages/ui/src/components/phone-frame.tsx:38` (new status bar `<div>`)

- [ ] **Step 1: Write the failing primitive tests**

Create `packages/ui/src/components/phone-frame.test.tsx`:

```tsx
// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PhoneFrame } from "./phone-frame";

describe("PhoneFrame", () => {
  it("renders reusable phone chrome around children", () => {
    render(
      <PhoneFrame aria-label="Story preview">
        <p>Inside the phone</p>
      </PhoneFrame>,
    );

    expect(screen.getByLabelText("Story preview")).toHaveClass("ui-phone-frame");
    expect(screen.getByText("Inside the phone")).toBeInTheDocument();
  });

  it("renders decorative status chrome hidden from assistive tech", () => {
    const { container } = render(
      <PhoneFrame statusBarVariant="light" time="10:08">
        <p>Screen</p>
      </PhoneFrame>,
    );

    expect(container.querySelector(".ui-phone-frame__notch")).toHaveAttribute("aria-hidden", "true");
    expect(container.querySelector(".ui-phone-frame__status-bar")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
    expect(screen.getByText("10:08")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the failing primitive test**

Run:

```bash
zsh -lc 'source ~/.nvm/nvm.sh && nvm use 24.14.1 >/dev/null && pnpm vitest run packages/ui/src/components/phone-frame.test.tsx'
```

Expected: FAIL because `./phone-frame` does not exist.

- [ ] **Step 3: Add phone-frame design tokens and component classes**

Modify `packages/ui/src/styles.css`:

```css
:root {
  --radius-phone-frame: 2.5rem;
  --shadow-phone-frame: 0 24px 70px rgba(0, 0, 0, 0.24);
}

@theme inline {
  --radius-phone-frame: var(--radius-phone-frame);
  --shadow-phone-frame: var(--shadow-phone-frame);
}

@layer components {
  .ui-phone-frame {
    border-radius: var(--radius-phone-frame);
    border: 4px solid color-mix(in srgb, var(--color-text-primary) 10%, transparent);
    background: var(--color-surface-base);
    box-shadow: var(--shadow-phone-frame);
    overflow: hidden;
    position: relative;
  }

  .ui-phone-frame__notch {
    background: var(--color-text-primary);
    border-radius: var(--radius-pill);
    height: 1.25rem;
    left: 50%;
    position: absolute;
    top: 0.5rem;
    transform: translateX(-50%);
    width: 6rem;
    z-index: 30;
  }

  .ui-phone-frame__status-bar {
    align-items: center;
    display: flex;
    font-size: 0.625rem;
    font-variant-numeric: tabular-nums;
    font-weight: var(--font-weight-semibold);
    height: 2.5rem;
    justify-content: space-between;
    left: 0;
    padding: 0.625rem 1.5rem 0;
    pointer-events: none;
    position: absolute;
    right: 0;
    top: 0;
    z-index: 20;
  }

  .ui-phone-frame__status-bar-light {
    color: var(--color-text-inverted);
  }

  .ui-phone-frame__status-bar-dark {
    color: var(--color-text-primary);
  }

  .ui-phone-frame__status-dots {
    align-items: center;
    display: inline-flex;
    gap: 0.25rem;
  }

  .ui-phone-frame__status-dot {
    background: currentColor;
    border-radius: var(--radius-pill);
    display: block;
    height: 0.25rem;
    width: 0.25rem;
  }
}
```

Add the token note to `DESIGN.md` and `designs/react-reference-app/DESIGN.md` under `## Typography & Components`:

```markdown
- **Phone frame:** Reusable phone mockups use the shared `PhoneFrame` primitive. The primitive owns only device chrome and uses `radius-phone-frame` plus `shadow-phone-frame`; feature-specific screen content stays in the consuming route or component.
```

- [ ] **Step 4: Implement the reusable primitive**

Create `packages/ui/src/components/phone-frame.tsx`:

```tsx
import * as React from "react";

import { cn } from "../lib/cn";

export type PhoneFrameProps = React.ComponentPropsWithoutRef<"div"> & {
  statusBarVariant?: "dark" | "light";
  time?: string;
};

export const PhoneFrame = React.forwardRef<HTMLDivElement, PhoneFrameProps>(
  ({ children, className, statusBarVariant = "dark", time = "9:41", ...props }, ref) => {
    const statusVariantClassName =
      statusBarVariant === "light"
        ? "ui-phone-frame__status-bar-light"
        : "ui-phone-frame__status-bar-dark";

    return (
      <div ref={ref} className={cn("ui-phone-frame", className)} {...props}>
        {children}
        <div aria-hidden="true" className="ui-phone-frame__notch" />
        <div
          aria-hidden="true"
          className={cn("ui-phone-frame__status-bar", statusVariantClassName)}
        >
          <span>{time}</span>
          <span className="ui-phone-frame__status-dots">
            <span className="ui-phone-frame__status-dot" />
            <span className="ui-phone-frame__status-dot" />
            <span className="ui-phone-frame__status-dot" />
          </span>
        </div>
      </div>
    );
  },
);

PhoneFrame.displayName = "PhoneFrame";
```

- [ ] **Step 5: Export the primitive**

Modify `packages/ui/src/index.tsx`:

```tsx
export { PhoneFrame, type PhoneFrameProps } from "./components/phone-frame";
```

- [ ] **Step 6: Run the primitive test and commit**

Run:

```bash
zsh -lc 'source ~/.nvm/nvm.sh && nvm use 24.14.1 >/dev/null && pnpm vitest run packages/ui/src/components/phone-frame.test.tsx'
```

Expected: PASS.

Commit:

```bash
git add packages/ui/src/components/phone-frame.tsx packages/ui/src/components/phone-frame.test.tsx packages/ui/src/index.tsx packages/ui/src/styles.css DESIGN.md designs/react-reference-app/DESIGN.md
git commit -m "GEN-86 add reusable phone frame primitive"
```

---

### Task 2: About Section Content And Layout

**Files:**
- Create: `apps/platform/app/routes/marketing/about/about-content.ts`
- Create: `apps/platform/app/routes/marketing/about/about.tsx`
- Create: `apps/platform/app/routes/marketing/about/about.test.tsx`

**Element mapping:**
- Prototype: Scoping row `designs/react-reference-app/src/app/components/About.tsx:12-82` (`section`, `id="about"`)
- Planned production: `apps/platform/app/routes/marketing/about/about.tsx:28` (new `<section id="about">`)
- Prototype: Scoping row `designs/react-reference-app/src/app/components/About.tsx:14-70` (content column)
- Planned production: `apps/platform/app/routes/marketing/about/about.tsx:29` (new content `<div>`)
- Prototype: Scoping row `designs/react-reference-app/src/app/components/About.tsx:15-30` (portrait frame)
- Planned production: `apps/platform/app/routes/marketing/about/about.tsx:33` (new `<figure>`)
- Prototype: Scoping row `designs/react-reference-app/src/app/components/About.tsx:23` (decorative glow)
- Planned production: `apps/platform/app/routes/marketing/about/about.tsx:34` (new glow `<div>`)
- Prototype: Scoping row `designs/react-reference-app/src/app/components/About.tsx:24` (inner circle)
- Planned production: `apps/platform/app/routes/marketing/about/about.tsx:35` (new inner circle `<div>`)
- Prototype: Scoping row `designs/react-reference-app/src/app/components/About.tsx:25-29` (portrait image)
- Planned production: `apps/platform/app/routes/marketing/about/about.tsx:36` (new portrait `<img>`)
- Prototype: Scoping row `designs/react-reference-app/src/app/components/About.tsx:38` (`SectionEyebrow`)
- Planned production: `apps/platform/app/routes/marketing/about/about.tsx:47` (new eyebrow `<p>`)
- Prototype: Scoping row `designs/react-reference-app/src/app/components/About.tsx:39-41` (`h2`)
- Planned production: `apps/platform/app/routes/marketing/about/about.tsx:50` (new `<h2>`)
- Prototype: Scoping row `designs/react-reference-app/src/app/components/About.tsx:43-45` (bio paragraph)
- Planned production: `apps/platform/app/routes/marketing/about/about.tsx:55` (new bio `<p>`)
- Prototype: Scoping row `designs/react-reference-app/src/app/components/About.tsx:46-50` (mode-specific closing line)
- Planned production: `apps/platform/app/routes/marketing/about/about.tsx:58` (new closing-line `<p>`)
- Prototype: Scoping row `designs/react-reference-app/src/app/components/About.tsx:53-57` (chip row)
- Planned production: `apps/platform/app/routes/marketing/about/about.tsx:63` (new chip row `<ul>`)
- Prototype: Scoping rows `designs/react-reference-app/src/app/components/About.tsx:54`, `:55`, `:56` (three chips)
- Planned production: `apps/platform/app/routes/marketing/about/about.tsx:65` (new chip `<li>`)
- Prototype: Scoping row `designs/react-reference-app/src/app/components/About.tsx:59-68` (CTA row)
- Planned production: `apps/platform/app/routes/marketing/about/about.tsx:74` (new CTA row `<div>`)
- Prototype: Scoping row `designs/react-reference-app/src/app/components/About.tsx:62` (`Start my plan`)
- Planned production: `apps/platform/app/routes/marketing/about/about.tsx:75` (new `/book` `<Link>`)
- Prototype: Scoping row `designs/react-reference-app/src/app/components/About.tsx:64-66` (`See pricing`)
- Planned production: `apps/platform/app/routes/marketing/about/about.tsx:81` (new `/pricing` `<Link>`)
- Prototype: Scoping row `designs/react-reference-app/src/app/components/About.tsx:73-81` (widget column)
- Planned production: `apps/platform/app/routes/marketing/about/about.tsx:88` (new widget column `<div>`)
- Prototype: Scoping row `designs/react-reference-app/src/app/components/About.tsx:80` (`InstagramWidget`)
- Planned production: `apps/platform/app/routes/marketing/about/about.tsx:91` (new `<InstagramStoryWidget />`)

- [ ] **Step 1: Write the failing About rendering tests**

Create `apps/platform/app/routes/marketing/about/about.test.tsx`:

```tsx
// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router";

import { MarketingAbout } from "./about";

function renderAbout(waitlistEnabled: boolean) {
  const router = createMemoryRouter(
    [
      {
        element: (
          <MarketingAbout
            waitlist={{ cap: 10, enabled: waitlistEnabled, spotsRemaining: 10 }}
          />
        ),
        path: "/",
      },
    ],
    { initialEntries: ["/"] },
  );

  return render(<RouterProvider router={router} />);
}

describe("MarketingAbout", () => {
  it("renders the prototype copy, portrait, chips, and story widget", () => {
    renderAbout(true);

    expect(screen.getByRole("heading", { level: 2, name: "Meet Eli, your coach" })).toBeInTheDocument();
    expect(screen.getByText("Strength & nutrition for women")).toBeInTheDocument();
    expect(screen.getByAltText("Eli, personal trainer and nutritionist for women, smiling outdoors")).toHaveAttribute(
      "src",
      "/media/hero/hero-training-poster.jpg",
    );
    expect(screen.getByText("IFBB Certified Trainer")).toBeInTheDocument();
    expect(screen.getByText("Certified Nutritionist")).toBeInTheDocument();
    expect(screen.getByText("Women Focused")).toBeInTheDocument();
    expect(screen.getByLabelText("Instagram stories - tap left or right to navigate")).toBeInTheDocument();
  });

  it("renders waitlist closing copy and hides normal-mode CTAs", () => {
    renderAbout(true);

    expect(screen.getByText("Doors open soon. Get on the list so yours is held.")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Start my plan" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "See pricing" })).not.toBeInTheDocument();
  });

  it("renders normal-mode CTAs with internal routes", () => {
    renderAbout(false);

    expect(
      screen.getByText("Ready to start? Let's build a plan you can actually stick to."),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Start my plan" })).toHaveAttribute("href", "/book");
    expect(screen.getByRole("link", { name: "See pricing" })).toHaveAttribute("href", "/pricing");
  });

  it("does not introduce a second h1", () => {
    renderAbout(false);

    expect(screen.queryAllByRole("heading", { level: 1 })).toHaveLength(0);
    expect(screen.getByRole("heading", { level: 2, name: "Meet Eli, your coach" })).toBeInTheDocument();
  });

  it("keeps chip labels grouped as a list", () => {
    renderAbout(true);

    const list = screen.getByRole("list", { name: "Eli's credentials and coaching focus" });

    expect(within(list).getAllByRole("listitem")).toHaveLength(3);
  });
});
```

- [ ] **Step 2: Run the failing About test**

Run:

```bash
zsh -lc 'source ~/.nvm/nvm.sh && nvm use 24.14.1 >/dev/null && pnpm vitest run apps/platform/app/routes/marketing/about/about.test.tsx'
```

Expected: FAIL because `./about` does not exist.

- [ ] **Step 3: Add static About content**

Create `apps/platform/app/routes/marketing/about/about-content.ts`:

```ts
import { joinBasePath } from "@eli-coach-platform/config";

export const ABOUT_COPY = {
  bio:
    "I'm a personal trainer and nutritionist, and I work with women - online and in person. What I care about most is helping you actually understand your body, not just follow a plan. I build strength training programs around your cycle, your energy, and what your week actually looks like.",
  eyebrow: "Strength & nutrition for women",
  heading: "Meet Eli, your coach",
  normalClosing: "Ready to start? Let's build a plan you can actually stick to.",
  waitlistClosing: "Doors open soon. Get on the list so yours is held.",
} as const;

export const ABOUT_CHIPS = [
  "IFBB Certified Trainer",
  "Certified Nutritionist",
  "Women Focused",
] as const;

export const ABOUT_MEDIA = {
  heroPoster: joinBasePath(import.meta.env.BASE_URL, "media/hero/hero-training-poster.jpg"),
  heroVideoMp4: joinBasePath(import.meta.env.BASE_URL, "media/hero/hero-training-loop.mp4"),
  heroVideoWebm: joinBasePath(import.meta.env.BASE_URL, "media/hero/hero-training-loop.webm"),
} as const;

export const INSTAGRAM_PROFILE_URL = "https://www.instagram.com/elilungu_";

export const ABOUT_STORIES = [
  {
    alt: "Story 1 of 3",
    imageSrc: ABOUT_MEDIA.heroPoster,
    objectPosition: "center",
  },
  {
    alt: "Story 2 of 3",
    imageSrc: ABOUT_MEDIA.heroPoster,
    objectPosition: "35% center",
  },
  {
    alt: "Story 3 of 3",
    imageSrc: ABOUT_MEDIA.heroPoster,
    objectPosition: "65% center",
  },
] as const;
```

- [ ] **Step 4: Implement the About layout**

Create `apps/platform/app/routes/marketing/about/about.tsx`:

```tsx
import type { WaitlistSnapshot } from "@eli-coach-platform/contracts";
import { buttonVariants, cn } from "@eli-coach-platform/ui";
import { Check } from "lucide-react";
import { Link } from "react-router";

import { ABOUT_CHIPS, ABOUT_COPY, ABOUT_MEDIA } from "./about-content";
import { InstagramStoryWidget } from "./instagram-story-widget";

type MarketingAboutProps = {
  waitlist: WaitlistSnapshot;
};

export function MarketingAbout(props: MarketingAboutProps) {
  const closingLine = props.waitlist.enabled ? ABOUT_COPY.waitlistClosing : ABOUT_COPY.normalClosing;

  return (
    <section
      className="mx-auto flex w-full max-w-stage flex-col items-center gap-16 bg-surface-page px-6 py-24 text-center lg:flex-row lg:gap-24 lg:text-left"
      id="about"
    >
      <div className="flex flex-1 flex-col items-center lg:items-start">
        <figure className="ui-public-hero-entrance ui-public-hero-entrance-pop group relative mb-8 size-48 rounded-pill p-2 md:size-56">
          <div aria-hidden="true" className="absolute inset-0 rounded-pill bg-gradient-to-tr from-brand-primary to-brand-secondary opacity-70 blur-md transition-opacity duration-150 group-hover:opacity-100" />
          <div aria-hidden="true" className="absolute inset-[3px] z-10 rounded-pill bg-surface-base" />
          <img
            alt="Eli, personal trainer and nutritionist for women, smiling outdoors"
            className="relative z-20 size-full rounded-pill object-cover"
            src={ABOUT_MEDIA.heroPoster}
          />
        </figure>

        <div className="ui-public-hero-entrance w-full max-w-xl">
          <p className="mb-4 text-label font-semibold uppercase tracking-[0.2em] text-brand-primary">
            {ABOUT_COPY.eyebrow}
          </p>
          <h2 className="mb-6 font-heading text-4xl font-medium leading-heading text-text-primary md:text-5xl">
            {ABOUT_COPY.heading}
          </h2>
          <div className="space-y-4 text-body-lg leading-[1.65] text-text-secondary">
            <p>{ABOUT_COPY.bio}</p>
            <p className="pt-2 font-medium text-text-primary">{closingLine}</p>
          </div>

          <ul
            aria-label="Eli's credentials and coaching focus"
            className="mt-8 flex flex-wrap items-center justify-center gap-4 text-body-sm font-medium text-text-secondary lg:justify-start"
          >
            {ABOUT_CHIPS.map((chip) => (
              <li key={chip} className="flex items-center gap-1.5">
                <Check aria-hidden="true" className="size-4 text-brand-primary" strokeWidth={2.5} />
                <span>{chip}</span>
              </li>
            ))}
          </ul>

          {props.waitlist.enabled ? null : (
            <div className="mt-10 flex flex-wrap items-center justify-center gap-6 lg:justify-start">
              <Link className={cn(buttonVariants({ size: "lg" }), "px-8")} to="/book">
                Start my plan
              </Link>
              <Link
                className="text-body-sm font-semibold text-text-muted underline underline-offset-4 transition-colors duration-150 hover:text-brand-primary"
                to="/pricing"
              >
                See pricing
              </Link>
            </div>
          )}
        </div>
      </div>

      <div className="ui-public-hero-entrance flex w-full flex-1 justify-center lg:justify-end">
        <InstagramStoryWidget />
      </div>
    </section>
  );
}
```

- [ ] **Step 5: Confirm Task 2 stops at the known missing widget boundary**

Run:

```bash
zsh -lc 'source ~/.nvm/nvm.sh && nvm use 24.14.1 >/dev/null && pnpm vitest run apps/platform/app/routes/marketing/about/about.test.tsx'
```

Expected: FAIL with a missing `./instagram-story-widget` import. Leave Task 2 uncommitted. Task 3 creates that module, reruns both About tests, and commits the complete route-local feature directory.

Commit after Task 3 when both About and widget tests pass:

```bash
git add apps/platform/app/routes/marketing/about/about-content.ts apps/platform/app/routes/marketing/about/about.tsx apps/platform/app/routes/marketing/about/about.test.tsx
git commit -m "GEN-86 add marketing about section"
```

---

### Task 3: Instagram Story Widget Behavior

**Files:**
- Create: `apps/platform/app/routes/marketing/about/instagram-story-widget.tsx`
- Create: `apps/platform/app/routes/marketing/about/instagram-story-widget.test.tsx`

**Element mapping:**
- Prototype: Scoping row `designs/react-reference-app/src/app/components/InstagramWidget.tsx:60-144` (`PhoneFrame`)
- Planned production: `apps/platform/app/routes/marketing/about/instagram-story-widget.tsx:83` (new `<PhoneFrame>`)
- Prototype: Scoping row `designs/react-reference-app/src/app/components/InstagramWidget.tsx:64-91` (story navigation surface)
- Planned production: `apps/platform/app/routes/marketing/about/instagram-story-widget.tsx:87` (new focusable story surface `<div role="button">`)
- Prototype: Scoping row `designs/react-reference-app/src/app/components/InstagramWidget.tsx:76-85` (active story media)
- Planned production: `apps/platform/app/routes/marketing/about/instagram-story-widget.tsx:100` (new active story `<img>`)
- Prototype: Scoping row `designs/react-reference-app/src/app/components/InstagramWidget.tsx:87-90` (gradient overlay)
- Planned production: `apps/platform/app/routes/marketing/about/instagram-story-widget.tsx:107` (new overlay `<div>`)
- Prototype: Scoping row `designs/react-reference-app/src/app/components/InstagramWidget.tsx:93-104` (progress group)
- Planned production: `apps/platform/app/routes/marketing/about/instagram-story-widget.tsx:111` (new progress group `<div>`)
- Prototype: Scoping rows `designs/react-reference-app/src/app/components/InstagramWidget.tsx:95`, `:96-101` (progress track/fill)
- Planned production: `apps/platform/app/routes/marketing/about/instagram-story-widget.tsx:113` (new progress track/fill `<div>`)
- Prototype: Scoping row `designs/react-reference-app/src/app/components/InstagramWidget.tsx:106-119` (story header)
- Planned production: `apps/platform/app/routes/marketing/about/instagram-story-widget.tsx:127` (new header `<div>`)
- Prototype: Scoping row `designs/react-reference-app/src/app/components/InstagramWidget.tsx:108-114` (avatar frame/image)
- Planned production: `apps/platform/app/routes/marketing/about/instagram-story-widget.tsx:130` (new avatar `<div>` and `<img>`)
- Prototype: Scoping row `designs/react-reference-app/src/app/components/InstagramWidget.tsx:115` (handle)
- Planned production: `apps/platform/app/routes/marketing/about/instagram-story-widget.tsx:138` (new external handle `<a>`)
- Prototype: Scoping row `designs/react-reference-app/src/app/components/InstagramWidget.tsx:116` (time)
- Planned production: `apps/platform/app/routes/marketing/about/instagram-story-widget.tsx:146` (new time `<span>`)
- Prototype: Scoping row `designs/react-reference-app/src/app/components/InstagramWidget.tsx:118` (`MoreHorizontal`)
- Planned production: `apps/platform/app/routes/marketing/about/instagram-story-widget.tsx:148` (new menu icon)
- Prototype: Scoping row `designs/react-reference-app/src/app/components/InstagramWidget.tsx:121-143` (bottom controls)
- Planned production: `apps/platform/app/routes/marketing/about/instagram-story-widget.tsx:152` (new bottom controls `<div>`)
- Prototype: Scoping row `designs/react-reference-app/src/app/components/InstagramWidget.tsx:122-124` (`Send message...`)
- Planned production: `apps/platform/app/routes/marketing/about/instagram-story-widget.tsx:153` (new message affordance `<div>`)
- Prototype: Scoping row `designs/react-reference-app/src/app/components/InstagramWidget.tsx:125-139` (like button)
- Planned production: `apps/platform/app/routes/marketing/about/instagram-story-widget.tsx:156` (new like `<button>`)
- Prototype: Scoping row `designs/react-reference-app/src/app/components/InstagramWidget.tsx:133-138` (`Heart`)
- Planned production: `apps/platform/app/routes/marketing/about/instagram-story-widget.tsx:163` (new heart icon)
- Prototype: Scoping row `designs/react-reference-app/src/app/components/InstagramWidget.tsx:140-142` (share button)
- Planned production: `apps/platform/app/routes/marketing/about/instagram-story-widget.tsx:169` (new share `<button>`)
- Prototype: Scoping row `designs/react-reference-app/src/app/components/InstagramWidget.tsx:141` (`Send`)
- Planned production: `apps/platform/app/routes/marketing/about/instagram-story-widget.tsx:170` (new send icon)

- [ ] **Step 1: Write the failing story widget tests**

Create `apps/platform/app/routes/marketing/about/instagram-story-widget.test.tsx`:

```tsx
// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { InstagramStoryWidget } from "./instagram-story-widget";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function stubMatchMedia(matches: boolean) {
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
  it("renders the story chrome and hardened Instagram handle link", () => {
    render(<InstagramStoryWidget />);

    expect(screen.getByAltText("Story 1 of 3")).toHaveAttribute(
      "src",
      "/media/hero/hero-training-poster.jpg",
    );
    expect(screen.getByRole("link", { name: "eli.fitness" })).toHaveAttribute(
      "href",
      "https://www.instagram.com/elilungu_",
    );
    expect(screen.getByRole("link", { name: "eli.fitness" })).toHaveAttribute("target", "_blank");
    expect(screen.getByRole("link", { name: "eli.fitness" })).toHaveAttribute(
      "rel",
      "noopener noreferrer",
    );
    expect(screen.getByRole("button", { name: "Like story" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Share story" })).toBeInTheDocument();
  });

  it("advances and rewinds from the left and right halves", () => {
    render(<InstagramStoryWidget />);

    const surface = screen.getByLabelText("Instagram stories - tap left or right to navigate");
    vi.spyOn(surface, "getBoundingClientRect").mockReturnValue({
      bottom: 0,
      height: 600,
      left: 0,
      right: 300,
      top: 0,
      width: 300,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });

    fireEvent.click(surface, { clientX: 250 });
    expect(screen.getByAltText("Story 2 of 3")).toBeInTheDocument();

    fireEvent.click(surface, { clientX: 25 });
    expect(screen.getByAltText("Story 1 of 3")).toBeInTheDocument();
  });

  it("loops from the last story back to the first", async () => {
    const user = userEvent.setup();
    render(<InstagramStoryWidget />);

    const surface = screen.getByLabelText("Instagram stories - tap left or right to navigate");

    await user.keyboard("{ArrowRight}");
    expect(screen.getByAltText("Story 2 of 3")).toBeInTheDocument();

    await user.keyboard("{ArrowRight}");
    expect(screen.getByAltText("Story 3 of 3")).toBeInTheDocument();

    await user.keyboard("{ArrowRight}");
    expect(screen.getByAltText("Story 1 of 3")).toBeInTheDocument();
    expect(surface).toBeInTheDocument();
  });

  it("toggles like state for the current story", async () => {
    const user = userEvent.setup();
    render(<InstagramStoryWidget />);

    await user.click(screen.getByRole("button", { name: "Like story" }));
    expect(screen.getByRole("button", { name: "Unlike story" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Unlike story" }));
    expect(screen.getByRole("button", { name: "Like story" })).toBeInTheDocument();
  });

  it("auto-advances after the story duration", async () => {
    vi.useFakeTimers();
    stubMatchMedia(false);
    render(<InstagramStoryWidget />);

    await act(async () => {
      vi.advanceTimersByTime(5000);
    });

    expect(screen.getByAltText("Story 2 of 3")).toBeInTheDocument();
  });

  it("disables auto-advance when reduced motion is requested", async () => {
    vi.useFakeTimers();
    stubMatchMedia(true);
    render(<InstagramStoryWidget />);

    await act(async () => {
      vi.advanceTimersByTime(5000);
    });

    expect(screen.getByAltText("Story 1 of 3")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the failing story widget test**

Run:

```bash
zsh -lc 'source ~/.nvm/nvm.sh && nvm use 24.14.1 >/dev/null && pnpm vitest run apps/platform/app/routes/marketing/about/instagram-story-widget.test.tsx'
```

Expected: FAIL because `./instagram-story-widget` does not exist.

- [ ] **Step 3: Implement story state helpers and widget markup**

Create `apps/platform/app/routes/marketing/about/instagram-story-widget.tsx`:

```tsx
import { cn, IconButton, PhoneFrame, usePrefersReducedMotion } from "@eli-coach-platform/ui";
import { Heart, MoreHorizontal, Send } from "lucide-react";
import { type KeyboardEvent, type MouseEvent, useEffect, useState } from "react";

import { ABOUT_MEDIA, ABOUT_STORIES, INSTAGRAM_PROFILE_URL } from "./about-content";

const STORY_DURATION_MS = 5000;
const STORY_PROGRESS_INTERVAL_MS = 50;
const STORY_PROGRESS_INCREMENT = 100 / (STORY_DURATION_MS / STORY_PROGRESS_INTERVAL_MS);

function getNextStoryIndex(currentIndex: number) {
  return (currentIndex + 1) % ABOUT_STORIES.length;
}

function getPreviousStoryIndex(currentIndex: number) {
  if (currentIndex === 0) {
    return 0;
  }

  return currentIndex - 1;
}

export function InstagramStoryWidget() {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [likedStories, setLikedStories] = useState(() => ABOUT_STORIES.map(() => false));
  const [progress, setProgress] = useState(0);
  const currentStory = ABOUT_STORIES[currentIndex];
  const isCurrentStoryLiked = likedStories[currentIndex] ?? false;

  const advanceStory = () => {
    setCurrentIndex((value) => getNextStoryIndex(value));
    setProgress(0);
  };

  const rewindStory = () => {
    setCurrentIndex((value) => getPreviousStoryIndex(value));
    setProgress(0);
  };

  useEffect(() => {
    if (prefersReducedMotion) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setProgress((value) => {
        if (value + STORY_PROGRESS_INCREMENT >= 100) {
          setCurrentIndex((index) => getNextStoryIndex(index));
          return 0;
        }

        return value + STORY_PROGRESS_INCREMENT;
      });
    }, STORY_PROGRESS_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [prefersReducedMotion, currentIndex]);

  const navigateFromPointer = (event: MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const pointerX = event.clientX - rect.left;

    if (pointerX < rect.width / 2) {
      rewindStory();
      return;
    }

    advanceStory();
  };

  const navigateFromKeyboard = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      rewindStory();
    }

    if (event.key === "ArrowRight" || event.key === "Enter") {
      event.preventDefault();
      advanceStory();
    }
  };

  const toggleLike = () => {
    setLikedStories((stories) =>
      stories.map((isLiked, index) => (index === currentIndex ? !isLiked : isLiked)),
    );
  };

  return (
    <PhoneFrame
      aria-label="Instagram story preview"
      className="mx-auto aspect-[9/16] w-full max-w-[280px] shrink-0 lg:mx-0 lg:max-w-[340px]"
      statusBarVariant="light"
    >
      <div
        aria-label="Instagram stories - tap left or right to navigate"
        className="absolute inset-0 cursor-pointer outline-none focus-visible:outline-2 focus-visible:outline-offset-[-6px] focus-visible:outline-text-inverted"
        onClick={navigateFromPointer}
        onKeyDown={navigateFromKeyboard}
        role="button"
        tabIndex={0}
      >
        <img
          alt={currentStory.alt}
          className="absolute inset-0 size-full object-cover transition-opacity duration-200"
          src={currentStory.imageSrc}
          style={{ objectPosition: currentStory.objectPosition }}
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-b from-surface-inverted/40 via-transparent to-surface-inverted/40"
        />
      </div>

      <div className="absolute left-0 right-0 top-12 z-40 flex gap-1 px-4" aria-hidden="true">
        {ABOUT_STORIES.map((story, index) => {
          const width = index < currentIndex ? 100 : index === currentIndex ? progress : 0;

          return (
            <div key={story.alt} className="h-[3px] flex-1 overflow-hidden rounded-pill bg-surface-base/30">
              <div
                className="h-full bg-surface-base transition-[width] duration-75 ease-linear motion-reduce:transition-none"
                style={{ width: `${width}%` }}
              />
            </div>
          );
        })}
      </div>

      <div className="pointer-events-none absolute left-0 right-0 top-[70px] z-40 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <div className="size-8 overflow-hidden rounded-pill border border-surface-base">
            <img alt="" className="size-full object-cover" src={ABOUT_MEDIA.heroPoster} />
          </div>
          <a
            className="pointer-events-auto text-body-sm font-medium text-text-inverted outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-inverted"
            href={INSTAGRAM_PROFILE_URL}
            onClick={(event) => event.stopPropagation()}
            rel="noopener noreferrer"
            target="_blank"
          >
            eli.fitness
          </a>
          <span className="ml-1 text-xs text-text-inverted/60">4h</span>
        </div>
        <MoreHorizontal aria-hidden="true" className="size-5 text-text-inverted" />
      </div>

      <div className="absolute bottom-4 left-0 right-0 z-40 flex items-center gap-3 px-4">
        <div className="pointer-events-none flex-1 rounded-pill border border-surface-base/40 px-3.5 py-1.5 text-xs text-text-inverted/80 backdrop-blur-sm">
          Send message...
        </div>
        <IconButton
          aria-label={isCurrentStoryLiked ? "Unlike story" : "Like story"}
          className="size-11 text-text-inverted hover:text-text-inverted"
          onClick={toggleLike}
          size="sm"
          variant="inverted"
        >
          <Heart
            aria-hidden="true"
            className={cn("size-5 transition-colors", {
              "fill-brand-primary text-brand-primary": isCurrentStoryLiked,
            })}
          />
        </IconButton>
        <IconButton
          aria-label="Share story"
          className="size-11 text-text-inverted hover:text-text-inverted"
          size="sm"
          variant="inverted"
        >
          <Send aria-hidden="true" className="size-5" />
        </IconButton>
      </div>
    </PhoneFrame>
  );
}
```

- [ ] **Step 4: Run the About and widget tests**

Run:

```bash
zsh -lc 'source ~/.nvm/nvm.sh && nvm use 24.14.1 >/dev/null && pnpm vitest run apps/platform/app/routes/marketing/about/about.test.tsx apps/platform/app/routes/marketing/about/instagram-story-widget.test.tsx'
```

Expected: PASS.

- [ ] **Step 5: Commit About and widget**

Commit:

```bash
git add apps/platform/app/routes/marketing/about
git commit -m "GEN-86 add about section story widget"
```

---

### Task 4: Homepage Integration

**Files:**
- Modify: `apps/platform/app/routes/marketing/home.tsx:1-24`
- Modify: `apps/platform/app/routes/marketing/layout/layout.ui-integration.test.tsx:31-120`

**Element mapping:**
- Prototype: Scoping row `designs/react-reference-app/src/app/pages/Home.tsx:15` (`About`)
- Planned production: `apps/platform/app/routes/marketing/home.tsx:23` (new `<MarketingAbout waitlist={waitlist} />`)
- Prototype: Scoping row `designs/react-reference-app/src/app/pages/Home.tsx:14` (`Hero`)
- Planned production: `apps/platform/app/routes/marketing/home.tsx:22` (existing `<MarketingHero />` before About)

- [ ] **Step 1: Add failing homepage integration assertions**

Modify `apps/platform/app/routes/marketing/layout/layout.ui-integration.test.tsx` by adding these assertions to the first test after live waitlist hydration:

```tsx
await waitFor(() => {
  expect(screen.getByRole("heading", { level: 2, name: "Meet Eli, your coach" })).toBeInTheDocument();
});
expect(screen.getByText("Doors open soon. Get on the list so yours is held.")).toBeInTheDocument();
expect(screen.queryByRole("link", { name: "Start my plan" })).not.toBeInTheDocument();
expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
```

Add this assertion to the normal-mode test after the hero heading appears:

```tsx
expect(screen.getByRole("link", { name: "Start my plan" })).toHaveAttribute("href", "/book");
expect(screen.getByRole("link", { name: "See pricing" })).toHaveAttribute("href", "/pricing");
```

- [ ] **Step 2: Run the failing integration test**

Run:

```bash
zsh -lc 'source ~/.nvm/nvm.sh && nvm use 24.14.1 >/dev/null && pnpm vitest run apps/platform/app/routes/marketing/layout/layout.ui-integration.test.tsx'
```

Expected: FAIL because the homepage does not render About yet.

- [ ] **Step 3: Render About after Hero**

Modify `apps/platform/app/routes/marketing/home.tsx`:

```tsx
import type { MetaFunction } from "react-router";
import { useOutletContext } from "react-router";

import { MarketingAbout } from "./about/about";
import { MarketingHero } from "./hero/hero";
import type { MarketingOutletContext } from "./layout/layout";

export const meta: MetaFunction = () => [
  { title: "Strength Coaching for Women, Online or In Person - with Eli" },
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
      <MarketingAbout waitlist={waitlist} />
      <div aria-hidden="true" className="h-24 bg-surface-page" />
    </>
  );
}
```

- [ ] **Step 4: Run integration and focused tests**

Run:

```bash
zsh -lc 'source ~/.nvm/nvm.sh && nvm use 24.14.1 >/dev/null && pnpm vitest run apps/platform/app/routes/marketing/layout/layout.ui-integration.test.tsx apps/platform/app/routes/marketing/about/about.test.tsx apps/platform/app/routes/marketing/about/instagram-story-widget.test.tsx packages/ui/src/components/phone-frame.test.tsx'
```

Expected: PASS.

- [ ] **Step 5: Commit homepage integration**

Commit:

```bash
git add apps/platform/app/routes/marketing/home.tsx apps/platform/app/routes/marketing/layout/layout.ui-integration.test.tsx
git commit -m "GEN-86 render about section on homepage"
```

---

### Task 5: Full Verification And Browser Parity Check

**Files:**
- No planned source edits.

- [ ] **Step 1: Run lint**

Run:

```bash
zsh -lc 'source ~/.nvm/nvm.sh && nvm use 24.14.1 >/dev/null && pnpm lint'
```

Expected: PASS.

- [ ] **Step 2: Run typecheck**

Run:

```bash
zsh -lc 'source ~/.nvm/nvm.sh && nvm use 24.14.1 >/dev/null && pnpm typecheck'
```

Expected: PASS.

- [ ] **Step 3: Run full unit/UI test suite**

Run:

```bash
zsh -lc 'source ~/.nvm/nvm.sh && nvm use 24.14.1 >/dev/null && pnpm test'
```

Expected: PASS.

- [ ] **Step 4: Run a11y tests**

Run:

```bash
zsh -lc 'source ~/.nvm/nvm.sh && nvm use 24.14.1 >/dev/null && pnpm test:a11y'
```

Expected: PASS.

- [ ] **Step 5: Run Lighthouse**

Run:

```bash
zsh -lc 'source ~/.nvm/nvm.sh && nvm use 24.14.1 >/dev/null && pnpm test:lighthouse'
```

Expected: PASS with Lighthouse output recorded in the implementation notes.

- [ ] **Step 6: Start production app and reference app for parity**

Run the platform:

```bash
zsh -lc 'source ~/.nvm/nvm.sh && nvm use 24.14.1 >/dev/null && pnpm dev:platform'
```

Run the reference app in a second session:

```bash
zsh -lc 'cd designs/react-reference-app && source ~/.nvm/nvm.sh && nvm use && npm install && npm run dev -- --host 0.0.0.0 --port 5173'
```

Expected: production app serves on `http://localhost:3000`; reference app serves on `http://localhost:5173`.

- [ ] **Step 7: Browser-check visible parity and responsiveness**

Use the in-app browser or Playwright to inspect:

- Production `/` waitlist mode.
- Production `/` after runtime waitlist snapshot disables waitlist mode.
- Reference app `/`.
- Mobile width 390px.
- Tablet width 768px.
- Desktop width 1440px.

Expected:

- About section appears directly after Hero.
- Layout matches prototype: portrait/content column and phone widget stack on mobile, two columns on desktop.
- Heading, copy, chip text, CTAs, phone frame, story header, progress bars, and bottom controls visually mirror the prototype except for the approved hero-media substitution.
- Waitlist mode hides `Start my plan` and `See pricing`.
- Normal mode shows `/book` and `/pricing`.
- Keyboard tab order reaches story surface, like button, share button, and Instagram handle.
- Reduced motion keeps manual story navigation usable.

---

## Plan Self-Review

- Spec coverage: Covered reusable `PhoneFrame`, route-local About, story behavior, waitlist branching, hero-media reuse, accessibility, reduced motion, tests, and browser parity.
- Placeholder scan: No `TBD`, `TODO`, incomplete sections, or unspecified implementation steps.
- Type consistency: `MarketingAbout`, `InstagramStoryWidget`, `PhoneFrame`, `ABOUT_COPY`, `ABOUT_CHIPS`, `ABOUT_MEDIA`, and `ABOUT_STORIES` names are consistent across tasks.
- Parity inventory: Every visible About and story widget declaration from Scoping has a planned production mapping in Tasks 1-4.
