import { target as container } from "./composition-root/container.server";
import { target as platformContext } from "./composition-root/guards/platform-context.server";

export const probe = [container, platformContext];
