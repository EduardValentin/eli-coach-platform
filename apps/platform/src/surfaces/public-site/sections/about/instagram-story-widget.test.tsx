// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MotionConfig, MotionGlobalConfig } from "motion/react";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { InstagramStoryWidget } from "./instagram-story-widget";

type ObservedTarget = {
  callback: IntersectionObserverCallback;
  rootMargin?: string;
  target: Element;
};

const observedTargets: ObservedTarget[] = [];

class IntersectionObserverStub {
  constructor(
    private readonly callback: IntersectionObserverCallback,
    private readonly options: IntersectionObserverInit = {},
  ) {}

  observe = (target: Element) => {
    observedTargets.push({
      callback: this.callback,
      rootMargin: this.options.rootMargin,
      target,
    });
  };

  unobserve = vi.fn();
  disconnect = vi.fn();
}

beforeAll(() => {
  MotionGlobalConfig.skipAnimations = true;
});

afterAll(() => {
  MotionGlobalConfig.skipAnimations = false;
});

beforeEach(() => {
  vi.stubGlobal("IntersectionObserver", IntersectionObserverStub);
  vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  observedTargets.length = 0;
  vi.restoreAllMocks();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function runStoryClockOnFakeTimers() {
  vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
}

async function reportIntersection(
  targets: ObservedTarget[],
  widgetPosition: "in-view" | "out-of-view",
) {
  await act(async () => {
    targets.forEach(({ callback, target }) => {
      callback(
        [
          {
            isIntersecting: widgetPosition === "in-view",
            target,
          } as IntersectionObserverEntry,
        ],
        {} as IntersectionObserver,
      );
    });
  });
}

async function bringWidgetNearViewport() {
  await reportIntersection(
    observedTargets.filter(({ rootMargin }) => rootMargin !== undefined),
    "in-view",
  );
}

async function scrollWidgetIntoView() {
  await reportIntersection(observedTargets, "in-view");
}

async function scrollWidgetOutOfView() {
  await reportIntersection(observedTargets, "out-of-view");
}

async function waitStoryTime(milliseconds: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(milliseconds);
  });
}

function renderedStoryMedia() {
  return Array.from(document.querySelectorAll("video")).map((video) => ({
    label: video.getAttribute("aria-label"),
    poster: video.getAttribute("poster"),
    sources: Array.from(video.querySelectorAll("source")).map((source) => ({
      src: source.getAttribute("src"),
      type: source.getAttribute("type"),
    })),
  }));
}

function expectedStoryMedia(options: { position: number; reel: string }) {
  return {
    label: `Story ${options.position} of 3`,
    poster: `/media/about/story-${options.reel}-poster.webp`,
    sources: [
      {
        src: `/media/about/story-${options.reel}.h264.mp4`,
        type: "video/mp4",
      },
    ],
  };
}

function renderStoryWidget(
  options: {
    reducedMotion?: "always" | "never" | "user";
  } = {},
) {
  render(
    <MotionConfig reducedMotion={options.reducedMotion ?? "never"}>
      <InstagramStoryWidget />
    </MotionConfig>,
  );
}

