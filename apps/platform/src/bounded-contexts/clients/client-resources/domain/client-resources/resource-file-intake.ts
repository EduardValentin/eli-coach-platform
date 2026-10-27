import type { DetectedResourceFile } from "./resource-file-format-detector";
import {
  resourceFileKindOf,
  type ResourceFileFormat,
  type ResourceFileKind,
} from "./resource-file-kind";

export const MAX_RESOURCE_FILE_BYTES = 25 * 1024 * 1024;
export const MAX_RESOURCE_PAGES = 50;

export type ResourceRefusal =
  "unsupported-type" | "too-large" | "too-many-pages" | "unreadable";

type ResourceFileSizeJudgement =
  | { status: "accepted" }
  | { status: "refused"; refusal: Extract<ResourceRefusal, "too-large"> };

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

const ACCEPTED_DETECTED_TYPES: ReadonlyMap<string, ResourceFileFormat> =
  new Map([
    ["pdf", "pdf"],
    ["jpg", "jpeg"],
    ["png", "png"],
    ["webp", "webp"],
    ["docx", "docx"],
    ["xlsx", "xlsx"],
    ["odt", "odt"],
    ["ods", "ods"],
    ["doc", "doc"],
    ["xls", "xls"],
  ]);

const MACRO_PROJECT_ENTRIES = ["word/vbaProject.bin", "xl/vbaProject.bin"];

export class ResourceFileIntake {
  private constructor() {}

  static judgeSize(byteLength: number): ResourceFileSizeJudgement {
    if (byteLength > MAX_RESOURCE_FILE_BYTES) {
      return { status: "refused", refusal: "too-large" };
    }

    return { status: "accepted" };
  }

  static judgeFormat(detected: DetectedResourceFile): ResourceFileJudgement {
    const format = ResourceFileIntake.acceptedFormatOf(detected);

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

  private static acceptedFormatOf(
    detected: DetectedResourceFile,
  ): ResourceFileFormat | null {
    if (detected.type === null) return null;
    if (
      MACRO_PROJECT_ENTRIES.some((entry) =>
        detected.archiveEntries.includes(entry),
      )
    ) {
      return null;
    }

    return ACCEPTED_DETECTED_TYPES.get(detected.type) ?? null;
  }
}
