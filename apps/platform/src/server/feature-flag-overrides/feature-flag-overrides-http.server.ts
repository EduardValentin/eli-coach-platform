import type { MiddlewareFunction } from "react-router";

import { normalizeBasePath } from "@eli-coach-platform/config";
import {
  WAITLIST_MODE_FEATURE_FLAG,
  type FeatureFlagSet,
} from "@eli-coach-platform/domain/feature-flag";

import { runWithFeatureFlagOverrides } from "./feature-flag-override-store.server";

const COOKIE_NAME = "__eli_feature_flags";
const QUERY_PREFIX = "ff.";
const OVERRIDABLE_FLAGS = new Set([WAITLIST_MODE_FEATURE_FLAG]);
const UNCACHEABLE = "private, no-store";

type RequestedOverrides = {
  overrides: FeatureFlagSet;
  urlChangedOverrides: boolean;
};

type OverrideRejection = {
  rejection: string;
};

export function createFeatureFlagOverrideMiddleware(options: {
  appBasePath: string;
}): MiddlewareFunction<Response> {
  return async function applyFeatureFlagOverrides({ request }, next) {
    const requested = readRequestedOverrides(request);

    if ("rejection" in requested) {
      return rejectOverrideRequest(requested.rejection);
    }

    const response = await runWithFeatureFlagOverrides(
      requested.overrides,
      next,
    );
    const hasOverrides = Object.keys(requested.overrides).length > 0;

    if (requested.urlChangedOverrides || hasOverrides) {
      response.headers.set("Cache-Control", UNCACHEABLE);
    }

    if (requested.urlChangedOverrides) {
      response.headers.append(
        "Set-Cookie",
        hasOverrides
          ? sessionOverridesCookie({
              appBasePath: options.appBasePath,
              overrides: requested.overrides,
            })
          : clearedOverridesCookie(options.appBasePath),
      );
    }

    return response;
  };
}

function readRequestedOverrides(
  request: Request,
): RequestedOverrides | OverrideRejection {
  const overrides = readOverridesCookie(request.headers.get("Cookie"));
  let urlChangedOverrides = false;

  for (const [parameter, value] of new URL(request.url).searchParams) {
    if (!parameter.startsWith(QUERY_PREFIX)) {
      continue;
    }

    urlChangedOverrides = true;
    const name = parameter.slice(QUERY_PREFIX.length);

    if (!OVERRIDABLE_FLAGS.has(name)) {
      return { rejection: `Unknown feature flag: ${name || "(empty)"}.` };
    }

    if (value === "default") {
      delete overrides[name];
      continue;
    }

    if (value !== "true" && value !== "false") {
      return {
        rejection: `Invalid feature flag override for ${name}; use true, false, or default.`,
      };
    }

    overrides[name] = value === "true";
  }

  return { overrides, urlChangedOverrides };
}

function rejectOverrideRequest(rejection: string): Response {
  return new Response(rejection, {
    status: 400,
    headers: { "Cache-Control": UNCACHEABLE },
  });
}

function readOverridesCookie(cookieHeader: string | null): FeatureFlagSet {
  const encoded = cookieHeader
    ?.split(";")
    .map((cookie) => cookie.trim().split("=", 2))
    .find(([name]) => name === COOKIE_NAME)?.[1];

  if (!encoded) {
    return {};
  }

  const parsed = decodeOverridesCookie(encoded);

  if (!parsed) {
    return {};
  }

  return readAllowlistedOverrides(parsed);
}

function decodeOverridesCookie(
  encoded: string,
): Record<string, unknown> | null {
  try {
    const parsed: unknown = JSON.parse(decodeURIComponent(encoded));

    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function readAllowlistedOverrides(
  values: Record<string, unknown>,
): FeatureFlagSet {
  const overrides: FeatureFlagSet = {};

  for (const [name, value] of Object.entries(values)) {
    if (OVERRIDABLE_FLAGS.has(name) && typeof value === "boolean") {
      overrides[name] = value;
    }
  }

  return overrides;
}

function sessionOverridesCookie(options: {
  appBasePath: string;
  overrides: Readonly<FeatureFlagSet>;
}): string {
  return [
    `${COOKIE_NAME}=${encodeURIComponent(JSON.stringify(options.overrides))}`,
    ...overridesCookieAttributes(options.appBasePath),
  ].join("; ");
}

function clearedOverridesCookie(appBasePath: string): string {
  return [
    `${COOKIE_NAME}=`,
    ...overridesCookieAttributes(appBasePath),
    "Max-Age=0",
  ].join("; ");
}

function overridesCookieAttributes(appBasePath: string): string[] {
  return [`Path=${normalizeBasePath(appBasePath)}`, "HttpOnly", "SameSite=Lax"];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
