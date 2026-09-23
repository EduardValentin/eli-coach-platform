export function requireSessionCookie(response: Response): string {
  const cookie = response.headers.get("Set-Cookie")?.split(";", 1)[0];

  if (!cookie) {
    throw new Error("Expected the response to set a session cookie.");
  }

  return cookie;
}
