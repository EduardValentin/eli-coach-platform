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

function heroPosterPicture(container: HTMLElement) {
  const picture = container.querySelector('picture');

  if (!picture) {
    throw new Error('Expected the hero to render a poster picture.');
  }

  return picture;
}

function heroPosterImage(container: HTMLElement) {
  const image = heroPosterPicture(container).querySelector('img');

  if (!image) {
    throw new Error('Expected the hero poster picture to hold an image.');
  }

  return image;
}

describe('Hero', () => {
  it('loops the silent studio clip behind the copy', () => {
    // arrange
    // act
    const { container } = renderHero();

    // assert
    const video = heroVideo(container);

    expect(video.closest('[aria-hidden="true"]')).not.toBeNull();
    expect(video.loop).toBe(true);
    expect(video.muted).toBe(true);
    expect(video).toHaveAttribute('playsinline');
  });

  it('offers upright screens the portrait cut and every other screen the landscape cut', () => {
    // arrange
    // act
    const { container } = renderHero();

    // assert
    expect(
      Array.from(heroVideo(container).querySelectorAll('source')).map((source) => ({
        media: source.getAttribute('media'),
        src: source.getAttribute('src'),
        type: source.getAttribute('type'),
      })),
    ).toEqual([
      {
        media: '(orientation: portrait)',
        src: expect.stringMatching(/\/media\/hero\/hero-studio-loop-portrait\.h264\.mp4$/),
        type: 'video/mp4',
      },
      {
        media: null,
        src: expect.stringMatching(/\/media\/hero\/hero-studio-loop-landscape\.h264\.mp4$/),
        type: 'video/mp4',
      },
    ]);
  });

  it('paints a decorative poster behind the clip, the portrait one on upright screens', () => {
    // arrange
    // act
    const { container } = renderHero();

    // assert
    const video = heroVideo(container);
    const posterPicture = heroPosterPicture(container);
    const posterImage = heroPosterImage(container);

    expect(video).not.toHaveAttribute('poster');
    expect(posterPicture.nextElementSibling).toBe(video);
    expect(posterPicture.closest('[aria-hidden="true"]')).not.toBeNull();
    expect(
      Array.from(posterPicture.querySelectorAll('source')).map((source) => ({
        media: source.getAttribute('media'),
        srcSet: source.getAttribute('srcset'),
      })),
    ).toEqual([
      {
        media: '(orientation: portrait)',
        srcSet: expect.stringMatching(/\/media\/hero\/hero-studio-poster-portrait\.webp$/),
      },
    ]);
    expect(posterImage).toHaveAttribute('alt', '');
    expect(posterImage.getAttribute('src')).toMatch(/\/media\/hero\/hero-studio-poster-landscape\.webp$/);
  });

  it('shows only the poster, with a play control, when motion is reduced', () => {
    // arrange
    motionPreference.reduced = true;

    // act
    const { container } = renderHero();

    // assert
    expect(heroVideo(container).querySelector('source')).toBeNull();
    expect(heroPosterImage(container)).toBeInTheDocument();
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
