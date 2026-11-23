import {
  isRouteErrorResponse,
  useLoaderData,
  type ActionFunctionArgs,
  type ClientActionFunctionArgs,
  type LoaderFunctionArgs,
  type MetaFunction,
} from "react-router";

import { COACH_PROGRAM_ROUTE_HANDLE } from "~/bounded-contexts/programs/training-programs/public/paths";
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

const FIRST_SERVER_ERROR_STATUS = 500;

// The server's refusals reach the browser as route error responses; a
// request that got no answer carries no status at all.
function answeredStatusOf(thrown: unknown): number | null {
  if (thrown instanceof Response || isRouteErrorResponse(thrown)) {
    return thrown.status;
  }

  return null;
}

function isFailedWrite(thrown: unknown): boolean {
  const status = answeredStatusOf(thrown);

  return status === null || status >= FIRST_SERVER_ERROR_STATUS;
}

// A create that never got an answer, or failed on the server, comes back as
// the same failed outcome the controller answers, so the form keeps her
// choices. A redirect or a refusal (not found, bad request) still throws.
export async function clientAction({
  serverAction,
}: ClientActionFunctionArgs): Promise<ProgramCreateOutcome> {
  try {
    return await serverAction<typeof action>();
  } catch (thrown) {
    if (!isFailedWrite(thrown)) throw thrown;

    return { status: "failed" };
  }
}

export const handle = COACH_PROGRAM_ROUTE_HANDLE;

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
