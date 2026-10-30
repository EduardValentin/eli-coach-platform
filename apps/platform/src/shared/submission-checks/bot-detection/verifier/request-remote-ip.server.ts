export function resolveRequestRemoteIp(request: Request): string | null {
  const cloudflareIp = request.headers.get("CF-Connecting-IP");

  if (cloudflareIp) {
    return cloudflareIp;
  }

  const forwardedFor = request.headers.get("X-Forwarded-For");

  if (!forwardedFor) {
    return null;
  }

  return forwardedFor.split(",")[0]?.trim() || null;
}
