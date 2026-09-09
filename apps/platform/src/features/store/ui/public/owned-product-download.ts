import { joinBasePath } from "@eli-coach-platform/config";

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

function filenameFromContentDisposition(
  header: string | null,
  fallback: string,
): string {
  const utf8Filename = header?.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  const asciiFilename = header?.match(/filename="([^"]+)"/i)?.[1];

  return decodeFilename(utf8Filename) ?? asciiFilename ?? fallback;
}

function decodeFilename(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  try {
    return decodeURIComponent(value.trim());
  } catch {
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
  // Revoking in the same task as the click has historically cancelled the save.
  setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
}
