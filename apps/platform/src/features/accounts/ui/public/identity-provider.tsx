import { joinBasePath } from "@eli-coach-platform/config";
import { ClerkProvider } from "@clerk/react";
import { createContext, use, type PropsWithChildren } from "react";

import { useIdentityConfigQuery } from "./identity-config-query";

const SIGNED_OUT_DESTINATION = joinBasePath(import.meta.env.BASE_URL, "/store");

const IdentityReadyContext = createContext(false);

/**
 * The key arrives over HTTP rather than through the bundle so that a build
 * carries no identity configuration and one artifact serves every environment.
 * Nothing mounts the provider until it resolves: a provider handed its key only
 * after mounting would depend on that key being re-read, which Clerk documents
 * nowhere. Until then the tree renders without one, so anything below must ask
 * `useIdentityReady` before reaching for a Clerk hook.
 */
export function IdentityProvider({ children }: PropsWithChildren) {
  const publishableKey = useIdentityConfigQuery().data?.publishableKey;

  if (!publishableKey) {
    return children;
  }

  return (
    <ClerkProvider
      afterSignOutUrl={SIGNED_OUT_DESTINATION}
      publishableKey={publishableKey}
    >
      <IdentityReadyContext value={true}>{children}</IdentityReadyContext>
    </ClerkProvider>
  );
}

/** Whether a `ClerkProvider` is mounted, and Clerk's hooks may be called. */
export function useIdentityReady(): boolean {
  return use(IdentityReadyContext);
}

export { IdentityReadyContext };
