import { Readable } from "node:stream";
import { describe, expect, it } from "vitest";

import {
  createAttachmentResponse,
  createPrivateInlineFileResponse,
  createSandboxedAttachmentResponse,
} from "./private-file-response.server";

function storedBytes(...chunks: string[]): AsyncIterable<Uint8Array> {
  return Readable.from(chunks.map((chunk) => Buffer.from(chunk)));
}

function headersOf(response: Response): Record<string, string> {
  return Object.fromEntries(response.headers.entries());
}

function dispositionFor(filename: string): string | null {
  return createAttachmentResponse(storedBytes("x"), {
    filename,
    mimeType: "application/pdf",
  }).headers.get("Content-Disposition");
}

describe("createAttachmentResponse", () => {
  it("streams the file as a private, never cached, never sniffed download", async () => {
    // arrange
    const bytes = storedBytes("meal ", "plan");

    // act
    const response = createAttachmentResponse(bytes, {
      filename: "Meal plan.pdf",
      mimeType: "application/pdf",
    });

    // assert
    expect(response.status).toBe(200);
    expect(headersOf(response)).toEqual({
      "cache-control": "private, no-store",
      "content-disposition":
        "attachment; filename=\"Meal plan.pdf\"; filename*=UTF-8''Meal%20plan.pdf",
      "content-type": "application/pdf",
      "x-content-type-options": "nosniff",
    });
    await expect(response.text()).resolves.toBe("meal plan");
  });

  it("declares the file's length when it is known", () => {
    // arrange
    const bytes = storedBytes("meal plan");

    // act
    const response = createAttachmentResponse(bytes, {
      byteLength: 9,
      filename: "plan.pdf",
      mimeType: "application/pdf",
    });

    // assert
    expect(response.headers.get("Content-Length")).toBe("9");
    expect(response.headers.has("Content-Security-Policy")).toBe(false);
  });

  it("drops quotes and line breaks from the plain name and keeps them encoded in the exact one", () => {
    // arrange
    const filename = 'My "best"\r\nplan.pdf';

    // act
    const disposition = dispositionFor(filename);

    // assert
    expect(disposition).toBe(
      "attachment; filename=\"My bestplan.pdf\"; filename*=UTF-8''My%20%22best%22%0D%0Aplan.pdf",
    );
  });

  it("replaces non-ASCII letters in the plain name and keeps them in the exact one", () => {
    // arrange
    const filename = "Plan d’été.pdf";

    // act
    const disposition = dispositionFor(filename);

    // assert
    expect(disposition).toBe(
      "attachment; filename=\"Plan d__t_.pdf\"; filename*=UTF-8''Plan%20d%E2%80%99%C3%A9t%C3%A9.pdf",
    );
  });

  it.each([
    { filename: "../../etc/passwd", offered: "passwd" },
    { filename: "uploads/clients/plan.pdf", offered: "plan.pdf" },
  ])("offers only the last segment of $filename", ({ filename, offered }) => {
    // arrange
    const expected = `attachment; filename="${offered}"; filename*=UTF-8''${offered}`;

    // act
    const disposition = dispositionFor(filename);

    // assert
    expect(disposition).toBe(expected);
  });
});

describe("createSandboxedAttachmentResponse", () => {
  it("adds a sandbox so an opened download can run nothing", async () => {
    // arrange
    const bytes = storedBytes("PK");

    // act
    const response = createSandboxedAttachmentResponse(bytes, {
      byteLength: 2,
      filename: "Recipes.docx",
      mimeType:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });

    // assert
    expect(headersOf(response)).toEqual({
      "cache-control": "private, no-store",
      "content-disposition":
        "attachment; filename=\"Recipes.docx\"; filename*=UTF-8''Recipes.docx",
      "content-length": "2",
      "content-security-policy": "sandbox; default-src 'none'",
      "content-type":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "x-content-type-options": "nosniff",
    });
    await expect(response.text()).resolves.toBe("PK");
  });
});

describe("createPrivateInlineFileResponse", () => {
  it("answers the bytes inline, private, never cached, sniffed or scripted", async () => {
    // arrange
    const bytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);

    // act
    const response = createPrivateInlineFileResponse(bytes, "image/jpeg");

    // assert
    expect(response.status).toBe(200);
    expect(headersOf(response)).toEqual({
      "cache-control": "private, no-store",
      "content-length": "4",
      "content-security-policy": "sandbox; default-src 'none'",
      "content-type": "image/jpeg",
      "x-content-type-options": "nosniff",
    });
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(bytes);
  });
});
