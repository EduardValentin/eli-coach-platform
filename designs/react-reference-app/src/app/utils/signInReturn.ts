const SIGN_IN_PATH = '/';
const RETURN_PARAM = 'redirect_url';

type Address = { pathname: string; search: string };

function isAppPath(path: string): boolean {
  return path.startsWith('/') && !path.startsWith('//') && !path.includes('\\');
}

export function signInPathReturningTo({ pathname, search }: Address): string {
  const params = new URLSearchParams({ [RETURN_PARAM]: `${pathname}${search}` });
  return `${SIGN_IN_PATH}?${params}`;
}

export function signInReturnTarget(search: string): string | null {
  const target = new URLSearchParams(search).get(RETURN_PARAM);
  return target !== null && isAppPath(target) ? target : null;
}

export function keepingSignInReturn(path: string, search: string): string {
  const target = signInReturnTarget(search);
  if (target === null) return path;
  return `${path}?${new URLSearchParams({ [RETURN_PARAM]: target })}`;
}
