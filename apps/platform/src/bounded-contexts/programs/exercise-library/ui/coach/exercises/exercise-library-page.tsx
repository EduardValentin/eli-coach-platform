import { haveOnlyListingParamsChanged } from "~/shared/design-system/lib";
import { PortalPageHeader } from "~/shared/design-system/portal";
import { buttonVariants } from "~/shared/design-system/primitives";
import { Plus } from "lucide-react";
import { useRef } from "react";
import {
  Link,
  useLoaderData,
  useLocation,
  type LoaderFunctionArgs,
  type MetaFunction,
  type ShouldRevalidateFunctionArgs,
} from "react-router";

import { NEW_EXERCISE_PATH } from "~/bounded-contexts/programs/exercise-library/public/paths";
import { exerciseLibraryContext } from "~/bounded-contexts/programs/exercise-library/adapters/inbound/http/context.server";

import { ExerciseListing } from "./exercise-listing";
import { EXERCISE_LISTING_PARAMS } from "./exercise-listing-params";
import { libraryReturnState } from "./library-address";

export async function loader(args: LoaderFunctionArgs) {
  return args.context.get(exerciseLibraryContext).exerciseLibrary.list(args);
}

export const meta: MetaFunction = () => [{ title: "Exercises | Evoa" }];

export function shouldRevalidate({
  currentUrl,
  defaultShouldRevalidate,
  nextUrl,
}: ShouldRevalidateFunctionArgs) {
  return haveOnlyListingParamsChanged(
    currentUrl,
    nextUrl,
    Object.values(EXERCISE_LISTING_PARAMS),
  )
    ? false
    : defaultShouldRevalidate;
}

export default function ExerciseLibraryRoute() {
  const { exercises } = useLoaderData<typeof loader>();
  const { search } = useLocation();
  const heading = useRef<HTMLHeadingElement>(null);

  return (
    <div className="w-full" data-parity-root="TrainingHub">
      <PortalPageHeader
        actions={
          <Link
            className={buttonVariants({ size: "md", variant: "primary" })}
            state={libraryReturnState(search)}
            to={NEW_EXERCISE_PATH}
          >
            <Plus aria-hidden="true" size={16} />
            New exercise
          </Link>
        }
        headingRef={heading}
        subtitle="Build the exercise library your plans draw from."
        title="Exercises"
      />

      <ExerciseListing exercises={exercises} heading={heading} />
    </div>
  );
}
