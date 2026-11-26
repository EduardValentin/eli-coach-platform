import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MotionGlobalConfig } from 'motion/react';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { InstagramWidget } from './InstagramWidget';

const motionPreference = vi.hoisted(() => ({ reduced: false }));

vi.mock('motion/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('motion/react')>()),
  useReducedMotion: () => motionPreference.reduced,
}));

type ObservedTarget = { callback: IntersectionObserverCallback; rootMargin?: string; target: Element };

const observedTargets: ObservedTarget[] = [];

class IntersectionObserverStub {
  constructor(
    private readonly callback: IntersectionObserverCallback,
    private readonly options: IntersectionObserverInit = {},
  ) {}

  observe = (target: Element) => {
    observedTargets.push({ callback: this.callback, rootMargin: this.options.rootMargin, target });
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
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
  vi.stubGlobal('IntersectionObserver', IntersectionObserverStub);
  vi.mocked(HTMLMediaElement.prototype.play).mockReset().mockResolvedValue(undefined);
  vi.mocked(HTMLMediaElement.prototype.pause).mockClear();
});

afterEach(() => {
  motionPreference.reduced = false;
  observedTargets.length = 0;
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

async function reportIntersection(targets: ObservedTarget[], widgetPosition: 'in-view' | 'out-of-view') {
  await act(async () => {
    targets.forEach(({ callback, target }) => {
      callback(
        [{ isIntersecting: widgetPosition === 'in-view', target } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      );
    });
  });
}

async function bringWidgetNearViewport() {
  await reportIntersection(
    observedTargets.filter(({ rootMargin }) => rootMargin !== undefined),
    'in-view',
  );
}

async function scrollWidgetIntoView() {
  await reportIntersection(observedTargets, 'in-view');
}

async function scrollWidgetOutOfView() {
  await reportIntersection(observedTargets, 'out-of-view');
}

async function waitStoryTime(milliseconds: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(milliseconds);
  });
}

function renderedStoryMedia() {
  return Array.from(document.querySelectorAll('video')).map((video) => ({
    label: video.getAttribute('aria-label'),
    poster: video.getAttribute('poster'),
    sources: Array.from(video.querySelectorAll('source')).map((source) => ({
      src: source.getAttribute('src'),
      type: source.getAttribute('type'),
    })),
  }));
}

function expectedStoryMedia({ position, reel }: { position: number; reel: string }) {
  return {
    label: `Story ${position} of 3`,
    poster: expect.stringMatching(new RegExp(`/media/about/story-${reel}-poster\\.webp$`)),
    sources: [
      {
        src: expect.stringMatching(new RegExp(`/media/about/story-${reel}\\.h264\\.mp4$`)),
        type: 'video/mp4',
      },
    ],
  };
}

describe('InstagramWidget', () => {
  it('requests no reel or poster until the phone frame nears the viewport', () => {
    // arrange
    // act
    render(<InstagramWidget />);

    // assert
    expect(renderedStoryMedia()).toEqual([{ label: 'Story 1 of 3', poster: null, sources: [] }]);
    expect(HTMLMediaElement.prototype.play).not.toHaveBeenCalled();
  });

  it('loads the first poster and reel as the phone frame nears the viewport, but plays it only once in view', async () => {
    // arrange
    render(<InstagramWidget />);

    // act
    await bringWidgetNearViewport();

    // assert
    expect(renderedStoryMedia()).toEqual([expectedStoryMedia({ position: 1, reel: 'lifestyle' })]);
    expect(HTMLMediaElement.prototype.play).not.toHaveBeenCalled();
  });

  it('plays the lifestyle reel over its poster once the phone frame enters the viewport', async () => {
    // arrange
    render(<InstagramWidget />);

    // act
    await scrollWidgetIntoView();

    // assert
    expect(renderedStoryMedia()).toEqual([expectedStoryMedia({ position: 1, reel: 'lifestyle' })]);
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Pause story' })).toBeInTheDocument();
  });

  it('plays the lifestyle, mobility and gym reels for 10 seconds each, then starts over', async () => {
    // arrange
    render(<InstagramWidget />);
    await scrollWidgetIntoView();

    // act
    await waitStoryTime(9_900);

    // assert
    expect(renderedStoryMedia()).toEqual([expectedStoryMedia({ position: 1, reel: 'lifestyle' })]);

    // act
    await waitStoryTime(500);

    // assert
    expect(renderedStoryMedia()).toEqual([expectedStoryMedia({ position: 2, reel: 'mobility' })]);

    // act
    await waitStoryTime(10_000);

    // assert
    expect(renderedStoryMedia()).toEqual([expectedStoryMedia({ position: 3, reel: 'gym' })]);

    // act
    await waitStoryTime(10_000);

    // assert
    expect(renderedStoryMedia()).toEqual([expectedStoryMedia({ position: 1, reel: 'lifestyle' })]);
  });

  it('loads only the reel of the story the visitor moves to', async () => {
    // arrange
    const user = userEvent.setup();
    render(<InstagramWidget />);
    await scrollWidgetIntoView();
    await user.tab();

    // act
    await user.keyboard('{ArrowRight}');

    // assert
    expect(renderedStoryMedia()).toEqual([expectedStoryMedia({ position: 2, reel: 'mobility' })]);

    // act
    await user.keyboard('{ArrowLeft}');

    // assert
    expect(renderedStoryMedia()).toEqual([expectedStoryMedia({ position: 1, reel: 'lifestyle' })]);
  });

  it('pauses the reel and its progress, then resumes both from where they stopped', async () => {
    // arrange
    const user = userEvent.setup();
    render(<InstagramWidget />);
    await scrollWidgetIntoView();
    await waitStoryTime(4_000);
    vi.mocked(HTMLMediaElement.prototype.pause).mockClear();

    // act
    await user.click(screen.getByRole('button', { name: 'Pause story' }));
    await waitStoryTime(30_000);

    // assert
    expect(HTMLMediaElement.prototype.pause).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Play story' })).toBeInTheDocument();
    expect(screen.getByLabelText('Story 1 of 3')).toBeInTheDocument();

    // arrange
    vi.mocked(HTMLMediaElement.prototype.play).mockClear();

    // act
    await user.click(screen.getByRole('button', { name: 'Play story' }));
    await waitStoryTime(5_500);

    // assert
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Pause story' })).toBeInTheDocument();
    expect(screen.getByLabelText('Story 1 of 3')).toBeInTheDocument();

    // act
    await waitStoryTime(1_000);

    // assert
    expect(screen.getByLabelText('Story 2 of 3')).toBeInTheDocument();
  });

  it('holds the reel and its progress while the phone frame is out of view, then resumes both', async () => {
    // arrange
    render(<InstagramWidget />);
    await scrollWidgetIntoView();
    await waitStoryTime(4_000);
    vi.mocked(HTMLMediaElement.prototype.pause).mockClear();

    // act
    await scrollWidgetOutOfView();
    await waitStoryTime(30_000);

    // assert
    expect(HTMLMediaElement.prototype.pause).toHaveBeenCalled();
    expect(renderedStoryMedia()).toEqual([expectedStoryMedia({ position: 1, reel: 'lifestyle' })]);

    // act
    await scrollWidgetIntoView();
    await waitStoryTime(6_500);

    // assert
    expect(renderedStoryMedia()).toEqual([expectedStoryMedia({ position: 2, reel: 'mobility' })]);
  });

  it('shows the paused look and holds the story when the browser refuses autoplay', async () => {
    // arrange
    vi.mocked(HTMLMediaElement.prototype.play).mockRejectedValue(
      new DOMException('Autoplay is not allowed.', 'NotAllowedError'),
    );
    render(<InstagramWidget />);

    // act
    await scrollWidgetIntoView();
    await waitStoryTime(20_000);

    // assert
    expect(screen.getByRole('button', { name: 'Play story' })).toBeInTheDocument();
    expect(screen.getByLabelText('Story 1 of 3')).toBeInTheDocument();
  });

  it('shows only the first poster, without video, auto-advance or playback control, when motion is reduced', async () => {
    // arrange
    motionPreference.reduced = true;
    render(<InstagramWidget />);

    // act
    await scrollWidgetIntoView();
    await waitStoryTime(30_000);

    // assert
    expect(renderedStoryMedia()).toEqual([{ ...expectedStoryMedia({ position: 1, reel: 'lifestyle' }), sources: [] }]);
    expect(HTMLMediaElement.prototype.play).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Pause story' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Play story' })).not.toBeInTheDocument();
  });
});
