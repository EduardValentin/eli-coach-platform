import { type MetaFunction, useLoaderData, useRevalidator } from "react-router";

import { LibraryView } from "~/features/store/ui/public/library-view";

import { loader } from "./library.server";

// Registered in routes.ts, so this file cannot carry the `.server` suffix,
// and its loader lives in the sibling `library.server.ts`.
// The rule, and why merging them breaks the build: ARCHITECTURE.md,
// under "The `.server` suffix".
export { loader };

// The only page under the public shell whose HTML carries account-private
// data, so it says so: the JSON behind it already refuses to be stored, and
// the rendered copy the browser writes to disk must refuse too.
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

  // The list is loader-owned, so a retry is the loader running again rather
  // than a second way to fetch it.
  return (
    <LibraryView
      content={content}
      isReloading={revalidator.state === "loading"}
      onRetry={() => void revalidator.revalidate()}
    />
  );
}
