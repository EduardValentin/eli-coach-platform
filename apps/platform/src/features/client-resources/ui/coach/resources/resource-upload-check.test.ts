import { describe, expect, it } from "vitest";

import {
  checkResourceUpload,
  RESOURCE_UPLOAD_ACCEPT,
  titleFromFileName,
} from "./resource-upload-check";

const MEGABYTE = 1024 * 1024;

describe("titleFromFileName", () => {
  it.each([
    {
      fileName: "glute-activation-warm-up.pdf",
      title: "Glute activation warm up",
    },
    { fileName: "weekly_macro__tracker.xlsx", title: "Weekly macro tracker" },
    { fileName: "plate.portions.v2.png", title: "Plate portions v2" },
    { fileName: ".hidden", title: "Hidden" },
    { fileName: "notes", title: "Notes" },
  ])("suggests “$title” for $fileName", ({ fileName, title }) => {
    // arrange, act
    const suggested = titleFromFileName(fileName);

    // assert
    expect(suggested).toBe(title);
  });
});

describe("checkResourceUpload", () => {
  it.each([
    { name: "plan.PDF", kind: "pdf" },
    { name: "notes.doc", kind: "word" },
    { name: "notes.docx", kind: "word" },
    { name: "notes.odt", kind: "word" },
    { name: "tracker.xls", kind: "excel" },
    { name: "tracker.xlsx", kind: "excel" },
    { name: "tracker.ods", kind: "excel" },
    { name: "photo.jpg", kind: "image" },
    { name: "photo.jpeg", kind: "image" },
    { name: "photo.png", kind: "image" },
    { name: "photo.webp", kind: "image" },
  ])("accepts $name as $kind", ({ name, kind }) => {
    // arrange, act
    const check = checkResourceUpload({ name, size: MEGABYTE });

    // assert
    expect(check).toEqual({ accepted: true, kind });
  });

  it("refuses a file type it cannot show or keep", () => {
    // arrange, act
    const check = checkResourceUpload({ name: "slides.pptx", size: MEGABYTE });

    // assert
    expect(check).toEqual({ accepted: false, refusal: "unsupported-type" });
  });

  it.each(["x.constructor", "x.toString", "x.__proto__"])(
    "refuses %s, whose extension names an object property",
    (name) => {
      // arrange, act
      const check = checkResourceUpload({ name, size: MEGABYTE });

      // assert
      expect(check).toEqual({ accepted: false, refusal: "unsupported-type" });
    },
  );

  it("refuses a file over 25 MB and keeps one of exactly 25 MB", () => {
    // arrange, act
    const checks = [
      checkResourceUpload({ name: "plan.pdf", size: 25 * MEGABYTE + 1 }),
      checkResourceUpload({ name: "plan.pdf", size: 25 * MEGABYTE }),
    ];

    // assert
    expect(checks).toEqual([
      { accepted: false, refusal: "too-large" },
      { accepted: true, kind: "pdf" },
    ]);
  });

  it("offers the picker the accepted extensions in the prototype's order", () => {
    // arrange, act
    const accept = RESOURCE_UPLOAD_ACCEPT;

    // assert
    expect(accept).toBe(
      ".pdf,.doc,.docx,.odt,.xls,.xlsx,.ods,.jpg,.jpeg,.png,.webp",
    );
  });
});
