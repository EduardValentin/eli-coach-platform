import { pwaSurfaceDefinitions } from "@eli-coach-platform/infrastructure/pwa";
import {
  useLoaderData,
  type LoaderFunctionArgs,
  type MetaFunction,
} from "react-router";

import type { ClientResourceListing } from "~/features/client-resources/contracts/client-resources";
import { clientResourcesContext } from "~/features/client-resources/server/guards/client-resources-context.server";

import { ClientResourceLibrary } from "./client-resource-library";

export function loader(
  args: LoaderFunctionArgs,
): Promise<ClientResourceListing> {
  return args.context.get(clientResourcesContext).ownResources.load(args);
}

export const meta: MetaFunction = () => [
  { title: "Resources | Evoa" },
  { name: "description", content: pwaSurfaceDefinitions.client.description },
  { name: "theme-color", content: pwaSurfaceDefinitions.client.themeColor },
];

export default function ClientResourcesRoute() {
  const listing = useLoaderData<typeof loader>();

  return (
    <div className="w-full" data-parity-root="ClientResources">
      <ClientResourceLibrary listing={listing} />
    </div>
  );
}
