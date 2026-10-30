import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

type EnsureVersionedTermsPdfOptions = Readonly<{
  pdfPath: string;
  pdfBytes: Uint8Array;
}>;

function isFileSystemError(error: unknown, code: string): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === code
  );
}

export async function ensureVersionedTermsPdf({
  pdfPath,
  pdfBytes,
}: EnsureVersionedTermsPdfOptions): Promise<"created" | "matched"> {
  await mkdir(dirname(pdfPath), { recursive: true });

  try {
    await writeFile(pdfPath, pdfBytes, { flag: "wx" });
    return "created";
  } catch (error) {
    if (!isFileSystemError(error, "EEXIST")) {
      throw error;
    }
  }

  const publishedBytes = await readFile(pdfPath);
  if (publishedBytes.equals(Buffer.from(pdfBytes))) {
    return "matched";
  }

  throw new Error(
    "Published Terms PDF differs. Create a new Terms version and effective date.",
  );
}
