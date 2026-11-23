import {
  useLoaderData,
  type LoaderFunctionArgs,
  type MetaFunction,
} from "react-router";

import { COACH_PROGRAM_ROUTE_HANDLE } from "~/bounded-contexts/programs/training-programs/public/paths";
import { trainingProgramsContext } from "~/bounded-contexts/programs/training-programs/adapters/inbound/http/context.server";

import {
  builderPlaceTitle,
  builderTitle,
  ProgramBuilderView,
} from "./program-builder";

export function loader(args: LoaderFunctionArgs) {
  return args.context
    .get(trainingProgramsContext)
    .coachProgramController.loadDraft(args, args.params.clientId);
}

export const handle = COACH_PROGRAM_ROUTE_HANDLE;

export const meta: MetaFunction<typeof loader> = ({ loaderData, location }) => [
  {
    title: loaderData
      ? builderTitle(
          builderPlaceTitle(loaderData, location.hash),
          loaderData.client,
        )
      : "Program | Evoa",
  },
];

export default function ProgramBuilderRoute() {
  const view = useLoaderData<typeof loader>();

  return <ProgramBuilderView view={view} />;
}
