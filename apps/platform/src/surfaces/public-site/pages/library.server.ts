import type { LoaderFunctionArgs } from "react-router";

import { requireSignedInAccount } from "~/features/accounts/server/require-account.server";
import { storeLibraryResponseSchema } from "~/features/store/contracts/store";
import type { LibraryContent } from "~/features/store/ui/public/library-view";
import { getPlatformContainer } from "~/server/container.server";
import { getRuntimeEnvironment } from "~/server/runtime-environment.server";

const LIBRARY_UNAVAILABLE_STATUS = 503;

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

  const rendersAsUnavailableCard =
    response.status === LIBRARY_UNAVAILABLE_STATUS;

  if (!response.ok && !rendersAsUnavailableCard) {
    throw response;
  }

  const library = storeLibraryResponseSchema.parse(await response.json());

  return library.success
    ? { products: library.products, status: "loaded" }
    : { status: "unavailable" };
}
