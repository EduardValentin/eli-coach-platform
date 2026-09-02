import { getAuth } from "@clerk/react-router/server";
import type {
  StoreOwnershipLinkingService,
  VerifiedEmailDirectory,
} from "@eli-coach-platform/domain";
import type { LoaderFunctionArgs } from "react-router";

// The directory is built per request, not injected as one long-lived
// instance, because the identity provider's client resolves the API it talks
// to from the request being served. The factory is what keeps this feature
// from importing the accounts feature to build one: the composition root
// supplies it.
type StoreOwnershipControllerOptions = {
  createVerifiedEmailDirectory: (
    args: LoaderFunctionArgs,
  ) => VerifiedEmailDirectory;
  linkingService: Pick<
    StoreOwnershipLinkingService,
    "linkPriorAcquisitions"
  >;
};

export class StoreOwnershipController {
  constructor(private readonly options: StoreOwnershipControllerOptions) {}

  /**
   * Returns nothing and throws nothing. Linking runs behind a page a signed-in
   * customer asked for, long after authentication finished, so a provider
   * outage or a database failure must cost that page nothing — the next load
   * claims what this one could not.
   */
  async linkPriorAcquisitions(args: LoaderFunctionArgs): Promise<void> {
    try {
      const auth = await getAuth(args);

      if (!auth.userId) {
        return;
      }

      await this.options.linkingService.linkPriorAcquisitions({
        authSubjectId: auth.userId,
        verifiedEmailDirectory:
          this.options.createVerifiedEmailDirectory(args),
      });
    } catch (error) {
      // The reason is carried, not just the category: this catch stands in
      // front of every failure mode the claim has — provider, database and
      // programming error alike — so without it a broken claim is invisible
      // and simply never links anything. Only the message is logged; the
      // error itself can carry the request that produced it.
      console.error("Store ownership linking did not complete.", {
        errorCategory: "store_ownership_link_pending",
        reason: error instanceof Error ? error.message : "unknown",
      });
    }
  }
}
