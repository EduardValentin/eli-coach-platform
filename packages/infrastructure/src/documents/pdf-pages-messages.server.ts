export type PageRendition = {
  longEdge: number;
  webpQuality: number;
};

export type PdfPagesQuestion =
  | { kind: "open"; bytes: Uint8Array; longestEdge: number }
  | { kind: "render"; pageNumber: number; rendition: PageRendition };

export type PdfPagesRequest = PdfPagesQuestion & { requestId: number };

export type PdfPagesAnswer =
  | { kind: "opened"; pageCount: number }
  | { kind: "unreadable" }
  | { kind: "rendered"; bytes: Uint8Array }
  | { kind: "failed"; message: string };

export type PdfPagesReply = PdfPagesAnswer & { requestId: number };
