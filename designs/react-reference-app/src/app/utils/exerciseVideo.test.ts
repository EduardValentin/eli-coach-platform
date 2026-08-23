import { describe, it, expect } from 'vitest';
import { MP4_ACCEPT, MP4_ONLY_MESSAGE, isMp4File } from './exerciseVideo';

const fileNamed = (name: string, type: string) => new File(['x'], name, { type });

describe('MP4_ACCEPT', () => {
  it('offers the file picker both the extension and the media type', () => {
    // arrange, act & assert
    expect(MP4_ACCEPT).toBe('.mp4,video/mp4');
  });
});

describe('isMp4File', () => {
  it('accepts a file the browser reports as video/mp4', () => {
    // arrange
    const file = fileNamed('squat-demo.mp4', 'video/mp4');

    // act
    const result = isMp4File(file);

    // assert
    expect(result).toBe(true);
  });

  it('accepts a dropped .mp4 whose type the browser could not determine', () => {
    // arrange
    const file = fileNamed('squat-demo.mp4', '');

    // act
    const result = isMp4File(file);

    // assert
    expect(result).toBe(true);
  });

  it('accepts an uppercase .MP4 extension', () => {
    // arrange
    const file = fileNamed('SQUAT-DEMO.MP4', '');

    // act
    const result = isMp4File(file);

    // assert
    expect(result).toBe(true);
  });

  it('rejects a QuickTime video, which the library no longer accepts', () => {
    // arrange
    const file = fileNamed('squat-demo.mov', 'video/quicktime');

    // act
    const result = isMp4File(file);

    // assert
    expect(result).toBe(false);
  });

  it('rejects a non-video file', () => {
    // arrange
    const file = fileNamed('form-cues.pdf', 'application/pdf');

    // act
    const result = isMp4File(file);

    // assert
    expect(result).toBe(false);
  });

  it('rejects a name that merely mentions mp4 without ending in it', () => {
    // arrange
    const file = fileNamed('mp4-notes.txt', 'text/plain');

    // act
    const result = isMp4File(file);

    // assert
    expect(result).toBe(false);
  });

  it('states the rule in the message shown to the coach', () => {
    // arrange, act & assert
    expect(MP4_ONLY_MESSAGE).toBe('Only .mp4 videos are supported');
  });
});
