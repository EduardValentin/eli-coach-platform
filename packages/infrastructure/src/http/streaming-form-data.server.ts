import { Readable, Transform, type TransformCallback } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { ReadableStream as NodeReadableStream } from "node:stream/web";

import { Busboy, type BusboyFileStream } from "@fastify/busboy";

import { declaresLengthOver } from "./http.server";

type StreamingFormDataOptions<Received> = {
  maxTotalBytes: number;
  fileField: string;
  receiveFile: (bytes: AsyncIterable<Uint8Array>) => Promise<Received>;
};

type StreamingFormDataResult<Received> =
  | {
      status: "valid";
      fields: ReadonlyMap<string, string>;
      received: Received | null;
    }
  | { status: "too_large"; received: Received | null }
  | { status: "malformed"; received: Received | null };

type FormRefusal = "too_large" | "malformed";

const MAX_FORM_PARTS = 8;
const MAX_FORM_FIELDS = 4;
const MAX_FIELD_BYTES = 64 * 1024;

class RefusedFormError extends Error {}

class StreamingFormDataReading<Received> {
  private readonly fields = new Map<string, string>();
  private refusal: FormRefusal | null = null;
  private received: Received | null = null;
  private receiving: Promise<void> = Promise.resolve();
  private receiverFailure: { error: unknown } | null = null;
  private fileStream: BusboyFileStream | null = null;
  private fileStreamFailed = false;
  private source: Readable | null = null;
  private receivedBytes = 0;

  constructor(
    private readonly request: Request,
    private readonly options: StreamingFormDataOptions<Received>,
  ) {}

  async read(): Promise<StreamingFormDataResult<Received>> {
    const parser = this.parser();

    if (!parser || !this.request.body) return this.refused("malformed");

    this.source = Readable.fromWeb(
      this.request.body as NodeReadableStream<Uint8Array>,
    );
    await pipeline(this.source, this.byteCounter(), parser).catch(
      (error: unknown) => this.stopAfter(error),
    );
    await this.receiving;

    if (this.receiverFailure) throw this.receiverFailure.error;
    if (this.refusal) return this.refused(this.refusal);

    return { status: "valid", fields: this.fields, received: this.received };
  }

  private parser() {
    try {
      const parser = Busboy({
        headers: {
          "content-type": this.request.headers.get("Content-Type") ?? "",
        },
        limits: {
          fieldSize: MAX_FIELD_BYTES,
          fields: MAX_FORM_FIELDS,
          fileSize: this.options.maxTotalBytes,
          files: 1,
          parts: MAX_FORM_PARTS,
        },
      });

      parser.on("file", (field, stream) => this.takeFile(field, stream));
      parser.on("field", (field, value, fieldTruncated, valueTruncated) =>
        fieldTruncated || valueTruncated
          ? this.refuse("malformed")
          : this.takeField(field, value),
      );
      parser.on("filesLimit", () => this.refuse("malformed"));
      parser.on("fieldsLimit", () => this.refuse("malformed"));
      parser.on("partsLimit", () => this.refuse("malformed"));

      return parser;
    } catch {
      return null;
    }
  }

  private byteCounter(): Transform {
    return new Transform({
      transform: (
        chunk: Uint8Array,
        _encoding: BufferEncoding,
        callback: TransformCallback,
      ) => {
        this.receivedBytes += chunk.byteLength;

        if (this.receivedBytes > this.options.maxTotalBytes) {
          this.refusal = "too_large";
          callback(new RefusedFormError());
          return;
        }

        callback(null, chunk);
      },
    });
  }

  private takeFile(field: string, stream: BusboyFileStream): void {
    if (field !== this.options.fileField) {
      this.refuse("malformed");
      stream.resume();
      return;
    }

    this.fileStream = stream;
    stream.on("error", () => {
      this.fileStreamFailed = true;
    });
    stream.on("limit", () => this.refuse("too_large"));
    this.receiving = this.options.receiveFile(stream).then(
      (received) => {
        this.received = received;
      },
      (error: unknown) => this.receiverFailed(error),
    );
  }

  private takeField(field: string, value: string): void {
    if (this.fields.has(field)) {
      this.refuse("malformed");
      return;
    }

    this.fields.set(field, value);
  }

  private receiverFailed(error: unknown): void {
    if (this.fileStreamFailed) return;

    this.receiverFailure = { error };
    this.source?.destroy(new RefusedFormError());
  }

  private stopAfter(error: unknown): void {
    if (!this.refusal && !this.receiverFailure) this.refuse("malformed");

    this.fileStream?.destroy(
      error instanceof Error ? error : new RefusedFormError(),
    );
  }

  private refuse(refusal: FormRefusal): void {
    this.refusal ??= refusal;
  }

  private refused(refusal: FormRefusal): StreamingFormDataResult<Received> {
    return { status: refusal, received: this.received };
  }
}

export async function readStreamingFormData<Received>(
  request: Request,
  options: StreamingFormDataOptions<Received>,
): Promise<StreamingFormDataResult<Received>> {
  if (!isFormDataRequest(request)) {
    return { status: "malformed", received: null };
  }

  if (declaresLengthOver(request, options.maxTotalBytes)) {
    return { status: "too_large", received: null };
  }

  return new StreamingFormDataReading(request, options).read();
}

export function isFormDataRequest(request: Request): boolean {
  const mediaType = request.headers.get("Content-Type")?.split(";")[0];

  return mediaType?.trim().toLowerCase() === "multipart/form-data";
}
