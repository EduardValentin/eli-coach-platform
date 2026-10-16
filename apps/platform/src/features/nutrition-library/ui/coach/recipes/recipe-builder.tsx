import {
  cn,
  useSaveFetcher,
  type SaveOutcome,
} from "@eli-coach-platform/ui/lib";
import { toast } from "@eli-coach-platform/ui/toast";
import { useEffect, useId, useRef, useState, type RefObject } from "react";
import { DndProvider, useDragLayer } from "react-dnd";
import { TouchBackend } from "react-dnd-touch-backend";
import { flushSync } from "react-dom";
import { useFieldArray, useForm, type UseFormReturn } from "react-hook-form";
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
  recipeMacrosOf,
  recipeRequestOf,
  refusedFieldsInFocusOrder,
  shownRecipeProblemsOf,
  type RecipeFormValues,
  type RecipeProblemField,
} from "./recipe-form";

const SAVE_FAILED = "We couldn't save the recipe. Try again in a moment.";

type RecipeBuilderProps = { view: RecipeBuilderView };

type RecipeSaveOptions = {
  form: UseFormReturn<RecipeFormValues>;
  recipe: RecipeBuilderView["recipe"];
  takenNames: RefObject<readonly string[]>;
};

export function RecipeBuilder({ view }: RecipeBuilderProps) {
  return (
    <DndProvider backend={TouchBackend} options={{ enableMouseEvents: true }}>
      <FoodDragPreview />
      <RecipeWorkspace view={view} />
    </DndProvider>
  );
}

function useLibraryDrawer() {
  const openButton = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);

  const openLibrary = () => {
    flushSync(() => setOpen(true));
    closeButton.current?.focus();
  };

  const closeLibrary = () => {
    flushSync(() => setOpen(false));
    openButton.current?.focus();
  };

  return { open, openLibrary, closeLibrary, openButton, closeButton };
}

function useRecipeSave({ form, recipe, takenNames }: RecipeSaveOptions) {
  const navigate = useNavigate();
  const sentName = useRef("");

  const rememberTakenName = (refused: RecipeProblems) => {
    if (refused.name === "taken") {
      takenNames.current = [...takenNames.current, sentName.current];
    }
  };

  const markRefused = (refusedFields: [RecipeProblemField, string][]) => {
    refusedFields.forEach(([field, message], index) =>
      form.setError(
        field,
        { message, type: "server" },
        { shouldFocus: index === 0 },
      ),
    );
  };

  const settleSave = (outcome: SaveOutcome<RecipeProblems>) => {
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

    const refusedFields = refusedFieldsInFocusOrder(
      recipeFieldProblemsOf(outcome.problems),
    );

    if (refusedFields.length === 0) {
      toast.error(SAVE_FAILED);
      return;
    }

    markRefused(refusedFields);
  };

  const { save, saving } = useSaveFetcher({
    target: recipe
      ? { action: recipePath(recipe.id), method: "put" }
      : { action: NUTRITION_LIBRARY_API_PATHS.recipes, method: "post" },
    savedAnswer: recipeSavedAnswerSchema,
    refusedAnswer: recipeProblemsAnswerSchema,
    onSettled: settleSave,
  });

  const submit = form.handleSubmit((submitted) => {
    sentName.current = submitted.name;
    save(recipeRequestOf(submitted));
  });

  return { submit, saving };
}

function RecipeWorkspace({ view }: RecipeBuilderProps) {
  const { recipe, offeredFoods, placedFoods, tags } = view;
  const foods = [...offeredFoods, ...placedFoods];
  const headingId = useId();
  const takenNames = useRef<readonly string[]>(view.otherNames);
  const library = useLibraryDrawer();
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
  const { submit, saving } = useRecipeSave({ form, recipe, takenNames });
  const values = form.watch();
  const problems = shownRecipeProblemsOf(form.formState.errors);
  const isDragging = useDragLayer((monitor) => monitor.isDragging());
  const macros = recipeMacrosOf(values.ingredients, foods);

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

  return (
    <div
      className={cn("fixed inset-0 z-50 flex flex-col bg-surface-subtle", {
        "select-none": isDragging,
      })}
      data-parity-root="RecipeBuilderPage"
    >
      <BuilderTopBar
        form={form}
        onOpenLibrary={library.openLibrary}
        onSave={() => void submit()}
        openLibraryRef={library.openButton}
        problem={problems.name}
        saveState={
          saving ? "saving" : form.formState.isValid ? "ready" : "blocked"
        }
      />

      <div className="flex min-h-0 flex-1">
        <FoodLibraryAside
          closeRef={library.closeButton}
          foods={offeredFoods}
          onAdd={addFood}
          onClose={library.closeLibrary}
          open={library.open}
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
