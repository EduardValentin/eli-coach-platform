import { BlockEditing } from "~/bounded-contexts/programs/training-programs/public/program-editing";

export function newBuilderId(): string {
  return crypto.randomUUID();
}

export const blockEditing = new BlockEditing({ newId: newBuilderId });
