import { afterEach, describe, expect, it, vi } from "vitest";

import { ConsoleLoggerAdapter } from "~/shared/logging/console-logger-adapter.server";

import { ClientProfileIncidentsAdapter } from "./client-profile-incidents-adapter.server";

describe("createClientProfileIncidents", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("logs a saved onboarding draft by client and form only", () => {
    // arrange
    const consoleInfo = vi
      .spyOn(console, "info")
      .mockImplementation(() => undefined);
    const logger = new ClientProfileIncidentsAdapter(
      new ConsoleLoggerAdapter(),
    );

    // act
    logger.onboardingDraftSaved({
      clientId: "7c6c5a52-8f4f-4e5a-a2b7-5c3f6a9c1d22",
      formId: "safety-screening",
    });

    // assert
    expect(consoleInfo).toHaveBeenCalledWith("Client onboarding draft saved.", {
      clientId: "7c6c5a52-8f4f-4e5a-a2b7-5c3f6a9c1d22",
      eventCategory: "client_onboarding_draft_saved",
      formId: "safety-screening",
    });
  });

  it("logs a failed onboarding draft save by client and form only", () => {
    // arrange
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const logger = new ClientProfileIncidentsAdapter(
      new ConsoleLoggerAdapter(),
    );

    // act
    logger.onboardingDraftSaveFailed({
      clientId: "7c6c5a52-8f4f-4e5a-a2b7-5c3f6a9c1d22",
      formId: "measurements",
    });

    // assert
    expect(consoleError).toHaveBeenCalledWith(
      "Client onboarding draft save failed.",
      {
        clientId: "7c6c5a52-8f4f-4e5a-a2b7-5c3f6a9c1d22",
        errorCategory: "client_onboarding_draft_save_failure",
        formId: "measurements",
      },
    );
  });

  it("logs an accepted onboarding submission by client and screening outcome only", () => {
    // arrange
    const consoleInfo = vi
      .spyOn(console, "info")
      .mockImplementation(() => undefined);
    const logger = new ClientProfileIncidentsAdapter(
      new ConsoleLoggerAdapter(),
    );

    // act
    logger.onboardingSubmissionAccepted({
      clientId: "7c6c5a52-8f4f-4e5a-a2b7-5c3f6a9c1d22",
      screeningOutcome: "needs-review",
    });

    // assert
    expect(consoleInfo).toHaveBeenCalledWith(
      "Client onboarding submission accepted.",
      {
        clientId: "7c6c5a52-8f4f-4e5a-a2b7-5c3f6a9c1d22",
        eventCategory: "client_onboarding_submission_accepted",
        screeningOutcome: "needs-review",
      },
    );
  });

  it("logs a refused onboarding submission by client and reason only", () => {
    // arrange
    const consoleWarn = vi
      .spyOn(console, "warn")
      .mockImplementation(() => undefined);
    const logger = new ClientProfileIncidentsAdapter(
      new ConsoleLoggerAdapter(),
    );

    // act
    logger.onboardingSubmissionRefused({
      clientId: "7c6c5a52-8f4f-4e5a-a2b7-5c3f6a9c1d22",
      reason: "invalid",
    });

    // assert
    expect(consoleWarn).toHaveBeenCalledWith(
      "Client onboarding submission refused.",
      {
        clientId: "7c6c5a52-8f4f-4e5a-a2b7-5c3f6a9c1d22",
        eventCategory: "client_onboarding_submission_refused",
        reason: "invalid",
      },
    );
  });

  it("logs a saved measurement entry by client and entry only, never its values", () => {
    // arrange
    const consoleInfo = vi
      .spyOn(console, "info")
      .mockImplementation(() => undefined);
    const logger = new ClientProfileIncidentsAdapter(
      new ConsoleLoggerAdapter(),
    );

    // act
    logger.measurementEntrySaved({ clientId: "client-1", entryId: "entry-1" });

    // assert
    expect(consoleInfo).toHaveBeenCalledWith("Measurement entry saved.", {
      clientId: "client-1",
      entryId: "entry-1",
      eventCategory: "measurement_entry_saved",
    });
  });

  it("logs a stored progress photo by ids, view and byte counts only", () => {
    // arrange
    const consoleInfo = vi
      .spyOn(console, "info")
      .mockImplementation(() => undefined);
    const logger = new ClientProfileIncidentsAdapter(
      new ConsoleLoggerAdapter(),
    );

    // act
    logger.progressPhotoStored({
      clientId: "client-1",
      entryId: "entry-1",
      view: "front",
      receivedBytes: 4_182_000,
      storedBytes: 312_400,
    });

    // assert
    expect(consoleInfo).toHaveBeenCalledWith("Progress photo stored.", {
      clientId: "client-1",
      entryId: "entry-1",
      eventCategory: "progress_photo_stored",
      receivedBytes: 4_182_000,
      storedBytes: 312_400,
      view: "front",
    });
  });

  it("logs a refused progress photo by ids, view, byte count and reason only", () => {
    // arrange
    const consoleWarn = vi
      .spyOn(console, "warn")
      .mockImplementation(() => undefined);
    const logger = new ClientProfileIncidentsAdapter(
      new ConsoleLoggerAdapter(),
    );

    // act
    logger.progressPhotoRefused({
      clientId: "client-1",
      entryId: "entry-1",
      view: "side",
      receivedBytes: 12,
      reason: "rendition-refused",
    });

    // assert
    expect(consoleWarn).toHaveBeenCalledWith("Progress photo refused.", {
      clientId: "client-1",
      entryId: "entry-1",
      eventCategory: "progress_photo_refused",
      reason: "rendition-refused",
      receivedBytes: 12,
      view: "side",
    });
  });

  it("logs a deleted progress photo by ids and view only", () => {
    // arrange
    const consoleInfo = vi
      .spyOn(console, "info")
      .mockImplementation(() => undefined);
    const logger = new ClientProfileIncidentsAdapter(
      new ConsoleLoggerAdapter(),
    );

    // act
    logger.progressPhotoDeleted({
      clientId: "client-1",
      entryId: "entry-1",
      photoId: "photo-1",
      view: "back",
    });

    // assert
    expect(consoleInfo).toHaveBeenCalledWith("Progress photo deleted.", {
      clientId: "client-1",
      entryId: "entry-1",
      eventCategory: "progress_photo_deleted",
      photoId: "photo-1",
      view: "back",
    });
  });

  it("logs an orphaned client avatar file by client and storage key only", () => {
    // arrange
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const logger = new ClientProfileIncidentsAdapter(
      new ConsoleLoggerAdapter(),
    );

    // act
    logger.clientAvatarFileOrphaned({
      clientId: "client-1",
      storageKey: "client-1/avatar/avatar-1.bin",
    });

    // assert
    expect(consoleError).toHaveBeenCalledWith(
      "Client avatar file could not be deleted.",
      {
        clientId: "client-1",
        errorCategory: "client_avatar_file_orphaned",
        storageKey: "client-1/avatar/avatar-1.bin",
      },
    );
  });

  it("logs a refused progress photo request by requester role and photo only", () => {
    // arrange
    const consoleWarn = vi
      .spyOn(console, "warn")
      .mockImplementation(() => undefined);
    const logger = new ClientProfileIncidentsAdapter(
      new ConsoleLoggerAdapter(),
    );

    // act
    logger.progressPhotoAccessRefused({
      requesterRole: "CLIENT",
      photoId: "photo-1",
    });

    // assert
    expect(consoleWarn).toHaveBeenCalledWith("Progress photo access refused.", {
      eventCategory: "progress_photo_access_refused",
      photoId: "photo-1",
      requesterRole: "CLIENT",
    });
  });
});
