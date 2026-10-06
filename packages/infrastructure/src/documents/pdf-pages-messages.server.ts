import type { PdfLongEdgeRendition } from "./pdf-page-renderer.server";

export type PdfPagesQuestion =
  | { kind: "open"; bytes: Uint8Array }
  | { kind: "render"; pageNumber: number; rendition: PdfLongEdgeRendition };

export type PdfPagesRequest = PdfPagesQuestion & { requestId: number };

export type PdfPagesAnswer =
  | { kind: "opened"; pageCount: number }
  | { kind: "unreadable" }
  | { kind: "rendered"; bytes: Uint8Array }
  | { kind: "failed"; message: string };

export type PdfPagesReply = PdfPagesAnswer & { requestId: number };
