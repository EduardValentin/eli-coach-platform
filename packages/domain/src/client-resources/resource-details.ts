import { ResourceTags, type ResourceTagSnapshot } from "./resource-tags";

export const MAX_RESOURCE_TITLE_LENGTH = 120;
export const MAX_RESOURCE_DESCRIPTION_LENGTH = 2_000;

type ResourceText = { title: string; description: string };

export type ResourceDetailsInput = ResourceText & { tags: string[] };

export type ResourceDetailsSnapshot = ResourceText & {
  tags: ResourceTagSnapshot[];
};

export type ResourceDetailsProblems = {
  title?: "missing" | "too-long";
  description?: "too-long";
  tags?: "too-long";
};

export type ResourceDetailsResult =
  | { status: "valid"; details: ResourceDetails }
  | { status: "invalid"; problems: ResourceDetailsProblems };

export class ResourceDetails {
  private constructor(
    private readonly text: ResourceText,
    private readonly tags: ResourceTags,
  ) {}

  static from(input: ResourceDetailsInput): ResourceDetailsResult {
    const title = input.title.trim();
    const description = input.description.trim();
    const tags = ResourceTags.from(input.tags);
    const problems: ResourceDetailsProblems = {
      ...problemsOf({ title, description }),
      ...(tags.status === "invalid" && { tags: tags.problem }),
    };

    if (tags.status === "invalid" || Object.keys(problems).length > 0) {
      return { status: "invalid", problems };
    }

    return {
      status: "valid",
      details: new ResourceDetails({ title, description }, tags.tags),
    };
  }

  withStoredSpellings(
    vocabulary: readonly ResourceTagSnapshot[],
  ): ResourceDetails {
    return new ResourceDetails(
      this.text,
      this.tags.withStoredSpellings(vocabulary),
    );
  }

  toSnapshot(): ResourceDetailsSnapshot {
    return { ...this.text, tags: this.tags.toSnapshot() };
  }
}

function problemsOf(trimmed: ResourceText): ResourceDetailsProblems {
  const problems: ResourceDetailsProblems = {};

  if (trimmed.title.length === 0) problems.title = "missing";
  if (trimmed.title.length > MAX_RESOURCE_TITLE_LENGTH) {
    problems.title = "too-long";
  }
  if (trimmed.description.length > MAX_RESOURCE_DESCRIPTION_LENGTH) {
    problems.description = "too-long";
  }

  return problems;
}
