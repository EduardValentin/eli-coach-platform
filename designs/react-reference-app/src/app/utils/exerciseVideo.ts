/** What the file picker offers (PRD §6, Exercise Library req 3: raw `.mp4` or `.mov` upload). */
export const VIDEO_ACCEPT = '.mp4,.mov,video/mp4,video/quicktime';

/**
 * Names the offending file so a second rejection reads differently from the
 * first — an assistive technology announces a live region only when its text
 * actually changes.
 */
export const videoRejectionMessage = (file: File): string =>
  `${file.name} is not an .mp4 or .mov — only .mp4 and .mov videos are supported`;

const VIDEO_TYPES = ['video/mp4', 'video/quicktime'];
const VIDEO_EXTENSIONS = ['.mp4', '.mov'];

/**
 * Accepts the media type or the extension. A file dragged from some file
 * managers arrives with an empty `type`, so requiring the media type alone
 * would reject a genuine `.mp4` or `.mov`.
 */
export function isVideoFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return VIDEO_TYPES.includes(file.type) || VIDEO_EXTENSIONS.some((extension) => name.endsWith(extension));
}

export const VIDEO_MAX_BYTES = 50 * 1024 * 1024;

export function isWithinVideoLimit(file: File): boolean {
  return file.size <= VIDEO_MAX_BYTES;
}

export const videoTooLargeMessage = (file: File): string => `${file.name} is larger than 50 MB`;

export const videoContentRejectionMessage = (file: File): string =>
  `${file.name} doesn’t contain an MP4 or MOV video.`;
