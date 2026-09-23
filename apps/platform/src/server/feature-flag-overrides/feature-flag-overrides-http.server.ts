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

type ParsedOverrides = {
  overrides: FeatureFlagSet;
  queryTouched: boolean;
};

export function createFeatureFlagOverrideMiddleware(options: {
  appBasePath: string;
}): MiddlewareFunction<Response> {
  return async function applyFeatureFlagOverrides({ request }, next) {
    const parsed = parseOverrides(request);

    if (parsed instanceof Response) {
      return parsed;
    }

    const response = await runWithFeatureFlagOverrides(parsed.overrides, next);

    if (parsed.queryTouched || Object.keys(parsed.overrides).length > 0) {
      response.headers.set("Cache-Control", "private, no-store");
    }

    if (parsed.queryTouched) {
      const cookie = serializeOverridesCookie({
        appBasePath: options.appBasePath,
        overrides: parsed.overrides,
      });
      response.headers.append("Set-Cookie", cookie);
    }

    return response;
  };
}

function parseOverrides(request: Request): ParsedOverrides | Response {
  const overrides = readOverridesCookie(request.headers.get("Cookie"));
  let queryTouched = false;

  for (const [parameter, value] of new URL(request.url).searchParams) {
    if (!parameter.startsWith(QUERY_PREFIX)) {
      continue;
    }

    queryTouched = true;
    const name = parameter.slice(QUERY_PREFIX.length);

    if (!OVERRIDABLE_FLAGS.has(name)) {
      return invalidOverrideResponse(
        `Unknown feature flag: ${name || "(empty)"}.`,
      );
    }

    if (value === "default") {
      delete overrides[name];
      continue;
    }

    if (value !== "true" && value !== "false") {
      return invalidOverrideResponse(
        `Invalid feature flag override for ${name}; use true, false, or default.`,
      );
    }

    overrides[name] = value === "true";
  }

  return { overrides, queryTouched };
}

function invalidOverrideResponse(message: string): Response {
  return new Response(message, {
    status: 400,
    headers: { "Cache-Control": "private, no-store" },
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

function serializeOverridesCookie(options: {
  appBasePath: string;
  overrides: Readonly<FeatureFlagSet>;
}): string {
  const attributes = [
    `${COOKIE_NAME}=${encodeURIComponent(JSON.stringify(options.overrides))}`,
    `Path=${normalizeBasePath(options.appBasePath)}`,
    "HttpOnly",
    "SameSite=Lax",
  ];

  if (Object.keys(options.overrides).length === 0) {
    attributes.push("Max-Age=0");
  }

  return attributes.join("; ");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
