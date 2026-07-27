import { createHash } from "node:crypto";

import type {
  LegalDocument,
  LegalDocumentBlock,
  LegalText,
} from "./legal-document";

const normalize = (value: string) => value.normalize("NFC");

function assertNever(value: never): never {
  throw new Error(`Unsupported legal document block: ${JSON.stringify(value)}`);
}

function canonicalizeText(text: LegalText) {
  return text.map((fragment) =>
    typeof fragment === "string"
      ? normalize(fragment)
      : {
          href: normalize(fragment.href),
          label: normalize(fragment.label),
          scope: fragment.scope,
        },
  );
}

function canonicalizeBlock(block: LegalDocumentBlock) {
  switch (block.kind) {
    case "paragraph":
      return {
        kind: block.kind,
        content: canonicalizeText(block.content),
      };
    case "list":
      return {
        kind: block.kind,
        items: block.items.map(canonicalizeText),
      };
    case "definition-list":
      return {
        kind: block.kind,
        items: block.items.map((item) => ({
          term: normalize(item.term),
          description: canonicalizeText(item.description),
        })),
      };
    default:
      return assertNever(block);
  }
}

export function canonicalizeLegalDocument(document: LegalDocument): string {
  return JSON.stringify({
    id: normalize(document.id),
    version: normalize(document.version),
    effectiveDate: normalize(document.effectiveDate),
    title: normalize(document.title),
    description: normalize(document.description),
    sections: document.sections.map((section) => ({
      id: normalize(section.id),
      heading: normalize(section.heading),
      blocks: section.blocks.map(canonicalizeBlock),
    })),
  });
}

export function legalDocumentSha256(document: LegalDocument): string {
  return createHash("sha256")
    .update(canonicalizeLegalDocument(document))
    .digest("hex");
}
