import {
  useLoaderData,
  type ActionFunctionArgs,
  type ClientActionFunctionArgs,
  type LoaderFunctionArgs,
  type MetaFunction,
} from "react-router";

import { PROGRAM_SETUP_ROUTE_HANDLE } from "~/bounded-contexts/programs/training-programs/public/paths";
import type { ProgramCreateOutcome } from "~/bounded-contexts/programs/training-programs/public/program-setup";
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

const FIRST_REDIRECT_STATUS = 300;

const FIRST_ERROR_STATUS = 400;

function isRedirect(thrown: unknown): boolean {
  return (
    thrown instanceof Response &&
    thrown.status >= FIRST_REDIRECT_STATUS &&
    thrown.status < FIRST_ERROR_STATUS
  );
}

// A create that never reached the server, or failed there, comes back as the
// same failed outcome the controller answers, so the form keeps her choices.
export async function clientAction({
  serverAction,
}: ClientActionFunctionArgs): Promise<ProgramCreateOutcome> {
  try {
    return await serverAction<typeof action>();
  } catch (thrown) {
    if (isRedirect(thrown)) throw thrown;

    return { status: "failed" };
  }
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
