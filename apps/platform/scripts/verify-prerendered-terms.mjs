import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const basePathSegments = (process.env.APP_BASE_PATH ?? "/").split("/").filter(Boolean);
const termsHtmlPath = resolve(
  scriptDirectory,
  "../build/client",
  ...basePathSegments,
  "terms/index.html",
);
const termsHtml = await readFile(termsHtmlPath, "utf8");
const renderedTermsHtml = termsHtml.replace(/<!--[\s\S]*?-->/g, "");
const requiredContent = [
  "<h1",
  "Version 1.0",
  "26 July 2026",
  "support@evoa.com",
  "Product problems, refunds, and mandatory remedies",
];
const closingFooterCount = (termsHtml.match(/<\/footer>/g) ?? []).length;

for (const content of requiredContent) {
  if (!renderedTermsHtml.includes(content)) {
    throw new Error(`Prerendered Terms HTML is missing: ${content}`);
  }
}

if (!/Terms (?:&amp;|&) Conditions/.test(termsHtml)) {
  throw new Error("Prerendered Terms HTML is missing the Terms & Conditions heading.");
}

if (closingFooterCount !== 1) {
  throw new Error(`Prerendered Terms HTML must contain one closing footer, found ${closingFooterCount}.`);
}

if (termsHtml.includes("contact@elipersonaltrainer.com")) {
  throw new Error("Prerendered Terms HTML contains the stale contact email.");
}

if (/\[[A-Z][A-Z0-9 _-]*\]/.test(termsHtml)) {
  throw new Error("Prerendered Terms HTML contains a bracketed placeholder marker.");
}
