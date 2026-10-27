import type { ResourcePageImage } from "./client-resource-store";

export type ReadableResourceDocument = {
  status: "readable";
  pageCount: number;
  pages(): AsyncIterable<ResourcePageImage>;
  thumbnail(): Promise<Uint8Array>;
  close(): Promise<void>;
};

export type ResourceDocumentReading =
  { status: "unreadable" } | ReadableResourceDocument;

export interface ResourceDocumentPages {
  read(bytes: Uint8Array): Promise<ResourceDocumentReading>;
}
