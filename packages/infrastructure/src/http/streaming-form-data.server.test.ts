import { describe, expect, it, vi } from "vitest";

import { readStreamingFormData } from "./streaming-form-data.server";

const URL = "https://evoa.fit/api/coach/exercises";
const BOUNDARY = "evoa-boundary";

type Part =
  | { field: string; text: string }
  | { field: string; filename: string; content: string };

function multipartOf(parts: readonly Part[]): string {
  const encoded = parts.map((part) =>
    "filename" in part
      ? `--${BOUNDARY}\r\nContent-Disposition: form-data; name="${part.field}"; filename="${part.filename}"\r\nContent-Type: video/mp4\r\n\r\n${part.content}\r\n`
      : `--${BOUNDARY}\r\nContent-Disposition: form-data; name="${part.field}"\r\n\r\n${part.text}\r\n`,
  );

  return `${encoded.join("")}--${BOUNDARY}--\r\n`;
}

function streamedRequest(body: string): Request {
  const bytes = new TextEncoder().encode(body);

  return new Request(URL, {
    body: new ReadableStream({
      start(controller) {
        for (let offset = 0; offset < bytes.byteLength; offset += 16) {
          controller.enqueue(bytes.subarray(offset, offset + 16));
        }
        controller.close();
      },
    }),
    duplex: "half",
    headers: { "Content-Type": `multipart/form-data; boundary=${BOUNDARY}` },
    method: "POST",
  } as RequestInit);
}

function formRequest(formData: FormData): Request {
  return new Request(URL, { body: formData, method: "POST" });
}

function videoForm(...entries: [string, string | Blob][]): FormData {
  const formData = new FormData();

  for (const [field, value] of entries) {
    if (typeof value === "string") {
      formData.append(field, value);
    } else {
      formData.append(field, value, "squat.mp4");
    }
  }

  return formData;
}

async function receivedText(bytes: AsyncIterable<Uint8Array>) {
  const chunks: Uint8Array[] = [];

  for await (const chunk of bytes) {
    chunks.push(chunk);
  }

  return {
    text: new TextDecoder().decode(Buffer.concat(chunks)),
    everyChunkIsBytes: chunks.every((chunk) => chunk instanceof Uint8Array),
  };
}

