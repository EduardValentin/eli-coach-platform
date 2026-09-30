// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { MeasurementRow } from "~/features/client-profile/contracts/measurements";
import { progressPhotoPath } from "~/features/client-profile/contracts/paths";

import { PhotoViewDialog } from "./photo-view-dialog";

type MeasurementPhoto = MeasurementRow["photos"][number];

const FRONT: MeasurementPhoto = {
  id: "0f1e2d3c-4b5a-4968-8776-655443322110",
  view: "front",
};

const BACK: MeasurementPhoto = {
  id: "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d",
  view: "back",
};

const ENTRY: MeasurementRow = {
  id: "8a7b6c5d-4e3f-4a1b-9c8d-7e6f5a4b3c2d",
  recordedAt: "2026-09-29T08:00:00.000Z",
  weightKg: 66.1,
  waistCm: 74,
  hipsCm: null,
  thighCm: null,
  armCm: null,
  photos: [FRONT, BACK],
};

afterEach(() => {
  cleanup();
});

function withoutPhoto(
  row: MeasurementRow,
  removed: MeasurementPhoto,
): MeasurementRow {
  return {
    ...row,
    photos: row.photos.filter((photo) => photo.id !== removed.id),
  };
}

function ClientPhotoView(props: {
  onRemovePhoto: (photo: MeasurementPhoto) => void;
}) {
  const [row, setRow] = useState(ENTRY);
  const [open, setOpen] = useState(false);

  return (
    <>
      <button onClick={() => setOpen(true)} type="button">
        View photos
      </button>
      <PhotoViewDialog
        onClose={() => setOpen(false)}
        row={open ? row : undefined}
        viewer={{
          role: "client",
          onRemovePhoto: async (photo) => {
            props.onRemovePhoto(photo);
            setRow((current) => withoutPhoto(current, photo));
          },
        }}
      />
    </>
  );
}

async function openClientView() {
  const user = userEvent.setup();
  const onRemovePhoto = vi.fn();
  render(<ClientPhotoView onRemovePhoto={onRemovePhoto} />);

  await user.click(screen.getByRole("button", { name: "View photos" }));

  return {
    dialog: screen.getByRole("dialog", { name: "Photos from 29 September" }),
    onRemovePhoto,
    user,
  };
}

describe("the photo view she opens", () => {
  it("shows the entry's front, side and back together under its date", async () => {
    // arrange, act
    const { dialog } = await openClientView();

    // assert
    expect(dialog).toHaveAccessibleDescription(
      "Only you and your coach can see these photos.",
    );
    expect(
      within(dialog).getByRole("img", { name: "Front photo" }),
    ).toHaveAttribute("src", progressPhotoPath(FRONT.id));
    expect(
      within(dialog).getByRole("img", { name: "Back photo" }),
    ).toHaveAttribute("src", progressPhotoPath(BACK.id));
    expect(within(dialog).getByText("No side photo")).toBeInTheDocument();
    expect(
      within(dialog)
        .getAllByRole("listitem")
        .map((slot) => within(slot).getByRole("figure").textContent),
    ).toEqual([
      expect.stringContaining("Front"),
      expect.stringContaining("Side"),
      expect.stringContaining("Back"),
    ]);
  });

  it("offers Remove only on the views that have a photo", async () => {
    // arrange, act
    const { dialog } = await openClientView();

    // assert
    expect(
      within(dialog)
        .getAllByRole("button", { name: /^Remove/ })
        .map((button) => button.getAttribute("aria-label")),
    ).toEqual(["Remove front photo", "Remove back photo"]);
  });

  it("asks before removing a photo", async () => {
    // arrange
    const { user } = await openClientView();

    // act
    await user.click(
      screen.getByRole("button", { name: "Remove front photo" }),
    );

    // assert
    const confirmation = screen.getByRole("dialog", {
      name: "Remove this photo?",
    });
    expect(confirmation).toHaveAccessibleDescription(
      "It is deleted for you and your coach. Your measurements stay.",
    );
    expect(
      within(confirmation).getByRole("button", { name: "Keep" }),
    ).toBeInTheDocument();
    expect(
      within(confirmation).getByRole("button", { name: "Remove" }),
    ).toBeInTheDocument();
  });

  it("keeps the photo and the photo view when she changes her mind", async () => {
    // arrange
    const { onRemovePhoto, user } = await openClientView();
    await user.click(screen.getByRole("button", { name: "Remove back photo" }));

    // act
    await user.click(screen.getByRole("button", { name: "Keep" }));

    // assert
    expect(
      screen.queryByRole("dialog", { name: "Remove this photo?" }),
    ).not.toBeInTheDocument();
    expect(onRemovePhoto).not.toHaveBeenCalled();
    expect(
      screen.getByRole("dialog", { name: "Photos from 29 September" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Back photo" })).toBeInTheDocument();
  });

  it("removes the photo once she confirms and shows its slot empty", async () => {
    // arrange
    const { dialog, onRemovePhoto, user } = await openClientView();
    await user.click(
      screen.getByRole("button", { name: "Remove front photo" }),
    );

    // act
    await user.click(screen.getByRole("button", { name: "Remove" }));

    // assert
    expect(onRemovePhoto).toHaveBeenCalledWith(FRONT);
    expect(
      screen.queryByRole("dialog", { name: "Remove this photo?" }),
    ).not.toBeInTheDocument();
    expect(within(dialog).getByText("No front photo")).toBeInTheDocument();
    expect(
      within(dialog).queryByRole("button", { name: "Remove front photo" }),
    ).not.toBeInTheDocument();
    await waitFor(() => expect(dialog).toHaveFocus());
  });

  it("closes from its Close button", async () => {
    // arrange
    const { dialog, user } = await openClientView();

    // act
    await user.click(
      within(dialog).getAllByRole("button", { name: "Close" })[0],
    );

    // assert
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "View photos" })).toHaveFocus();
  });

  it("closes on Escape and hands focus back to the action that opened it", async () => {
    // arrange
    const { user } = await openClientView();

    // act
    await user.keyboard("{Escape}");

    // assert
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "View photos" })).toHaveFocus();
  });
});
