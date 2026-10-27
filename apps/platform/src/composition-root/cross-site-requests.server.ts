import type { MiddlewareFunction } from "react-router";

const MUTATING_METHODS: ReadonlySet<string> = new Set([
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
]);
const REFUSED_FETCH_SITES: ReadonlySet<string> = new Set([
  "cross-site",
  "same-site",
]);

export const refuseCrossSiteMutations: MiddlewareFunction<Response> = (
  { request },
  next,
) => {
  if (MUTATING_METHODS.has(request.method) && isFromAnotherSite(request)) {
    return new Response("Cross-site request refused.", { status: 403 });
  }

  return next();
};

function isFromAnotherSite(request: Request): boolean {
  const fetchSite = request.headers.get("Sec-Fetch-Site");

  if (fetchSite !== null) return REFUSED_FETCH_SITES.has(fetchSite);

  const origin = request.headers.get("Origin");

  if (origin === null) return false;

  const originHost = URL.canParse(origin) ? new URL(origin).host : null;

  return originHost !== request.headers.get("Host");
}
