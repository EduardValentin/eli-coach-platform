import type { Program } from "./program";

export type ProgramAddition = "added" | "client-has-program";

export type DraftWrite = { program: Program; expectedUpdatedAt: Date };

export type DraftSaveOutcome = "saved" | "changed-elsewhere";

export interface ProgramStorePort {
  findByClientId(clientId: string): Promise<Program | null>;
  add(program: Program): Promise<ProgramAddition>;
  saveDraft(write: DraftWrite): Promise<DraftSaveOutcome>;
}
