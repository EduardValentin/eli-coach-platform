import { describe, it, expect } from 'vitest';
import {
  VIDEO_MAX_BYTES,
  isVideoFile,
  isWithinVideoLimit,
  videoContentRejectionMessage,
  videoRejectionMessage,
  videoTooLargeMessage,
} from './exerciseVideo';

const fileNamed = (name: string, type: string) => new File(['x'], name, { type });

function videoOfSize(name: string, size: number): File {
  const file = fileNamed(name, 'video/mp4');
  Object.defineProperty(file, 'size', { value: size });
  return file;
}

describe('isVideoFile', () => {
  it('accepts a file the browser reports as video/mp4', () => {
    // arrange
    const file = fileNamed('squat-demo.mp4', 'video/mp4');

    // act
    const result = isVideoFile(file);

    // assert
    expect(result).toBe(true);
  });

  it('accepts a dropped .mp4 whose type the browser could not determine', () => {
    // arrange
    const file = fileNamed('squat-demo.mp4', '');

    // act
    const result = isVideoFile(file);

    // assert
    expect(result).toBe(true);
  });

  it('accepts an uppercase .MP4 extension', () => {
    // arrange
    const file = fileNamed('SQUAT-DEMO.MP4', '');

    // act
    const result = isVideoFile(file);

    // assert
    expect(result).toBe(true);
  });

  it('accepts a file the browser reports as video/quicktime', () => {
    // arrange
    const file = fileNamed('squat-demo', 'video/quicktime');

    // act
    const result = isVideoFile(file);

    // assert
    expect(result).toBe(true);
  });

  it('accepts a .mov whose type the browser could not determine, in any case', () => {
    // arrange
    const file = fileNamed('SQUAT-DEMO.MOV', '');

    // act
    const result = isVideoFile(file);

    // assert
    expect(result).toBe(true);
  });

  it('rejects another video format', () => {
    // arrange
    const file = fileNamed('squat-demo.avi', 'video/x-msvideo');

    // act
    const result = isVideoFile(file);

    // assert
    expect(result).toBe(false);
  });

  it('rejects a non-video file', () => {
    // arrange
    const file = fileNamed('form-cues.pdf', 'application/pdf');

    // act
    const result = isVideoFile(file);

    // assert
    expect(result).toBe(false);
  });

  it('rejects a name that merely mentions mp4 without ending in it', () => {
    // arrange
    const file = fileNamed('mp4-notes.txt', 'text/plain');

    // act
    const result = isVideoFile(file);

    // assert
    expect(result).toBe(false);
  });

  it('names the rejected file so a repeat rejection reads differently', () => {
    // arrange
    const first = fileNamed('squat-demo.avi', 'video/x-msvideo');
    const second = fileNamed('deadlift-demo.avi', 'video/x-msvideo');

    // act
    const firstMessage = videoRejectionMessage(first);
    const secondMessage = videoRejectionMessage(second);

    // assert
    expect(firstMessage).toContain('squat-demo.avi');
    expect(firstMessage).toBe('squat-demo.avi is not an .mp4 or .mov — only .mp4 and .mov videos are supported');
    expect(firstMessage).not.toBe(secondMessage);
  });
});

describe('isWithinVideoLimit', () => {
  it('accepts a video of exactly 50 MB', () => {
    // arrange
    const file = videoOfSize('squat-demo.mp4', VIDEO_MAX_BYTES);

    // act
    const result = isWithinVideoLimit(file);

    // assert
    expect(result).toBe(true);
  });

  it('refuses a video one byte over 50 MB', () => {
    // arrange
    const file = videoOfSize('squat-demo.mp4', VIDEO_MAX_BYTES + 1);

    // act
    const result = isWithinVideoLimit(file);

    // assert
    expect(result).toBe(false);
  });

  it('names the oversize file', () => {
    // arrange
    const file = videoOfSize('clip.mp4', VIDEO_MAX_BYTES + 1);

    // act
    const message = videoTooLargeMessage(file);

    // assert
    expect(message).toBe('clip.mp4 is larger than 50 MB');
  });
});

describe('videoContentRejectionMessage', () => {
  it('names a file the server found holds no MP4 or MOV video by what it contains', () => {
    // arrange
    const file = fileNamed('squat.mp4', 'video/mp4');

    // act
    const message = videoContentRejectionMessage(file);

    // assert
    expect(message).toBe('squat.mp4 doesn’t contain an MP4 or MOV video.');
  });
});
