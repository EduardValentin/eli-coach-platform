import type { MiddlewareFunction } from "react-router";

import type { PlatformContainer } from "~/composition-root/container.server";
import { platformContext } from "~/composition-root/guards/platform-context.server";
import { runtimeConfigContext } from "~/composition-root/guards/runtime-config-context.server";

type MiddlewareArgs = Parameters<MiddlewareFunction<Response>>[0];
type MiddlewareNext = Parameters<MiddlewareFunction<Response>>[1];

export function createFeatureContextMiddleware(
  getContainer: () => PlatformContainer,
): MiddlewareFunction<Response> {
  return async function provideFeatureContexts(args, next) {
    const container = getContainer();

    args.context.set(platformContext, {
      metadata: container.platform.metadata,
      readyz: container.platform.readyz,
    });
    args.context.set(runtimeConfigContext, {
      appBasePath: container.platform.appBasePath,
      botDetection: container.platform.botDetection,
    });

    return runInOrder(
      [
        container.operations.middleware,
        container.legal.middleware,
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
