import type { Program } from "./program";

export type ProgramAddition = "added" | "client-has-program";

export interface ProgramStorePort {
  findByClientId(clientId: string): Promise<Program | null>;
  add(program: Program): Promise<ProgramAddition>;
}
