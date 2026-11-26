import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Hero } from './Hero';
import { AppProvider } from '../context/AppContext';

const motionPreference = vi.hoisted(() => ({ reduced: false }));

vi.mock('motion/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('motion/react')>()),
  useReducedMotion: () => motionPreference.reduced,
}));

beforeEach(() => {
  vi.mocked(HTMLMediaElement.prototype.play).mockClear();
  vi.mocked(HTMLMediaElement.prototype.pause).mockClear();
});

afterEach(() => {
  motionPreference.reduced = false;
});

function renderHero() {
  window.history.replaceState({}, '', '/');

  return render(
    <MemoryRouter initialEntries={['/']}>
      <AppProvider>
        <Hero />
      </AppProvider>
    </MemoryRouter>,
  );
}

function heroVideo(container: HTMLElement) {
  const video = container.querySelector('video');

  if (!video) {
    throw new Error('Expected the hero to render a background video.');
  }

  return video;
}

describe('Hero', () => {
  it('loops the silent studio clip behind the copy, over its poster', () => {
    // arrange
    // act
    const { container } = renderHero();

    // assert
    const video = heroVideo(container);

    expect(video.closest('[aria-hidden="true"]')).not.toBeNull();
    expect(video.loop).toBe(true);
    expect(video.muted).toBe(true);
    expect(video).toHaveAttribute('playsinline');
    expect(video.getAttribute('poster')).toMatch(/\/media\/hero\/hero-studio-poster\.webp$/);
    expect(
      Array.from(video.querySelectorAll('source')).map((source) => ({
        src: source.getAttribute('src'),
        type: source.getAttribute('type'),
      })),
    ).toEqual([
      {
        src: expect.stringMatching(/\/media\/hero\/hero-studio-loop-720\.h264\.mp4$/),
        type: 'video/mp4',
      },
    ]);
    expect(container.querySelector('img')).toBeNull();
  });

  it('shows only the poster, with a play control, when motion is reduced', () => {
    // arrange
    motionPreference.reduced = true;

    // act
    const { container } = renderHero();

    // assert
    expect(heroVideo(container).querySelector('source')).toBeNull();
    expect(screen.getByRole('button', { name: 'Play hero video' })).toBeInTheDocument();
  });

  it('pauses and resumes the clip from its playback control', async () => {
    // arrange
    const user = userEvent.setup();
    renderHero();

    // act
    await user.click(screen.getByRole('button', { name: 'Pause hero video' }));

    // assert
    expect(HTMLMediaElement.prototype.pause).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Play hero video' })).toBeInTheDocument();

    // arrange
    vi.mocked(HTMLMediaElement.prototype.play).mockClear();

    // act
    await user.click(screen.getByRole('button', { name: 'Play hero video' }));

    // assert
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Pause hero video' })).toBeInTheDocument();
  });

  it('restarts a paused clip from the beginning and resumes it', async () => {
    // arrange
    const user = userEvent.setup();
    const { container } = renderHero();
    const video = heroVideo(container);
    await user.click(screen.getByRole('button', { name: 'Pause hero video' }));
    video.currentTime = 9;
    vi.mocked(HTMLMediaElement.prototype.play).mockClear();

    // act
    await user.click(screen.getByRole('button', { name: 'Restart hero video' }));

    // assert
    expect(video.currentTime).toBe(0);
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Pause hero video' })).toBeInTheDocument();
  });
});
