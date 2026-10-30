import type { MiddlewareFunction } from "react-router";

import type { PlatformContainer } from "~/composition-root/container.server";
import { platformContext } from "~/composition-root/guards/platform-context.server";
import { runtimeConfigContext } from "~/composition-root/guards/runtime-config-context.server";

type MiddlewareArgs = Parameters<MiddlewareFunction<Response>>[0];
type MiddlewareNext = Parameters<MiddlewareFunction<Response>>[1];

export function createBoundedContextMiddleware(
  getContainer: () => PlatformContainer,
): MiddlewareFunction<Response> {
  return async function provideBoundedContexts(args, next) {
    const container = getContainer();

    args.context.set(platformContext, {
      appMetadataController: container.platform.appMetadataController,
      readyzController: container.platform.readyzController,
    });
    args.context.set(runtimeConfigContext, {
      appBasePath: container.platform.appBasePath,
      botDetection: container.platform.botDetection,
    });

    return runInOrder(
      [
        container.operations.middleware,
        container.access.middleware,
        container.scheduling.middleware,
        container.clients.middleware,
        container.programs.middleware,
        container.sales.middleware,
      ],
      args,
      next,
    );
  };
}

async function runInOrder(
  middlewares: readonly MiddlewareFunction<Response>[],
  args: MiddlewareArgs,
  next: MiddlewareNext,
): Promise<Response> {
  const [first, ...rest] = middlewares;

  if (first === undefined) {
    return next();
  }

  let downstream: Promise<Response> | undefined;
  const proceed = () => (downstream ??= runInOrder(rest, args, next));
  const response = await first(args, proceed);

  return response ?? proceed();
}
