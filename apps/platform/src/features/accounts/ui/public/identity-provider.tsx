import { joinBasePath } from "@eli-coach-platform/config";
import { ClerkProvider } from "@clerk/react";
import type { PropsWithChildren } from "react";

import { useIdentityConfigQuery } from "./identity-config-query";

const SIGNED_OUT_DESTINATION = joinBasePath(import.meta.env.BASE_URL, "/store");

/**
 * The key arrives over HTTP rather than through the bundle so that a build
 * carries no identity configuration and one artifact serves every environment.
 * The provider still mounts before it resolves, because the hooks beneath it
 * throw when unwrapped; without a key they simply report "not loaded".
 */
export function IdentityProvider({ children }: PropsWithChildren) {
  const publishableKey = useIdentityConfigQuery().data?.publishableKey;

  return (
    <ClerkProvider
      afterSignOutUrl={SIGNED_OUT_DESTINATION}
      publishableKey={publishableKey ?? ""}
    >
      {children}
    </ClerkProvider>
  );
}
