import type { Slot } from "./vocabulary";

/** What the library panel adds to when the coach opened it from a place in a session. */
export type LibraryTarget =
  | { kind: "slot"; sessionId: string; slot: Slot }
  | { kind: "warm-up"; sessionId: string }
  | { kind: "cool-down"; sessionId: string }
  | { kind: "substitution"; sessionId: string; rowId: string };
