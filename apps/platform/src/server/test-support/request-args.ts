import { RouterContextProvider, type ActionFunctionArgs, type LoaderFunctionArgs, type RouterContext } from "react-router";

export type ContextEntry = readonly [RouterContext<unknown>, unknown];

export function contextEntry<T>(key: RouterContext<T>, value: T): ContextEntry {
  return [key as RouterContext<unknown>, value];
}

export function createRequestArgs(options: {
  contexts?: readonly ContextEntry[];
  params?: Record<string, string>;
  request?: Request;
}): LoaderFunctionArgs & ActionFunctionArgs {
  const context = new RouterContextProvider();
  for (const [key, value] of options.contexts ?? []) {
    context.set(key, value);
  }
  return {
    context,
    params: options.params ?? {},
    request: options.request ?? new Request("http://localhost/"),
  } as unknown as LoaderFunctionArgs & ActionFunctionArgs;
}
