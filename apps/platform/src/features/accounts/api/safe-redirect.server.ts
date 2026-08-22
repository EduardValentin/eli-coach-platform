export const STORE_PATH = "/store";

const FIRST_PRINTABLE_CHARACTER_CODE = 0x20;
const DELETE_CHARACTER_CODE = 0x7f;

/**
 * The destination arrives from the query string, so it is attacker-controlled.
 * Only a same-origin absolute path survives: anything that could name another
 * host, change scheme, or smuggle a header falls back to the Store.
 */
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
