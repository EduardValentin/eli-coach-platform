import { readFile, writeFile } from "node:fs/promises";

import { renderProductCover } from "./render-product-cover";

const [sourcePath, targetPath, requestedWidth] = process.argv.slice(2);

if (!sourcePath || !targetPath) {
  console.error(
    "Usage: pnpm --filter @eli-coach-platform/platform store:cover <source.pdf> <cover.webp> [width]",
  );
  process.exit(1);
}

const coverBytes = await renderProductCover({
  pdfBytes: new Uint8Array(await readFile(sourcePath)),
  targetWidth: requestedWidth ? Number(requestedWidth) : undefined,
});

await writeFile(targetPath, coverBytes);

console.log(`rendered ${targetPath} (${coverBytes.byteLength} bytes)`);
