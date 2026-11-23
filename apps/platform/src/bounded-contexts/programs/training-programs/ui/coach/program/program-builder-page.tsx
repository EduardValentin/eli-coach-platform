import {
  useLoaderData,
  type LoaderFunctionArgs,
  type MetaFunction,
} from "react-router";

import { PROGRAM_SETUP_ROUTE_HANDLE } from "~/bounded-contexts/programs/training-programs/public/paths";
import { trainingProgramsContext } from "~/bounded-contexts/programs/training-programs/adapters/inbound/http/context.server";

import { clientName } from "./editor-top-bar";
import { builderPlaceTitle, ProgramBuilderView } from "./program-builder";

export function loader(args: LoaderFunctionArgs) {
  return args.context
    .get(trainingProgramsContext)
    .coachProgramController.loadDraft(args, args.params.clientId);
}

export const handle = PROGRAM_SETUP_ROUTE_HANDLE;

export const meta: MetaFunction<typeof loader> = ({ loaderData, location }) => [
  {
    title: loaderData
      ? `${builderPlaceTitle(loaderData, location.hash)} · ${clientName(loaderData.client)} | Evoa`
      : "Program | Evoa",
  },
];

export default function ProgramBuilderRoute() {
  const view = useLoaderData<typeof loader>();

  return <ProgramBuilderView view={view} />;
}
