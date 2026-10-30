import { buildRedirectPath } from "~/shared/http/base-path";
import {
  useLoaderData,
  type LoaderFunctionArgs,
  type MetaFunction,
} from "react-router";

import { accessContext } from "~/bounded-contexts/access/public/session";
import { SignInFailedPage } from "~/bounded-contexts/access/accounts/ui/public/sign-in-failed-page";
import { STORE_PATH } from "~/bounded-contexts/sales/public/paths";

type SignInFailedLoaderData = {
  storePath: string;
};

export function loader(args: LoaderFunctionArgs): SignInFailedLoaderData {
  const { appBasePath } = args.context.get(accessContext).portal;

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
