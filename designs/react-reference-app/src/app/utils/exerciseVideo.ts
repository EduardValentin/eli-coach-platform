/** What the file picker offers (PRD §6, Exercise Library req 3: raw `.mp4` upload). */
export const MP4_ACCEPT = '.mp4,video/mp4';

export const MP4_ONLY_MESSAGE = 'Only .mp4 videos are supported';

/**
 * Accepts the media type or the extension. A file dragged from some file
 * managers arrives with an empty `type`, so requiring the media type alone
 * would reject a genuine `.mp4`.
 */
export function isMp4File(file: File): boolean {
  return file.type === 'video/mp4' || file.name.toLowerCase().endsWith('.mp4');
}