describe("InstagramStoryWidget", () => {
  it("renders the story chrome and hardened Instagram handle link", () => {
    // arrange
    // act
    renderStoryWidget();

    // assert
    const instagramLink = screen.getByRole("link", { name: "eli.fitness" });

    expect(screen.getByLabelText("Story 1 of 3")).toBeInTheDocument();
    expect(screen.getByText("Send message…")).toBeInTheDocument();
    expect(instagramLink).toHaveAttribute(
      "href",
      "https://www.instagram.com/elilungu_",
    );
    expect(instagramLink).toHaveAttribute("target", "_blank");
    expect(instagramLink).toHaveAttribute("rel", "noopener noreferrer");
    expect(
      screen.getByRole("button", { name: "Like story" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Share story" }),
    ).toBeInTheDocument();
  });

  it("requests no reel or poster until the phone frame nears the viewport", () => {
    // arrange
    // act
    renderStoryWidget();

    // assert
    expect(renderedStoryMedia()).toEqual([
      { label: "Story 1 of 3", poster: null, sources: [] },
    ]);
    expect(HTMLMediaElement.prototype.play).not.toHaveBeenCalled();
  });

  it("loads the first poster and reel as the phone frame nears the viewport, but plays it only once in view", async () => {
    // arrange
    renderStoryWidget();

    // act
    await bringWidgetNearViewport();

    // assert
    expect(renderedStoryMedia()).toEqual([
      expectedStoryMedia({ position: 1, reel: "lifestyle" }),
    ]);
    expect(HTMLMediaElement.prototype.play).not.toHaveBeenCalled();
  });

  it("plays the lifestyle reel over its poster once the phone frame enters the viewport", async () => {
    // arrange
    renderStoryWidget();

    // act
    await scrollWidgetIntoView();

    // assert
    expect(renderedStoryMedia()).toEqual([
      expectedStoryMedia({ position: 1, reel: "lifestyle" }),
    ]);
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalled();
    expect(
      screen.getByRole("button", { name: "Pause story" }),
    ).toBeInTheDocument();
  });

  it("plays the lifestyle, mobility and gym reels for 10 seconds each, then starts over", async () => {
    // arrange
    runStoryClockOnFakeTimers();
    renderStoryWidget();
    await scrollWidgetIntoView();

    // act
    await waitStoryTime(9_900);

    // assert
    expect(renderedStoryMedia()).toEqual([
      expectedStoryMedia({ position: 1, reel: "lifestyle" }),
    ]);

    // act
    await waitStoryTime(500);

    // assert
    expect(renderedStoryMedia()).toEqual([
      expectedStoryMedia({ position: 2, reel: "mobility" }),
    ]);

    // act
    await waitStoryTime(10_000);

    // assert
    expect(renderedStoryMedia()).toEqual([
      expectedStoryMedia({ position: 3, reel: "gym" }),
    ]);

    // act
    await waitStoryTime(10_000);

    // assert
    expect(renderedStoryMedia()).toEqual([
      expectedStoryMedia({ position: 1, reel: "lifestyle" }),
    ]);
  });

  it("loads only the reel of the story the visitor moves to", async () => {
    // arrange
    const user = userEvent.setup();
    renderStoryWidget();
    await scrollWidgetIntoView();
    await user.tab();

    // act
    await user.keyboard("{ArrowRight}");

    // assert
    expect(await screen.findByLabelText("Story 2 of 3")).toBeInTheDocument();
    expect(renderedStoryMedia()).toEqual([
      expectedStoryMedia({ position: 2, reel: "mobility" }),
    ]);

    // act
    await user.keyboard("{ArrowLeft}");

    // assert
    expect(await screen.findByLabelText("Story 1 of 3")).toBeInTheDocument();
    expect(renderedStoryMedia()).toEqual([
      expectedStoryMedia({ position: 1, reel: "lifestyle" }),
    ]);
  });

  it("pauses the reel and its progress, then resumes both from where they stopped", async () => {
    // arrange
    runStoryClockOnFakeTimers();
    const user = userEvent.setup();
    renderStoryWidget();
    await scrollWidgetIntoView();
    await waitStoryTime(4_000);
    vi.mocked(HTMLMediaElement.prototype.pause).mockClear();

    // act
    await user.click(screen.getByRole("button", { name: "Pause story" }));
    await waitStoryTime(30_000);

    // assert
    expect(HTMLMediaElement.prototype.pause).toHaveBeenCalled();
    expect(
      screen.getByRole("button", { name: "Play story" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Story 1 of 3")).toBeInTheDocument();

    // arrange
    vi.mocked(HTMLMediaElement.prototype.play).mockClear();

    // act
    await user.click(screen.getByRole("button", { name: "Play story" }));
    await waitStoryTime(5_500);

    // assert
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalled();
    expect(
      screen.getByRole("button", { name: "Pause story" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Story 1 of 3")).toBeInTheDocument();

    // act
    await waitStoryTime(1_000);

    // assert
    expect(screen.getByLabelText("Story 2 of 3")).toBeInTheDocument();
  });

  it("holds the reel and its progress while the phone frame is out of view, then resumes both", async () => {
    // arrange
    runStoryClockOnFakeTimers();
    renderStoryWidget();
    await scrollWidgetIntoView();
    await waitStoryTime(4_000);
    vi.mocked(HTMLMediaElement.prototype.pause).mockClear();

    // act
    await scrollWidgetOutOfView();
    await waitStoryTime(30_000);

    // assert
    expect(HTMLMediaElement.prototype.pause).toHaveBeenCalled();
    expect(renderedStoryMedia()).toEqual([
      expectedStoryMedia({ position: 1, reel: "lifestyle" }),
    ]);

    // act
    await scrollWidgetIntoView();
    await waitStoryTime(6_500);

    // assert
    expect(renderedStoryMedia()).toEqual([
      expectedStoryMedia({ position: 2, reel: "mobility" }),
    ]);
  });

  it("shows the paused look and holds the story when the browser refuses autoplay", async () => {
    // arrange
    runStoryClockOnFakeTimers();
    vi.mocked(HTMLMediaElement.prototype.play).mockRejectedValue(
      new DOMException("Autoplay is not allowed.", "NotAllowedError"),
    );
    renderStoryWidget();

    // act
    await scrollWidgetIntoView();
    await waitStoryTime(20_000);

    // assert
    expect(
      screen.getByRole("button", { name: "Play story" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Story 1 of 3")).toBeInTheDocument();
  });

  it("shows only the first poster, without video, auto-advance or playback control, when motion is reduced", async () => {
    // arrange
    runStoryClockOnFakeTimers();
    renderStoryWidget({ reducedMotion: "always" });

    // act
    await scrollWidgetIntoView();
    await waitStoryTime(30_000);

    // assert
    expect(renderedStoryMedia()).toEqual([
      {
        ...expectedStoryMedia({ position: 1, reel: "lifestyle" }),
        sources: [],
      },
    ]);
    expect(HTMLMediaElement.prototype.play).not.toHaveBeenCalled();
    expect(
      screen.queryByRole("button", { name: "Pause story" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Play story" }),
    ).not.toBeInTheDocument();
  });

  it("advances and rewinds from the left and right halves", async () => {
    // arrange
    renderStoryWidget();

    const surface = screen.getByLabelText(
      "Instagram stories — tap left or right to navigate",
    );
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

    // act
    fireEvent.click(surface, { clientX: 250 });

    // assert
    expect(await screen.findByLabelText("Story 2 of 3")).toBeInTheDocument();

    // act
    fireEvent.click(surface, { clientX: 25 });

    // assert
    expect(await screen.findByLabelText("Story 1 of 3")).toBeInTheDocument();
  });

  it("loops from the last story back to the first", async () => {
    // arrange
    renderStoryWidget();

    const surface = screen.getByLabelText(
      "Instagram stories — tap left or right to navigate",
    );

    // act
    fireEvent.keyDown(surface, { key: "ArrowRight" });

    // assert
    expect(await screen.findByLabelText("Story 2 of 3")).toBeInTheDocument();

    // act
    fireEvent.keyDown(surface, { key: "ArrowRight" });

    // assert
    expect(await screen.findByLabelText("Story 3 of 3")).toBeInTheDocument();

    // act
    fireEvent.keyDown(surface, { key: "ArrowRight" });

    // assert
    expect(await screen.findByLabelText("Story 1 of 3")).toBeInTheDocument();
  });

  it("activates the story navigation button with Space", async () => {
    // arrange
    renderStoryWidget();

    // act
    fireEvent.keyDown(
      screen.getByLabelText(
        "Instagram stories — tap left or right to navigate",
      ),
      {
        key: " ",
      },
    );

    // assert
    expect(await screen.findByLabelText("Story 2 of 3")).toBeInTheDocument();
  });

  it("toggles like state for the current story", async () => {
    // arrange
    const user = userEvent.setup();
    renderStoryWidget();

    // act
    await user.click(screen.getByRole("button", { name: "Like story" }));

    // assert
    expect(
      screen.getByRole("button", { name: "Unlike story" }),
    ).toBeInTheDocument();

    // act
    await user.click(screen.getByRole("button", { name: "Unlike story" }));

    // assert
    expect(
      screen.getByRole("button", { name: "Like story" }),
    ).toBeInTheDocument();
  });

  it("keeps liked state independent for each story", async () => {
    // arrange
    const user = userEvent.setup();
    renderStoryWidget();

    // act
    await user.click(screen.getByRole("button", { name: "Like story" }));

    fireEvent.keyDown(
      screen.getByLabelText(
        "Instagram stories — tap left or right to navigate",
      ),
      {
        key: "ArrowRight",
      },
    );

    // assert
    expect(await screen.findByLabelText("Story 2 of 3")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Like story" }),
    ).toBeInTheDocument();

    // act
    fireEvent.keyDown(
      screen.getByLabelText(
        "Instagram stories — tap left or right to navigate",
      ),
      {
        key: "ArrowLeft",
      },
    );

    // assert
    expect(await screen.findByLabelText("Story 1 of 3")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Unlike story" }),
    ).toBeInTheDocument();
  });
});
