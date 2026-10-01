// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";

import { Lightbox, type LightboxPhoto } from "./lightbox";

afterEach(() => {
  cleanup();
});

const FRONT: LightboxPhoto = {
  alt: "Front photo",
  key: "front",
  label: "Front",
  src: "/photos/front.jpg",
};

const SIDE: LightboxPhoto = {
  alt: "Side photo",
  key: "side",
  label: "Side",
  src: "/photos/side.jpg",
};

const BACK: LightboxPhoto = {
  alt: "Back photo",
  key: "back",
  label: "Back",
  src: "/photos/back.jpg",
};

const LABELS = {
  close: "Close",
  next: "Next photo",
  position: (position: number, count: number) => `${position} of ${count}`,
  previous: "Previous photo",
};

function Gallery({ photos }: { photos: readonly LightboxPhoto[] }) {
  const [currentKey, setCurrentKey] = useState<string | null>(null);

  return (
    <>
      {photos.map((photo) => (
        <button
          key={photo.key}
          onClick={() => setCurrentKey(photo.key)}
          type="button"
        >
          Open {photo.label}
        </button>
      ))}
      <Lightbox
        currentKey={currentKey}
        description="29 September"
        labels={LABELS}
        onCurrentKeyChange={setCurrentKey}
        photos={photos}
      />
    </>
  );
}

function lightbox() {
  return screen.getByRole("dialog", { name: /· \d of \d$/ });
}

async function openAt(label: string, photos = [FRONT, SIDE, BACK]) {
  const user = userEvent.setup();
  render(<Gallery photos={photos} />);
  await user.click(screen.getByRole("button", { name: `Open ${label}` }));

  return user;
}

async function swipe(
  user: ReturnType<typeof userEvent.setup>,
  { fromX, toX }: { fromX: number; toX: number },
) {
  const target = within(lightbox()).getByRole("img");
  await user.pointer([
    { keys: "[TouchA>]", target, coords: { clientX: fromX, clientY: 300 } },
    { pointerName: "TouchA", target, coords: { clientX: toX, clientY: 305 } },
    { keys: "[/TouchA]", target },
  ]);
}

describe("the lightbox", () => {
  it("shows the opened photo with its place in the set and the date", async () => {
    // arrange, act
    await openAt("Side");

    // assert
    expect(lightbox()).toHaveAccessibleName("Side · 2 of 3");
    expect(lightbox()).toHaveAccessibleDescription("29 September");
    expect(
      within(lightbox()).getByRole("img", { name: "Side photo" }),
    ).toHaveAttribute("src", SIDE.src);
  });

  it("fills the viewport inside the device's safe area", async () => {
    // arrange, act
    await openAt("Front");

    // assert
    expect(lightbox()).toHaveClass(
      "inset-0",
      "h-dvh",
      "pt-[env(safe-area-inset-top)]",
      "pr-[env(safe-area-inset-right)]",
      "pb-[env(safe-area-inset-bottom)]",
      "pl-[env(safe-area-inset-left)]",
    );
  });

  it("moves to the next photo and back with the arrow buttons", async () => {
    // arrange
    const user = await openAt("Front");

    // act
    await user.click(screen.getByRole("button", { name: "Next photo" }));
    const afterNext = lightbox().textContent;
    await user.click(screen.getByRole("button", { name: "Previous photo" }));

    // assert
    expect(afterNext).toContain("Side · 2 of 3");
    expect(lightbox()).toHaveAccessibleName("Front · 1 of 3");
  });

  it("cycles round from the last photo to the first", async () => {
    // arrange
    const user = await openAt("Back");

    // act
    await user.click(screen.getByRole("button", { name: "Next photo" }));

    // assert
    expect(lightbox()).toHaveAccessibleName("Front · 1 of 3");
  });

  it("moves between the photos with the arrow keys", async () => {
    // arrange
    const user = await openAt("Front");

    // act
    await user.keyboard("{ArrowLeft}");
    const afterLeft = lightbox().textContent;
    await user.keyboard("{ArrowRight}");

    // assert
    expect(afterLeft).toContain("Back · 3 of 3");
    expect(lightbox()).toHaveAccessibleName("Front · 1 of 3");
  });

  it("moves to the next photo on a swipe left and back on a swipe right", async () => {
    // arrange
    const user = await openAt("Front");

    // act
    await swipe(user, { fromX: 240, toX: 150 });
    const afterSwipeLeft = lightbox().textContent;
    await swipe(user, { fromX: 100, toX: 200 });

    // assert
    expect(afterSwipeLeft).toContain("Side · 2 of 3");
    expect(lightbox()).toHaveAccessibleName("Front · 1 of 3");
  });

  it("stays on the photo when the finger moves less than a swipe", async () => {
    // arrange
    const user = await openAt("Front");

    // act
    await swipe(user, { fromX: 240, toX: 215 });

    // assert
    expect(lightbox()).toHaveAccessibleName("Front · 1 of 3");
  });

  it("doubles the photo on a double click and fits it again on the next", async () => {
    // arrange
    const user = await openAt("Front");
    const image = within(lightbox()).getByRole("img");

    // act
    await user.dblClick(image);
    const zoomed = image.style.transform;
    await user.dblClick(image);

    // assert
    expect(zoomed).toBe("scale(2)");
    expect(image.style.transform).toBe("scale(1)");
  });

  it("fits the photo again when she moves to another one", async () => {
    // arrange
    const user = await openAt("Front");
    await user.dblClick(within(lightbox()).getByRole("img"));

    // act
    await user.keyboard("{ArrowRight}");
    await user.keyboard("{ArrowLeft}");

    // assert
    expect(within(lightbox()).getByRole("img").style.transform).toBe(
      "scale(1)",
    );
  });

  it("offers no arrows when there is a single photo", async () => {
    // arrange, act
    await openAt("Side", [SIDE]);

    // assert
    expect(lightbox()).toHaveAccessibleName("Side · 1 of 1");
    expect(
      screen.queryByRole("button", { name: /^(Next|Previous) photo$/ }),
    ).not.toBeInTheDocument();
  });

  it("closes on Escape and returns focus to the photo that opened it", async () => {
    // arrange
    const user = await openAt("Back");
    await user.keyboard("{ArrowRight}");

    // act
    await user.keyboard("{Escape}");

    // assert
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Open Back" })).toHaveFocus(),
    );
  });

  it("closes with its one Close button and returns focus to the photo that opened it", async () => {
    // arrange
    const user = await openAt("Front");
    const closeButtons = within(lightbox()).getAllByRole("button", {
      name: "Close",
    });

    // act
    await user.click(closeButtons[0]);

    // assert
    expect(closeButtons).toHaveLength(1);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Open Front" })).toHaveFocus(),
    );
  });
});
