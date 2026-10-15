import { ReadableStream as NodeReadableStream } from "node:stream/web";

export type FileBytes = AsyncIterable<Uint8Array> | Iterable<Uint8Array>;

export function streamOf(bytes: FileBytes): ReadableStream<Uint8Array> {
  return NodeReadableStream.from(bytes) as ReadableStream<Uint8Array>;
}
