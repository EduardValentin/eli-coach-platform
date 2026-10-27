import type {
  ActionFunctionArgs,
  ClientActionFunction,
  ClientActionFunctionArgs,
  ClientLoaderFunction,
  ClientLoaderFunctionArgs,
  LoaderFunctionArgs,
} from "react-router";

const NO_CONTENT = 204;
const FIRST_ERROR_STATUS = 400;

function wasThrownByTheServer(response: Response): boolean {
  const isJson =
    response.headers.get("Content-Type")?.includes("application/json") ?? false;

  return response.status >= FIRST_ERROR_STATUS && !isJson;
}

async function serverAnswer(request: Request): Promise<unknown> {
  const response = await fetch(request);

  if (wasThrownByTheServer(response)) throw response;
  if (response.status === NO_CONTENT) return undefined;

  return response.json();
}

export function frameworkModeAction(clientAction: ClientActionFunction) {
  return (args: ActionFunctionArgs) =>
    clientAction({
      ...args,
      serverAction: (() =>
        serverAnswer(args.request)) as ClientActionFunctionArgs["serverAction"],
    });
}

export function frameworkModeLoader(clientLoader: ClientLoaderFunction) {
  return (args: LoaderFunctionArgs) =>
    clientLoader({
      ...args,
      serverLoader: (() =>
        serverAnswer(args.request)) as ClientLoaderFunctionArgs["serverLoader"],
    });
}
