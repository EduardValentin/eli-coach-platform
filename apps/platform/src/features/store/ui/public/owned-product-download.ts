import { joinBasePath } from "@eli-coach-platform/config";

// Fetched rather than followed as a link: the row has to know whether the
// download was refused so it can say so under itself, and a navigation would
// leave the page instead of answering.
export async function downloadOwnedProduct(slug: string): Promise<void> {
  const response = await fetch(buildDownloadUrl(slug), {
    credentials: "same-origin",
  });

  if (!response.ok) {
    throw new Error(
      `The Library download for "${slug}" answered ${response.status}.`,
    );
  }

  saveBlob(
    await response.blob(),
    filenameFromContentDisposition(
      response.headers.get("Content-Disposition"),
      slug,
    ),
  );
}

function buildDownloadUrl(slug: string): string {
  return joinBasePath(
    import.meta.env.BASE_URL,
    `/api/store/library/${encodeURIComponent(slug)}/download`,
  );
}

// The server sends both forms of the filename. The extended one carries the
// customer's own characters, so it is read first and the ASCII fallback only
// answers for a browser-hostile name the server had to strip.
function filenameFromContentDisposition(
  header: string | null,
  fallback: string,
): string {
  const encodedFilename = header?.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  const quotedFilename = header?.match(/filename="([^"]+)"/i)?.[1];

  return decodeFilename(encodedFilename) ?? quotedFilename ?? fallback;
}

function decodeFilename(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  try {
    return decodeURIComponent(value.trim());
  } catch {
    // A malformed escape makes the plain filename the better of the two.
    return undefined;
  }
}

function saveBlob(blob: Blob, filename: string): void {
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  // Released a task later, not here: the browser starts the save from a queued
  // task, and revoking in the same one has historically cancelled it.
  setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
}
