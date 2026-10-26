import { useSaveFetcher, type SaveOutcome } from "@eli-coach-platform/ui/lib";
import {
  PortalBackLink,
  PortalPageHeader,
} from "@eli-coach-platform/ui/portal";
import { Button, buttonVariants } from "@eli-coach-platform/ui/primitives";
import { toast } from "@eli-coach-platform/ui/toast";
import { Check } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import {
  Link,
  useLoaderData,
  useNavigate,
  type LoaderFunctionArgs,
  type MetaFunction,
} from "react-router";

import {
  foodProblemsAnswerSchema,
  foodSavedAnswerSchema,
  type FoodEditorView,
  type FoodProblems,
} from "~/features/nutrition-library/public/foods";
import {
  COACH_NUTRITION_PATH,
  foodPath,
  NUTRITION_LIBRARY_API_PATHS,
} from "~/features/nutrition-library/public/paths";
import { nutritionLibraryContext } from "~/features/nutrition-library/server/guards/nutrition-library-context.server";

import {
  FoodAboutSection,
  FoodNutritionSection,
  FoodTagsSection,
} from "./food-editor-sections";
import {
  FOOD_PROBLEM_FIELDS,
  foodFieldProblemsOf,
  foodFormResolver,
  foodFormValuesOf,
  foodRequestOf,
  newFoodFormValues,
  shownFoodProblemsOf,
  type FoodFormValues,
  type FoodProblemField,
} from "./food-form";

const SAVE_FAILED = "We couldn't save the food. Try again in a moment.";

export async function loader(args: LoaderFunctionArgs) {
  const { foodLibrary } = args.context.get(nutritionLibraryContext);
  const { foodId } = args.params;

  return foodId === undefined
    ? foodLibrary.loadNew(args)
    : foodLibrary.load(args, foodId);
}

export const meta: MetaFunction<typeof loader> = ({ loaderData }) => [
  { title: `${loaderData?.food ? "Edit food" : "New food"} | Evoa` },
];

export default function FoodEditorRoute() {
  const editor = useLoaderData<typeof loader>();

  return <FoodEditor editor={editor} key={editor.food?.id ?? "new"} />;
}

function FoodEditor({ editor }: { editor: FoodEditorView }) {
  const { food, tags } = editor;
  const navigate = useNavigate();
  const takenNames = useRef<readonly string[]>(editor.otherNames);
  const sentName = useRef("");
  const [resolver] = useState(() =>
    foodFormResolver(
      () => takenNames.current,
      tags.map(({ id }) => id),
    ),
  );
  const form = useForm<FoodFormValues>({
    defaultValues: food ? foodFormValuesOf(food) : newFoodFormValues(),
    mode: "onChange",
    resolver,
  });
  const values = form.watch();
  const problems = shownFoodProblemsOf(form.formState.errors);

  useEffect(
    () =>
      form.subscribe({
        callback: () => void form.trigger(),
        formState: { values: true },
      }),
    [form],
  );

  const rememberTakenName = (problems: FoodProblems) => {
    if (problems.name === "taken") {
      takenNames.current = [...takenNames.current, sentName.current];
    }
  };

  const showRefusedFields = (problems: FoodProblems): FoodProblemField[] => {
    const refused = foodFieldProblemsOf(problems);
    const refusedFields = FOOD_PROBLEM_FIELDS.filter((field) => refused[field]);

    refusedFields.forEach((field, index) =>
      form.setError(
        field,
        { message: refused[field], type: "server" },
        { shouldFocus: index === 0 },
      ),
    );
    return refusedFields;
  };

  const settle = (outcome: SaveOutcome<FoodProblems>) => {
    if (outcome.status === "saved") {
      toast.success(food ? "Food updated" : "Food created");
      void navigate(outcome.redirectTo);
      return;
    }

    if (outcome.status === "failed") {
      toast.error(SAVE_FAILED);
      return;
    }

    rememberTakenName(outcome.problems);

    if (showRefusedFields(outcome.problems).length === 0) {
      toast.error(SAVE_FAILED);
    }
  };

  const { save, saving } = useSaveFetcher({
    target: food
      ? { action: foodPath(food.id), method: "put" }
      : { action: NUTRITION_LIBRARY_API_PATHS.foods, method: "post" },
    savedAnswer: foodSavedAnswerSchema,
    refusedAnswer: foodProblemsAnswerSchema,
    onSettled: settle,
  });

  const submit = form.handleSubmit((submitted) => {
    sentName.current = submitted.name;
    save(foodRequestOf(submitted));
  });

  return (
    <div className="w-full max-w-3xl" data-parity-root="FoodEditorPage">
      <PortalBackLink to={COACH_NUTRITION_PATH}>Back to foods</PortalBackLink>
      <PortalPageHeader title={food ? "Edit food" : "New food"} />

      <form noValidate onSubmit={submit}>
        <div className="space-y-6 sm:space-y-8">
          <FoodAboutSection form={form} problems={problems} values={values} />
          <FoodNutritionSection form={form} problems={problems} />
          <FoodTagsSection form={form} tags={tags} values={values} />
        </div>

        <div
          className="mt-8 flex items-center justify-end gap-3"
          data-parity="food-editor-actions"
        >
          <Link
            className={buttonVariants({ size: "md", variant: "ghost" })}
            to={COACH_NUTRITION_PATH}
          >
            Cancel
          </Link>
          <Button
            aria-busy={saving || undefined}
            disabled={!form.formState.isValid || saving}
            size="md"
            type="submit"
            variant="primary"
          >
            <Check aria-hidden="true" size={16} />
            {food ? "Save changes" : "Create food"}
          </Button>
        </div>
      </form>
    </div>
  );
}
