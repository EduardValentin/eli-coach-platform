import type { AssessmentCallSnapshot } from "../assessment-call";

export interface AssessmentCallReader {
  findById(id: string): Promise<AssessmentCallSnapshot | null>;
}
