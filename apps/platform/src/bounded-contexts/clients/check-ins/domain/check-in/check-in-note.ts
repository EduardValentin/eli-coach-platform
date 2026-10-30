export const MAX_CHECK_IN_NOTE_LENGTH = 500;

export type CheckInNoteResult =
  { status: "accepted"; note: CheckInNote | null } | { status: "too_long" };

export class CheckInNote {
  private constructor(readonly text: string) {}

  static from(raw: string | null): CheckInNoteResult {
    const text = raw?.trim() ?? "";

    if (text.length > MAX_CHECK_IN_NOTE_LENGTH) {
      return { status: "too_long" };
    }

    return {
      status: "accepted",
      note: text.length === 0 ? null : new CheckInNote(text),
    };
  }
}
