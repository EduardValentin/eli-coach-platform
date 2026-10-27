import {
  cn,
  useIsDesktopViewport,
  useSaveFetcher,
  type SaveOutcome,
} from "~/shared/design-system/lib";
import { toast } from "~/shared/design-system/toast";
import {
  useEffect,
  useEffectEvent,
  useId,
  useRef,
  useState,
  type RefObject,
} from "react";
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
  recipeSaveBodyOf,
  refusedFieldsInFocusOrder,
  shownRecipeProblemsOf,
  type RecipeFormValues,
  type RecipeProblemField,
} from "./recipe-form";
import {
  serverPhotoRefusalMessage,
  UNTOUCHED_PHOTO,
  type RecipePhotoEntry,
  type RecipePhotoUpload,
} from "./recipe-photo-entry";
import type { RecipePhotoFieldHandle } from "./recipe-photo-field";

const SAVE_FAILED = "We couldn't save the recipe. Try again in a moment.";

const TABBABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

type RefusalShown = "fields" | "photo" | "none";

type RecipeBuilderProps = { view: RecipeBuilderView };

type RecipeSaveOptions = {
  form: UseFormReturn<RecipeFormValues>;
  recipe: RecipeBuilderView["recipe"];
  takenNames: RefObject<readonly string[]>;
  photo: RecipePhotoEntry;
  onPhotoChange: (photo: RecipePhotoEntry) => void;
  photoField: RefObject<RecipePhotoFieldHandle | null>;
};

export function RecipeBuilder({ view }: RecipeBuilderProps) {
  return (
    <DndProvider backend={TouchBackend} options={{ enableMouseEvents: true }}>
      <FoodDragPreview />
      <RecipeWorkspace view={view} />
    </DndProvider>
  );
}

function wrapTabWithin(container: HTMLElement, event: KeyboardEvent) {
  const controls = [...container.querySelectorAll<HTMLElement>(TABBABLE)];
  const first = controls[0];
  const last = controls.at(-1);

  if (!first || !last) return;

  const focused = document.activeElement;
  const outside = !container.contains(focused);

  if (event.shiftKey && (outside || focused === first)) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && (outside || focused === last)) {
    event.preventDefault();
    first.focus();
  }
}

function useLibraryDrawer() {
  const openButton = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const drawer = useRef<HTMLElement>(null);
  const [open, setOpen] = useState(false);
  const isDesktop = useIsDesktopViewport();
  const isOpenAsDrawer = open && !isDesktop;

  const openLibrary = () => {
    flushSync(() => setOpen(true));
    closeButton.current?.focus();
  };

  const closeLibrary = () => {
    flushSync(() => setOpen(false));
    openButton.current?.focus();
  };

  const answerDrawerKey = useEffectEvent((event: KeyboardEvent) => {
    if (event.key === "Escape") closeLibrary();
    if (event.key === "Tab" && drawer.current) {
      wrapTabWithin(drawer.current, event);
    }
  });

  useEffect(() => {
    if (!isOpenAsDrawer) return;

    const onKeyDown = (event: KeyboardEvent) => answerDrawerKey(event);
    document.addEventListener("keydown", onKeyDown);

    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpenAsDrawer]);

  return { open, openLibrary, closeLibrary, openButton, closeButton, drawer };
}

function photoUploadOf({
  saving,
  chosenFile,
  failedUpload,
}: {
  saving: boolean;
  chosenFile: File | null;
  failedUpload: File | null;
}): RecipePhotoUpload {
  if (chosenFile === null) return "idle";
  if (saving) return "sending";

  return chosenFile === failedUpload ? "failed" : "idle";
}

function useRecipeSave({
  form,
  recipe,
  takenNames,
  photo,
  onPhotoChange,
  photoField,
}: RecipeSaveOptions) {
  const navigate = useNavigate();
  const sentName = useRef("");
  const [failedUpload, setFailedUpload] = useState<File | null>(null);

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

  const showRefusedPhoto = (refused: RecipeProblems): boolean => {
    if (refused.photo === undefined || photo.chosen.kind !== "attach") {
      return false;
    }

    onPhotoChange({
      ...photo,
      problem: serverPhotoRefusalMessage(refused.photo, photo.chosen.file),
    });
    return true;
  };

  const showRefusal = (refused: RecipeProblems): RefusalShown => {
    const refusedFields = refusedFieldsInFocusOrder(
      recipeFieldProblemsOf(refused),
    );
    markRefused(refusedFields);
    const photoShown = showRefusedPhoto(refused);

    if (photoShown && refusedFields.length === 0) {
      photoField.current?.queueReplaceFocus();
    }

    if (refusedFields.length > 0) return "fields";

    return photoShown ? "photo" : "none";
  };

  const settleSave = (outcome: SaveOutcome<RecipeProblems>) => {
    switch (outcome.status) {
      case "saved":
        toast.success(recipe ? "Recipe updated" : "Recipe created");
        void navigate(outcome.redirectTo);
        return;
      case "refused":
        rememberTakenName(outcome.problems);
        if (showRefusal(outcome.problems) === "none") toast.error(SAVE_FAILED);
        return;
      case "failed":
        if (photo.chosen.kind === "attach") {
          setFailedUpload(photo.chosen.file);
          return;
        }

        toast.error(SAVE_FAILED);
        return;
    }
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
    setFailedUpload(null);
    save(recipeSaveBodyOf(submitted, photo.chosen));
  });

  const chosenFile = photo.chosen.kind === "attach" ? photo.chosen.file : null;
  const photoUpload = photoUploadOf({ saving, chosenFile, failedUpload });
  const saveState = saving
    ? ("saving" as const)
    : form.formState.isValid
      ? ("ready" as const)
      : ("blocked" as const);

  return { submit, saveState, photoUpload };
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
  const photoField = useRef<RecipePhotoFieldHandle>(null);
  const [photo, setPhoto] = useState<RecipePhotoEntry>(UNTOUCHED_PHOTO);
  const { submit, saveState, photoUpload } = useRecipeSave({
    form,
    recipe,
    takenNames,
    photo,
    onPhotoChange: setPhoto,
    photoField,
  });
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
        photoUpload={photoUpload}
        saveState={saveState}
      />

      <div className="flex min-h-0 flex-1">
        <FoodLibraryAside
          closeRef={library.closeButton}
          drawerRef={library.drawer}
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

          <RecipeVisualChoice
            form={form}
            onPhotoChange={setPhoto}
            onRetry={() => void submit()}
            photo={photo}
            ref={photoField}
            photoUpload={photoUpload}
            stored={recipe?.photo ?? null}
            values={values}
          />
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