describe("readStreamingFormData", () => {
  it("hands the file to the receiver and keeps the text fields", async () => {
    // arrange
    const request = formRequest(
      videoForm(
        ["exercise", '{"name":"Squat"}'],
        ["video", new Blob(["squat demo bytes"])],
      ),
    );

    // act
    const body = await readStreamingFormData(request, {
      fileField: "video",
      maxTotalBytes: 1024,
      receiveFile: receivedText,
    });

    // assert
    expect(body).toEqual({
      status: "valid",
      fields: new Map([["exercise", '{"name":"Squat"}']]),
      received: { text: "squat demo bytes", everyChunkIsBytes: true },
    });
  });

  it("answers the text fields alone when no file is sent", async () => {
    // arrange
    const receiveFile = vi.fn(receivedText);
    const request = formRequest(videoForm(["exercise", "{}"]));

    // act
    const body = await readStreamingFormData(request, {
      fileField: "video",
      maxTotalBytes: 1024,
      receiveFile,
    });

    // assert
    expect(body).toEqual({
      status: "valid",
      fields: new Map([["exercise", "{}"]]),
      received: null,
    });
    expect(receiveFile).not.toHaveBeenCalled();
  });

  it.each([
    { contentType: "application/json", body: "{}" },
    { contentType: "application/x-www-form-urlencoded", body: "exercise=x" },
    { contentType: "multipart/mixed; boundary=evoa-boundary", body: "" },
  ])("refuses a $contentType body", async ({ contentType, body }) => {
    // arrange
    const request = new Request(URL, {
      body,
      headers: { "Content-Type": contentType },
      method: "POST",
    });

    // act
    const result = await readStreamingFormData(request, {
      fileField: "video",
      maxTotalBytes: 1024,
      receiveFile: receivedText,
    });

    // assert
    expect(result).toEqual({ status: "malformed", received: null });
  });

  it.each([{ declared: "1025" }, { declared: "ten" }])(
    "answers too large for a declared length of $declared without reading the file",
    async ({ declared }) => {
      // arrange
      const receiveFile = vi.fn(receivedText);
      const request = new Request(URL, {
        body: multipartOf([
          { field: "video", filename: "squat.mp4", content: "demo" },
        ]),
        headers: {
          "Content-Length": declared,
          "Content-Type": `multipart/form-data; boundary=${BOUNDARY}`,
        },
        method: "POST",
      });

      // act
      const body = await readStreamingFormData(request, {
        fileField: "video",
        maxTotalBytes: 1024,
        receiveFile,
      });

      // assert
      expect(body).toEqual({ status: "too_large", received: null });
      expect(receiveFile).not.toHaveBeenCalled();
    },
  );

  it("answers too large when a streamed file grows past the limit", async () => {
    // arrange
    const receiveFile = vi.fn(receivedText);
    const request = streamedRequest(
      multipartOf([
        { field: "video", filename: "squat.mp4", content: "x".repeat(200) },
      ]),
    );

    // act
    const body = await readStreamingFormData(request, {
      fileField: "video",
      maxTotalBytes: 100,
      receiveFile,
    });

    // assert
    expect(body).toEqual({ status: "too_large", received: null });
    expect(receiveFile).not.toHaveBeenCalled();
  });

  it("reports the file it received when a later field breaks the limit", async () => {
    // arrange
    const request = streamedRequest(
      multipartOf([
        { field: "video", filename: "squat.mp4", content: "x".repeat(60) },
        { field: "exercise", text: "y".repeat(60) },
      ]),
    );

    // act
    const body = await readStreamingFormData(request, {
      fileField: "video",
      maxTotalBytes: 100,
      receiveFile: receivedText,
    });

    // assert
    expect(body).toEqual({
      status: "too_large",
      received: { text: "x".repeat(60), everyChunkIsBytes: true },
    });
  });

  it("refuses a second file and reports the first one it received", async () => {
    // arrange
    const receiveFile = vi.fn(receivedText);
    const request = formRequest(
      videoForm(
        ["video", new Blob(["first"])],
        ["video", new Blob(["second"])],
      ),
    );

    // act
    const body = await readStreamingFormData(request, {
      fileField: "video",
      maxTotalBytes: 1024,
      receiveFile,
    });

    // assert
    expect(body).toEqual({
      status: "malformed",
      received: { text: "first", everyChunkIsBytes: true },
    });
    expect(receiveFile).toHaveBeenCalledTimes(1);
  });

  it("refuses a file sent under another field", async () => {
    // arrange
    const receiveFile = vi.fn(receivedText);
    const request = formRequest(videoForm(["exercise", new Blob(["demo"])]));

    // act
    const body = await readStreamingFormData(request, {
      fileField: "video",
      maxTotalBytes: 1024,
      receiveFile,
    });

    // assert
    expect(body).toEqual({ status: "malformed", received: null });
    expect(receiveFile).not.toHaveBeenCalled();
  });

  it("refuses a text field sent twice", async () => {
    // arrange
    const request = formRequest(
      videoForm(["exercise", "a"], ["exercise", "b"]),
    );

    // act
    const body = await readStreamingFormData(request, {
      fileField: "video",
      maxTotalBytes: 1024,
      receiveFile: receivedText,
    });

    // assert
    expect(body).toEqual({ status: "malformed", received: null });
  });

  it("refuses a body that never closes its parts", async () => {
    // arrange
    const request = streamedRequest(
      `--${BOUNDARY}\r\nContent-Disposition: form-data; name="exercise"\r\n\r\n{}`,
    );

    // act
    const body = await readStreamingFormData(request, {
      fileField: "video",
      maxTotalBytes: 1024,
      receiveFile: receivedText,
    });

    // assert
    expect(body).toEqual({ status: "malformed", received: null });
  });

  it("refuses more parts than a form sends", async () => {
    // arrange
    const fields = Array.from({ length: 9 }, (_, index) => ({
      field: `field-${index}`,
      text: "x",
    }));
    const request = streamedRequest(multipartOf(fields));

    // act
    const body = await readStreamingFormData(request, {
      fileField: "video",
      maxTotalBytes: 1024,
      receiveFile: receivedText,
    });

    // assert
    expect(body).toEqual({ status: "malformed", received: null });
  });

  it("lets the receiver's own failure through", async () => {
    // arrange
    const failure = new Error("disk full");
    const request = formRequest(videoForm(["video", new Blob(["demo"])]));

    // act
    const reading = readStreamingFormData(request, {
      fileField: "video",
      maxTotalBytes: 1024,
      receiveFile: () => Promise.reject(failure),
    });

    // assert
    await expect(reading).rejects.toBe(failure);
  });
});
