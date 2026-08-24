export const STORE_PATH = "/store";

const FIRST_PRINTABLE_CHARACTER_CODE = 0x20;
const DELETE_CHARACTER_CODE = 0x7f;

/** Attacker-controlled input: only a same-origin absolute path survives. */
export function resolveSafeRedirectPath(candidate: string | null): string {
  if (!candidate || !candidate.startsWith("/")) {
    return STORE_PATH;
  }

  if (candidate.startsWith("//") || candidate.startsWith("/\\")) {
    return STORE_PATH;
  }

  if (containsControlCharacter(candidate)) {
    return STORE_PATH;
  }

  return candidate;
}

function containsControlCharacter(value: string): boolean {
  return [...value].some((character) => {
    const code = character.charCodeAt(0);

    return code < FIRST_PRINTABLE_CHARACTER_CODE || code === DELETE_CHARACTER_CODE;
  });
}
