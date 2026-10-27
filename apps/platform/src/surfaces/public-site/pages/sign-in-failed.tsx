import { buildRedirectPath } from "~/shared/http/base-path";
import {
  useLoaderData,
  type LoaderFunctionArgs,
  type MetaFunction,
} from "react-router";

import { accountsContext } from "~/bounded-contexts/access/accounts/adapters/inbound/http/context.server";
import { SignInFailedPage } from "~/bounded-contexts/access/accounts/ui/public/sign-in-failed-page";
import { STORE_PATH } from "~/bounded-contexts/sales/public/paths";

export type SignInFailedLoaderData = {
  storePath: string;
};

export function loader(args: LoaderFunctionArgs): SignInFailedLoaderData {
  const { appBasePath } = args.context.get(accountsContext).portal;

  return {
    storePath: buildRedirectPath(appBasePath, STORE_PATH),
  };
}

export const meta: MetaFunction = () => [
  { title: "Sign-in failed | Evoa" },
  {
    name: "description",
    content:
      "Your account couldn't be set up, so we signed you out again. Give it another go.",
  },
];

export default function SignInFailedRoute() {
  const { storePath } = useLoaderData<typeof loader>();

  return <SignInFailedPage continuePath={storePath} />;
}
