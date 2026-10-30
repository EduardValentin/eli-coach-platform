import { describe, expect, it } from "vitest";

import {
  RESOURCE_UPLOAD_PARTS,
  receivedResourceUploadOf,
} from "./resource-upload-parts";

describe("receivedResourceUploadOf", () => {
  it("reads the file under its original name with the title and description she typed", async () => {
    // arrange
    const form = new FormData();
    form.set(
      RESOURCE_UPLOAD_PARTS.file,
      new File([new Uint8Array([37, 80, 68, 70, 45])], "Meal plan.pdf", {
        type: "application/pdf",
      }),
    );
    form.set(RESOURCE_UPLOAD_PARTS.title, "Meal plan");
    form.set(RESOURCE_UPLOAD_PARTS.description, "Week one");
    form.append(RESOURCE_UPLOAD_PARTS.tags, "Meals");
    form.append(RESOURCE_UPLOAD_PARTS.tags, "Week one");

    // act
    const upload = await receivedResourceUploadOf(form);

    // assert
    expect(upload).toEqual({
      details: {
        title: "Meal plan",
        description: "Week one",
        tags: ["Meals", "Week one"],
      },
      file: {
        originalName: "Meal plan.pdf",
        bytes: new Uint8Array([37, 80, 68, 70, 45]),
      },
    });
  });

  it("reads an absent or non-text title and description as empty and no tags", async () => {
    // arrange
    const form = new FormData();
    form.set(RESOURCE_UPLOAD_PARTS.file, new File(["x"], "notes.docx"));
    form.set(RESOURCE_UPLOAD_PARTS.title, new File(["t"], "title.txt"));

    // act
    const upload = await receivedResourceUploadOf(form);

    // assert
    expect(upload?.details).toEqual({ title: "", description: "", tags: [] });
  });

  it("reads only the tags sent as text, in the order she chose them", async () => {
    // arrange
    const form = new FormData();
    form.set(RESOURCE_UPLOAD_PARTS.file, new File(["x"], "notes.docx"));
    form.append(RESOURCE_UPLOAD_PARTS.tags, "Week one");
    form.append(RESOURCE_UPLOAD_PARTS.tags, new File(["t"], "tag.txt"));
    form.append(RESOURCE_UPLOAD_PARTS.tags, "Meals");

    // act
    const upload = await receivedResourceUploadOf(form);

    // assert
    expect(upload?.details.tags).toEqual(["Week one", "Meals"]);
  });

  it("reads nothing when no file was sent", async () => {
    // arrange
    const form = new FormData();
    form.set(RESOURCE_UPLOAD_PARTS.file, "not a file");
    form.set(RESOURCE_UPLOAD_PARTS.title, "Meal plan");

    // act
    const upload = await receivedResourceUploadOf(form);

    // assert
    expect(upload).toBeNull();
  });
});
