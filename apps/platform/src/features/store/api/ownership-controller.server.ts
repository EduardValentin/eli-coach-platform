import { getAuth } from "@clerk/react-router/server";
import type {
  StoreOwnershipLinkingService,
  VerifiedEmailDirectory,
} from "@eli-coach-platform/domain";
import type { LoaderFunctionArgs } from "react-router";

// A factory, not an instance: the directory is request-scoped, and injecting
// it is what keeps this feature from importing the accounts feature.
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

  /** Throws nothing: this runs behind a page, and the next load retries. */
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
      // Carries the reason, not just the category: this catch hides every
      // failure the claim has, so without it a broken claim is invisible.
      // Only the message — the error itself can carry the request.
      console.error("Store ownership linking did not complete.", {
        errorCategory: "store_ownership_link_pending",
        reason: error instanceof Error ? error.message : "unknown",
      });
    }
  }
}
