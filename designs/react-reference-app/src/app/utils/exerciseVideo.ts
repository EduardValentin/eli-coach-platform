/** What the file picker offers (PRD §6, Exercise Library req 3: raw `.mp4` upload). */
export const MP4_ACCEPT = '.mp4,video/mp4';

const MP4_ONLY_MESSAGE = 'Only .mp4 videos are supported';

/**
 * Names the offending file so a second rejection reads differently from the
 * first — an assistive technology announces a live region only when its text
 * actually changes.
 */
export const mp4RejectionMessage = (file: File): string =>
  `${file.name} is not an .mp4 — ${MP4_ONLY_MESSAGE.toLowerCase()}`;

/**
 * Accepts the media type or the extension. A file dragged from some file
 * managers arrives with an empty `type`, so requiring the media type alone
 * would reject a genuine `.mp4`.
 */
export function isMp4File(file: File): boolean {
  return file.type === 'video/mp4' || file.name.toLowerCase().endsWith('.mp4');
}
