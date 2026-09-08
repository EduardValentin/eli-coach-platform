import type { LoaderFunctionArgs } from "react-router";

import { requireSignedInAccount } from "~/features/accounts/server/require-account.server";
import { storeLibraryResponseSchema } from "~/features/store/contracts/store";
import type { LibraryContent } from "~/features/store/ui/public/library-view";
import { getPlatformContainer } from "~/server/container.server";
import { getRuntimeEnvironment } from "~/server/runtime-environment.server";

// The Library is the one public-shell page that needs an account, so the guard
// runs here rather than as shell middleware: every other page under this
// layout is open to anyone.
export async function loader(
  args: LoaderFunctionArgs,
): Promise<LibraryContent> {
  const environment = getRuntimeEnvironment();

  requireSignedInAccount(args, {
    publicAppUrl: environment.PUBLIC_APP_URL,
    signInUrl: environment.CLERK_SIGN_IN_URL,
  });

  const response =
    await getPlatformContainer().storeLibraryController.getOwnedProducts(args);

  // A Library that cannot be read is a state of the page, not an error page:
  // the visitor keeps her place and the card offers her the retry. Anything
  // else — the 401 the guard above has already made unreachable included — is
  // not this page's to render.
  if (!response.ok && response.status !== 503) {
    throw response;
  }

  const library = storeLibraryResponseSchema.parse(await response.json());

  return library.success
    ? { products: library.products, status: "loaded" }
    : { status: "unavailable" };
}
