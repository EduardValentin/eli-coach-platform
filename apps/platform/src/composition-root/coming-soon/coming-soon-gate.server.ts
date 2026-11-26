import { data, type MiddlewareFunction } from "react-router";

import {
  CLERK_WEBHOOKS_API_PATH,
  CLIENT_PORTAL_PATH,
  COACH_PORTAL_PATH,
} from "~/bounded-contexts/access/public/paths";
import {
  STORE_MANAGEMENT_API_PATH,
  STRIPE_WEBHOOKS_API_PATH,
} from "~/bounded-contexts/sales/public/paths";
import { COMING_SOON_MARKER } from "~/shared/http/coming-soon-marker";

import type { ComingSoonMode } from "./config.server";

const READYZ_PATH = "/readyz";
const API_PATH_PREFIX = "/api/";

// Each open route keeps its own authentication; the gate only stops answering
// for it.
const OPEN_PATTERNS: ReadonlySet<string> = new Set([
  READYZ_PATH,
  `${CLIENT_PORTAL_PATH}${READYZ_PATH}`,
  `${COACH_PORTAL_PATH}${READYZ_PATH}`,
  CLERK_WEBHOOKS_API_PATH,
  STRIPE_WEBHOOKS_API_PATH,
]);
const OPEN_PATTERN_PREFIXES = [`${STORE_MANAGEMENT_API_PATH}/`] as const;

const PAGE_METHODS: ReadonlySet<string> = new Set(["GET", "HEAD"]);
const FILE_EXTENSION = /\.[A-Za-z0-9]+$/;
// No route names this URL, so only the URL can say it is not a page. Reading
// it here can only turn a 200 into a 404.
const CATCH_ALL_PATTERN = "/*";
const NON_PAGE_URL_PATH = /\/api\/|\.[A-Za-z0-9]+$/;
const SINGLE_FETCH_SUFFIX = ".data";

type MiddlewareArgs = Parameters<MiddlewareFunction<Response>>[0];

export class ComingSoonGate {
  constructor(private readonly mode: ComingSoonMode) {}

  readonly noIndex: MiddlewareFunction<Response> = async (_args, next) => {
    const response = await next();

    if (this.mode === "on") {
      response.headers.set("X-Robots-Tag", "noindex");
    }

    return response;
  };

  readonly blockUnlessOpen: MiddlewareFunction<Response> = (args, next) => {
    if (this.mode === "off" || this.isOpen(args.pattern)) {
      return next();
    }

    if (this.isPageRequest(args)) {
      throw data(COMING_SOON_MARKER, { status: 200 });
    }

    return new Response("Not found", { status: 404 });
  };

  private isOpen(pattern: string): boolean {
    const path = this.routePath(pattern);

    return (
      OPEN_PATTERNS.has(path) ||
      OPEN_PATTERN_PREFIXES.some((prefix) => path.startsWith(prefix))
    );
  }

  private isPageRequest({ pattern, request }: MiddlewareArgs): boolean {
    const routePath = this.routePath(pattern);
    const { pathname } = new URL(request.url);

    return (
      PAGE_METHODS.has(request.method) &&
      !routePath.startsWith(API_PATH_PREFIX) &&
      !FILE_EXTENSION.test(routePath) &&
      !pathname.endsWith(SINGLE_FETCH_SUFFIX) &&
      !(routePath === CATCH_ALL_PATTERN && NON_PAGE_URL_PATH.test(pathname))
    );
  }

  private routePath(pattern: string): string {
    return pattern.startsWith("/") ? pattern : `/${pattern}`;
  }
}
