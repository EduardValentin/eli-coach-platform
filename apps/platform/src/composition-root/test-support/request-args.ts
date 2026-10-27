import {
  RouterContextProvider,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
  type RouterContext,
} from "react-router";

import { createAccessRequestContext } from "~/bounded-contexts/access/accounts/adapters/inbound/http/portal-access.server";
import {
  accessContext,
  type PortalLinks,
  type ResolvedSession,
} from "~/bounded-contexts/access/public/session";

export type ContextEntry = readonly [RouterContext<unknown>, unknown];

const UNCONFIGURED_PORTAL: PortalLinks = {
  appBasePath: "/",
  publicAppUrl: undefined,
  signInUrl: "",
};

export function contextEntry<T>(key: RouterContext<T>, value: T): ContextEntry {
  return [key as RouterContext<unknown>, value];
}

export function createRequestArgs(options: {
  contexts?: readonly ContextEntry[];
  params?: Record<string, string>;
  portal?: PortalLinks;
  request?: Request;
  session?: ResolvedSession;
}): LoaderFunctionArgs & ActionFunctionArgs {
  const context = new RouterContextProvider();
  const request = options.request ?? new Request("http://localhost/");
  const url = new URL(request.url);
  context.set(
    accessContext,
    createAccessRequestContext(
      options.session ?? { kind: "anonymous" },
      options.portal ?? UNCONFIGURED_PORTAL,
      url,
    ),
  );
  for (const [key, value] of options.contexts ?? []) {
    context.set(key, value);
  }
  return {
    context,
    params: options.params ?? {},
    request,
    url,
  } as unknown as LoaderFunctionArgs & ActionFunctionArgs;
}
