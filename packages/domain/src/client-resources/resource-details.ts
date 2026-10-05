export const MAX_RESOURCE_TITLE_LENGTH = 120;
export const MAX_RESOURCE_DESCRIPTION_LENGTH = 2_000;

export type ResourceDetailsSnapshot = { title: string; description: string };

export type ResourceDetailsProblems = {
  title?: "missing" | "too-long";
  description?: "too-long";
};

export type ResourceDetailsResult =
  | { status: "valid"; details: ResourceDetails }
  | { status: "invalid"; problems: ResourceDetailsProblems };

export class ResourceDetails {
  private constructor(private readonly snapshot: ResourceDetailsSnapshot) {}

  static from(input: ResourceDetailsSnapshot): ResourceDetailsResult {
    const title = input.title.trim();
    const description = input.description.trim();
    const problems = problemsOf({ title, description });

    if (Object.keys(problems).length > 0)
      return { status: "invalid", problems };

    return {
      status: "valid",
      details: new ResourceDetails({ title, description }),
    };
  }

  toSnapshot(): ResourceDetailsSnapshot {
    return { ...this.snapshot };
  }
}

function problemsOf(trimmed: ResourceDetailsSnapshot): ResourceDetailsProblems {
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
