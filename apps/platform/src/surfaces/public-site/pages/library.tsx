import { type MetaFunction, useLoaderData, useRevalidator } from "react-router";

import { LibraryView } from "~/features/store/ui/public/library-view";

import { loader } from "./library.server";

// A route file is stripped from the client build only by the `.server` suffix
// it cannot carry, so its loader lives in the sibling `library.server.ts`.
export { loader };

export function headers(): HeadersInit {
  return { "Cache-Control": "private, no-store" };
}

export const meta: MetaFunction = () => [
  { title: "Your Library | Evoa" },
  {
    content:
      "Every product you own, ready to download again whenever you need it.",
    name: "description",
  },
];

export default function LibraryRoute() {
  const content = useLoaderData<typeof loader>();
  const revalidator = useRevalidator();

  return (
    <LibraryView
      content={content}
      isReloading={revalidator.state === "loading"}
      onRetry={() => void revalidator.revalidate()}
    />
  );
}
