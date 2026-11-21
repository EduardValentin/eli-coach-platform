import {
  useLoaderData,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
  type MetaFunction,
} from "react-router";

import { PROGRAM_SETUP_ROUTE_HANDLE } from "~/bounded-contexts/programs/training-programs/public/paths";
import { trainingProgramsContext } from "~/bounded-contexts/programs/training-programs/adapters/inbound/http/context.server";

import { ProgramSetup, programSetupTitle } from "./program-setup";

export function loader(args: LoaderFunctionArgs) {
  return args.context
    .get(trainingProgramsContext)
    .coachProgramController.loadSetup(args, args.params.clientId);
}

export function action(args: ActionFunctionArgs) {
  return args.context
    .get(trainingProgramsContext)
    .coachProgramController.create(args, args.params.clientId);
}

export const handle = PROGRAM_SETUP_ROUTE_HANDLE;

export const meta: MetaFunction<typeof loader> = ({ loaderData }) => [
  {
    title: loaderData
      ? `${programSetupTitle(loaderData)} | Evoa`
      : "Program | Evoa",
  },
];

export default function ProgramSetupRoute() {
  const view = useLoaderData<typeof loader>();

  return <ProgramSetup view={view} />;
}
