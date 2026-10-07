import {
  resourceFileKindOf,
  type ResourceFileFormat,
  type ResourceFileKind,
} from "./resource-file-kind";
import { detectResourceFileFormat } from "./resource-file-signature";

export const MAX_RESOURCE_FILE_BYTES = 25 * 1024 * 1024;
export const MAX_RESOURCE_PAGES = 50;

export type ResourceRefusal =
  "unsupported-type" | "too-large" | "too-many-pages" | "unreadable";

export type ResourceFileJudgement =
  | { status: "accepted"; format: ResourceFileFormat; kind: ResourceFileKind }
  | {
      status: "refused";
      refusal: Extract<ResourceRefusal, "unsupported-type" | "too-large">;
    };

export type ResourcePageCountJudgement =
  | { status: "accepted" }
  | {
      status: "refused";
      refusal: Extract<ResourceRefusal, "too-many-pages" | "unreadable">;
    };

export class ResourceFileIntake {
  private constructor() {}

  static judge(bytes: Uint8Array): ResourceFileJudgement {
    if (bytes.byteLength > MAX_RESOURCE_FILE_BYTES) {
      return { status: "refused", refusal: "too-large" };
    }

    const format = detectResourceFileFormat(bytes);

    if (!format) return { status: "refused", refusal: "unsupported-type" };

    return { status: "accepted", format, kind: resourceFileKindOf(format) };
  }

  static judgePageCount(pageCount: number): ResourcePageCountJudgement {
    if (pageCount < 1) return { status: "refused", refusal: "unreadable" };
    if (pageCount > MAX_RESOURCE_PAGES) {
      return { status: "refused", refusal: "too-many-pages" };
    }

    return { status: "accepted" };
  }
}
