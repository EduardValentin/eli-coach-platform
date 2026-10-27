// @vitest-environment happy-dom

import { describe, expect, it } from "vitest";

import { createFocusRestoreTracker } from "./cart-focus";

describe("createFocusRestoreTracker", () => {
  it("returns the remembered opener when connected", () => {
    // arrange
    const tracker = createFocusRestoreTracker();
    const opener = document.createElement("button");
    document.body.append(opener);
    tracker.rememberOpener(opener);

    // act
    const target = tracker.take();

    // assert
    expect(target).toBe(opener);

    opener.remove();
  });

  it("returns the persistent control when the opener is not connected", () => {
    // arrange
    const tracker = createFocusRestoreTracker();
    const opener = document.createElement("button");
    tracker.rememberOpener(opener);
    const persistentControl = document.createElement("button");
    document.body.append(persistentControl);
    tracker.setPersistentControl(persistentControl);

    // act
    const target = tracker.take();

    // assert
    expect(target).toBe(persistentControl);

    persistentControl.remove();
  });

  it("returns null when neither the opener nor the persistent control is connected", () => {
    // arrange
    const tracker = createFocusRestoreTracker();
    const opener = document.createElement("button");
    tracker.rememberOpener(opener);
    const persistentControl = document.createElement("button");
    tracker.setPersistentControl(persistentControl);

    // act
    const target = tracker.take();

    // assert
    expect(target).toBeNull();
  });

  it("returns the persistent control on a second take after a take", () => {
    // arrange
    const tracker = createFocusRestoreTracker();
    const opener = document.createElement("button");
    document.body.append(opener);
    tracker.rememberOpener(opener);
    const persistentControl = document.createElement("button");
    document.body.append(persistentControl);
    tracker.setPersistentControl(persistentControl);
    tracker.take();

    // act
    const target = tracker.take();

    // assert
    expect(target).toBe(persistentControl);

    opener.remove();
    persistentControl.remove();
  });
});
