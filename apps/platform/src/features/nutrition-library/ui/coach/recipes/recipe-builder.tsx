import { RecipeMacros } from "@eli-coach-platform/domain/nutrition";
import {
  cn,
  useSaveFetcher,
  type SaveOutcome,
} from "@eli-coach-platform/ui/lib";
import { toast } from "@eli-coach-platform/ui/toast";
import { useEffect, useId, useRef, useState } from "react";
import { DndProvider, useDragLayer } from "react-dnd";
import { TouchBackend } from "react-dnd-touch-backend";
import { flushSync } from "react-dom";
import { useFieldArray, useForm } from "react-hook-form";
import { useNavigate } from "react-router";

import {
  NUTRITION_LIBRARY_API_PATHS,
  recipePath,
} from "~/features/nutrition-library/public/paths";
import {
  recipeProblemsAnswerSchema,
  recipeSavedAnswerSchema,
  type RecipeBuilderView,
  type RecipeProblems,
} from "~/features/nutrition-library/public/recipes";

import {
  BuilderDetails,
  BuilderMacros,
  BuilderTopBar,
  FoodDragPreview,
  FoodLibraryAside,
  IngredientZone,
  RecipeVisualChoice,
} from "./recipe-builder-sections";
import {
  newRecipeFormValues,
  recipeFieldProblemsOf,
  recipeFormResolver,
  recipeFormValuesOf,
  recipeProblemFieldsOf,
  recipeRequestOf,
  shownRecipeProblemsOf,
  type RecipeFormValues,
} from "./recipe-form";

const SAVE_FAILED = "We couldn't save the recipe. Try again in a moment.";

type RecipeBuilderProps = { view: RecipeBuilderView };

export function RecipeBuilder({ view }: RecipeBuilderProps) {
  return (
    <DndProvider backend={TouchBackend} options={{ enableMouseEvents: true }}>
      <FoodDragPreview />
      <RecipeWorkspace view={view} />
    </DndProvider>
  );
}

function RecipeWorkspace({ view }: RecipeBuilderProps) {
  const { recipe, offeredFoods, placedFoods, tags } = view;
  const foods = [...offeredFoods, ...placedFoods];
  const navigate = useNavigate();
  const headingId = useId();
  const takenNames = useRef<readonly string[]>(view.otherNames);
  const sentName = useRef("");
  const openLibraryButton = useRef<HTMLButtonElement>(null);
  const closeLibraryButton = useRef<HTMLButtonElement>(null);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [resolver] = useState(() =>
    recipeFormResolver({
      otherNames: () => takenNames.current,
      tags,
      pickableFoodIds: foods.map(({ id }) => id),
    }),
  );
  const form = useForm<RecipeFormValues>({
    defaultValues: recipe ? recipeFormValuesOf(recipe) : newRecipeFormValues(),
    mode: "onChange",
    resolver,
  });
  const ingredients = useFieldArray({
    control: form.control,
    name: "ingredients",
  });
  const values = form.watch();
  const problems = shownRecipeProblemsOf(form.formState.errors);
  const isDragging = useDragLayer((monitor) => monitor.isDragging());
  const macros = RecipeMacros.of(
    values.ingredients.map(({ foodId, grams }) => ({
      foodId,
      grams: Number(grams) || 0,
    })),
    foods,
  ).toSnapshot();

  useEffect(
    () =>
      form.subscribe({
        callback: () => void form.trigger(),
        formState: { values: true },
      }),
    [form],
  );

  const addFood = (foodId: string) => {
    const food = offeredFoods.find(({ id }) => id === foodId);

    if (food) {
      ingredients.append(
        { foodId, grams: String(food.defaultPortionGrams), method: "raw" },
        { shouldFocus: false },
      );
    }
  };

  const openLibrary = () => {
    flushSync(() => setLibraryOpen(true));
    closeLibraryButton.current?.focus();
  };

  const closeLibrary = () => {
    flushSync(() => setLibraryOpen(false));
    openLibraryButton.current?.focus();
  };

  const rememberTakenName = (refused: RecipeProblems) => {
    if (refused.name === "taken") {
      takenNames.current = [...takenNames.current, sentName.current];
    }
  };

  const showRefusedFields = (refused: RecipeProblems) => {
    const refusedFields = recipeProblemFieldsOf(recipeFieldProblemsOf(refused));

    refusedFields.forEach(([field, message], index) =>
      form.setError(
        field,
        { message, type: "server" },
        { shouldFocus: index === 0 },
      ),
    );
    return refusedFields;
  };

  const settle = (outcome: SaveOutcome<RecipeProblems>) => {
    if (outcome.status === "saved") {
      toast.success(recipe ? "Recipe updated" : "Recipe created");
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
    target: recipe
      ? { action: recipePath(recipe.id), method: "put" }
      : { action: NUTRITION_LIBRARY_API_PATHS.recipes, method: "post" },
    savedAnswer: recipeSavedAnswerSchema,
    refusedAnswer: recipeProblemsAnswerSchema,
    onSettled: settle,
  });

  const submit = form.handleSubmit((submitted) => {
    sentName.current = submitted.name;
    save(recipeRequestOf(submitted));
  });

  return (
    <div
      className={cn("fixed inset-0 z-50 flex flex-col bg-surface-subtle", {
        "select-none": isDragging,
      })}
      data-parity-root="RecipeBuilderPage"
    >
      <BuilderTopBar
        canSave={form.formState.isValid && !saving}
        form={form}
        onOpenLibrary={openLibrary}
        onSave={() => void submit()}
        openLibraryRef={openLibraryButton}
        problem={problems.name}
        saving={saving}
      />

      <div className="flex min-h-0 flex-1">
        <FoodLibraryAside
          closeRef={closeLibraryButton}
          foods={offeredFoods}
          onAdd={addFood}
          onClose={closeLibrary}
          open={libraryOpen}
        />

        <main
          aria-labelledby={headingId}
          className="flex-1 overflow-y-auto bg-surface-page p-4 lg:p-6"
        >
          <h1 className="sr-only" id={headingId}>
            Recipe builder
          </h1>

          <RecipeVisualChoice form={form} values={values} />
          <IngredientZone
            fields={ingredients.fields}
            foods={foods}
            form={form}
            onAdd={addFood}
            onRemove={ingredients.remove}
            problems={problems}
            values={values}
          />
          <BuilderMacros macros={macros} />
          <BuilderDetails
            form={form}
            problems={problems}
            tags={tags}
            values={values}
          />
        </main>
      </div>
    </div>
  );
}
