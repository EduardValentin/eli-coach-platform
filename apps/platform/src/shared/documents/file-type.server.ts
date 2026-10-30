import { ZipHandler } from "@tokenizer/inflate";
import { fromBuffer } from "strtok3";

export async function readZipEntryNames(
  bytes: Uint8Array,
): Promise<readonly string[] | null> {
  const archive = new ZipHandler(fromBuffer(bytes));

  if (!(await archive.isZip())) return [];

  try {
    const entries = await archive.readCentralDirectory();

    return entries?.map((entry) => entry.filename) ?? null;
  } catch {
    return null;
  }
}
