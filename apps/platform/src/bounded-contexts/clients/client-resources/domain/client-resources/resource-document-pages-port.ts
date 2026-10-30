import type { ResourcePageImage } from "./client-resource-store-port";

export type ReadableResourceDocument = {
  status: "readable";
  pageCount: number;
  pages(): AsyncIterable<ResourcePageImage>;
  thumbnail(): Promise<Uint8Array>;
  close(): Promise<void>;
};

export type ResourceDocumentReading =
  { status: "unreadable" } | ReadableResourceDocument;

export interface ResourceDocumentPagesPort {
  read(bytes: Uint8Array): Promise<ResourceDocumentReading>;
}
