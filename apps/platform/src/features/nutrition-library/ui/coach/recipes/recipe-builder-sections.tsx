import {
  COOKING_METHODS,
  RECIPE_ICONS,
  TAG_FAMILIES,
  type CookingMethod,
  type RecipeMacrosSnapshot,
  type TagFamily,
} from "@eli-coach-platform/domain/nutrition";
import {
  cn,
  describedByOf,
  LABEL_CLASS,
  toggled,
} from "@eli-coach-platform/ui/lib";
import {
  Button,
  buttonVariants,
  CheckboxChip,
  IconChoicePopover,
  InlineProblem,
  Input,
  ItemVisual,
  Label,
  Legend,
  SearchField,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from "@eli-coach-platform/ui/primitives";
import {
  ArrowLeft,
  GripVertical,
  Library,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { useId, useState, type Ref } from "react";
import { useDrag, useDragLayer, useDrop } from "react-dnd";
import type { UseFormReturn } from "react-hook-form";
import { Link } from "react-router";

import type {
  FoodView,
  NutritionTagView,
} from "~/features/nutrition-library/public/foods";
import { COACH_RECIPES_PATH } from "~/features/nutrition-library/public/paths";
import { MacroTiles } from "~/features/nutrition-library/ui/shared/macro-tiles";
import { CATEGORY_DOT } from "~/features/nutrition-library/ui/shared/nutrition-tints";
import {
  RECIPE_ICON_APPEARANCE,
  recipeGlyphOf,
} from "~/features/nutrition-library/ui/shared/recipe-icons";
import {
  TAG_FAMILY_APPEARANCE,
  TAG_FAMILY_LABELS,
} from "~/features/nutrition-library/ui/shared/tag-pill";

import {
  COOKING_METHOD_LABELS,
  type RecipeFieldProblems,
  type RecipeFormValues,
} from "./recipe-form";

type RecipeForm = UseFormReturn<RecipeFormValues>;

type FoodDragItem = { foodId: string; name: string };

type SaveState = "blocked" | "ready" | "saving";

const FOOD_DRAG_TYPE = "NUTRITION_FOOD";

const RECIPE_ICON_CHOICES = RECIPE_ICONS.map((key) => ({
  key,
  label: RECIPE_ICON_APPEARANCE[key].label,
  icon: RECIPE_ICON_APPEARANCE[key].glyph,
}));

function shownProblem(
  id: string,
  problem: string | undefined,
  className?: string,
) {
  return (
    problem && (
      <InlineProblem className={className} id={id}>
        {problem}
      </InlineProblem>
    )
  );
}

export function BuilderTopBar({
  form,
  problem,
  saveState,
  onSave,
  onOpenLibrary,
  openLibraryRef,
}: {
  form: RecipeForm;
  problem: string | undefined;
  saveState: SaveState;
  onSave: () => void;
  onOpenLibrary: () => void;
  openLibraryRef: Ref<HTMLButtonElement>;
}) {
  const problemId = useId();

  return (
    <header
      className="flex min-h-14 shrink-0 items-start justify-between rounded-field border-b bg-surface-base px-4 py-1 lg:px-6"
      data-parity="recipe-builder-top-bar"
    >
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <div className="flex h-(--size-control-md) shrink-0 items-center gap-3">
          <Link
            aria-label="Back to Nutrition"
            className={buttonVariants({ size: "icon-sm", variant: "ghost" })}
            to={COACH_RECIPES_PATH}
          >
            <ArrowLeft aria-hidden="true" size={20} />
          </Link>
          <Button
            aria-label="Open food library"
            className="lg:hidden"
            onClick={onOpenLibrary}
            ref={openLibraryRef}
            size="icon-sm"
            variant="ghost"
          >
            <Library aria-hidden="true" size={20} />
          </Button>
        </div>
        <div className="grid w-full max-w-sm min-w-0 gap-1">
          <Input
            aria-describedby={describedByOf(problem ? problemId : undefined)}
            aria-invalid={problem ? true : undefined}
            aria-label="Recipe name"
            className="font-heading text-lg"
            defaultValue={form.formState.defaultValues?.name}
            placeholder="Recipe name…"
            {...form.register("name")}
          />
          {shownProblem(problemId, problem)}
        </div>
      </div>
      <div className="flex h-(--size-control-md) shrink-0 items-center gap-2">
        <Link
          aria-label="Cancel"
          className={buttonVariants({ size: "sm", variant: "outline" })}
          to={COACH_RECIPES_PATH}
        >
          <X aria-hidden="true" size={16} />
          <span className="hidden lg:inline">Cancel</span>
        </Link>
        <Button
          aria-busy={saveState === "saving" || undefined}
          aria-label="Save recipe"
          disabled={saveState !== "ready"}
          onClick={onSave}
          size="sm"
          variant="primary"
        >
          <Save aria-hidden="true" size={16} />
          <span className="hidden sm:inline">Save recipe</span>
        </Button>
      </div>
    </header>
  );
}

export function FoodLibraryAside({
  foods,
  open,
  onAdd,
  onClose,
  closeRef,
}: {
  foods: readonly FoodView[];
  open: boolean;
  onAdd: (foodId: string) => void;
  onClose: () => void;
  closeRef: Ref<HTMLButtonElement>;
}) {
  const [query, setQuery] = useState("");
  const wanted = query.trim().toLowerCase();
  const shown = foods.filter((food) =>
    food.name.toLowerCase().includes(wanted),
  );

  return (
    <>
      {open && (
        <div
          aria-hidden="true"
          className="fixed inset-0 z-40 bg-overlay-medium lg:hidden"
          onClick={onClose}
        />
      )}
      <aside
        aria-label="Food library"
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-80 shrink-0 flex-col border-r bg-surface-base duration-300 ease-out motion-reduce:transition-none lg:visible lg:relative lg:z-auto lg:translate-x-0",
          {
            "translate-x-0 shadow-2xl transition-[translate]": open,
            "invisible -translate-x-full transition-[translate,visibility]":
              !open,
          },
        )}
        data-parity="recipe-builder-library"
      >
        <div className="rounded-field border-b bg-surface-base p-4 px-3">
          <div className="mb-3 flex items-center justify-between">
            <p className={LABEL_CLASS}>Food library</p>
            <Button
              aria-label="Close food library"
              className="lg:hidden"
              onClick={onClose}
              ref={closeRef}
              size="icon-sm"
              variant="ghost"
            >
              <X aria-hidden="true" size={18} />
            </Button>
          </div>
          <SearchField
            aria-label="Search foods"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name"
            size="sm"
            value={query}
          />
        </div>
        <div className="flex-1 space-y-3 overflow-y-auto bg-surface-page p-4">
          {shown.map((food) => (
            <DraggableFood food={food} key={food.id} onAdd={onAdd} />
          ))}
        </div>
      </aside>
    </>
  );
}

function DraggableFood({
  food,
  onAdd,
}: {
  food: FoodView;
  onAdd: (foodId: string) => void;
}) {
  const [{ isDragging }, drag] = useDrag(
    () => ({
      type: FOOD_DRAG_TYPE,
      item: { foodId: food.id, name: food.name } satisfies FoodDragItem,
      collect: (monitor) => ({ isDragging: monitor.isDragging() }),
    }),
    [food.id, food.name],
  );

  return (
    <div
      className={cn(
        "group flex cursor-grab items-center gap-2 rounded-control border bg-surface-base p-3 transition-all select-none hover:shadow-card active:cursor-grabbing",
        { "opacity-50 ring-2 ring-primary": isDragging },
      )}
      ref={(node) => {
        drag(node);
      }}
    >
      <GripVertical
        aria-hidden="true"
        className="text-text-secondary"
        size={14}
      />
      <span
        aria-hidden="true"
        className={cn("size-2.5 rounded-full", CATEGORY_DOT[food.category])}
      />
      <span className="flex-1 text-sm font-medium text-text-primary">
        {food.name}
      </span>
      <Button
        aria-label={`Add ${food.name} to recipe`}
        onClick={() => onAdd(food.id)}
        size="icon-sm"
        variant="ghost"
      >
        <Plus aria-hidden="true" size={16} />
      </Button>
    </div>
  );
}

export function FoodDragPreview() {
  const { isDragging, item, offset } = useDragLayer((monitor) => ({
    isDragging: monitor.isDragging(),
    item: monitor.getItem<FoodDragItem | null>(),
    offset: monitor.getSourceClientOffset(),
  }));

  if (!isDragging || !offset || !item) return null;

  return (
    <div
      className="pointer-events-none fixed top-0 left-0 z-100"
      style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}
    >
      <div className="inline-flex items-center gap-2 rounded-control border border-primary bg-surface-base px-3 py-2 shadow-raised">
        <GripVertical
          aria-hidden="true"
          className="text-text-secondary"
          size={14}
        />
        <span className="text-sm font-semibold text-text-primary">
          {item.name}
        </span>
      </div>
    </div>
  );
}

export function RecipeVisualChoice({
  form,
  values,
}: {
  form: RecipeForm;
  values: RecipeFormValues;
}) {
  const chosen = values.icon;

  return (
    <div className="mb-4">
      <div className="relative mb-3 overflow-hidden rounded-card">
        <ItemVisual
          className="h-40 w-full rounded-card"
          data-parity="recipe-visual"
          icon={recipeGlyphOf(chosen)}
          iconSize={48}
          name={values.name.trim() || "Recipe"}
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <IconChoicePopover
          data-parity="recipe-icon-popover"
          label="Meal icon"
          noneLabel="None"
          onChange={(icon) =>
            form.setValue("icon", icon, { shouldDirty: true })
          }
          options={RECIPE_ICON_CHOICES}
          triggerLabel={
            chosen === null
              ? "Choose icon"
              : `Icon: ${RECIPE_ICON_APPEARANCE[chosen].label}`
          }
          value={chosen}
        />
      </div>
    </div>
  );
}

export function IngredientZone({
  form,
  fields,
  values,
  foods,
  problems,
  onAdd,
  onRemove,
}: {
  form: RecipeForm;
  fields: readonly { id: string }[];
  values: RecipeFormValues;
  foods: readonly FoodView[];
  problems: RecipeFieldProblems;
  onAdd: (foodId: string) => void;
  onRemove: (position: number) => void;
}) {
  const [{ isOver, canDrop }, drop] = useDrop(
    () => ({
      accept: FOOD_DRAG_TYPE,
      drop: (item: FoodDragItem) => onAdd(item.foodId),
      collect: (monitor) => ({
        isOver: monitor.isOver(),
        canDrop: monitor.canDrop(),
      }),
    }),
    [onAdd],
  );

  return (
    <div
      className={cn(
        "min-h-40 rounded-card border-2 border-dashed p-4 transition-all duration-200 motion-reduce:transition-none",
        {
          "border-primary bg-primary-soft": isOver && canDrop,
          "border-primary/30 bg-primary-soft": canDrop && !isOver,
          "border-border-default bg-surface-quiet": !canDrop,
        },
      )}
      data-parity="recipe-ingredients"
      ref={(node) => {
        drop(node);
      }}
    >
      {fields.length === 0 ? (
        <p className="text-sm text-text-secondary">
          Drag foods here (or use the + on a food) to add ingredients.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {fields.map((field, position) => {
            const ingredient = values.ingredients[position];

            return (
              ingredient && (
                <IngredientRow
                  foodName={
                    foods.find((food) => food.id === ingredient.foodId)?.name ??
                    "Unknown food"
                  }
                  form={form}
                  key={field.id}
                  method={ingredient.method}
                  onRemove={() => onRemove(position)}
                  position={position}
                  problem={problems.grams[position]}
                />
              )
            );
          })}
        </ul>
      )}
    </div>
  );
}

function IngredientRow({
  form,
  position,
  foodName,
  method,
  problem,
  onRemove,
}: {
  form: RecipeForm;
  position: number;
  foodName: string;
  method: CookingMethod;
  problem: string | undefined;
  onRemove: () => void;
}) {
  const problemId = useId();

  return (
    <li className="flex flex-wrap items-center gap-2 rounded-control border bg-surface-base px-3 py-2">
      <span className="min-w-32 flex-1 text-sm font-medium text-text-primary">
        {foodName}
      </span>
      <label className="flex items-center gap-1 text-xs text-text-secondary">
        <span className="sr-only">Grams for {foodName}</span>
        <Input
          aria-describedby={describedByOf(problem ? problemId : undefined)}
          aria-invalid={problem ? true : undefined}
          aria-label={`Grams of ${foodName}`}
          className="w-20"
          defaultValue={form.getValues(`ingredients.${position}.grams`)}
          inputMode="numeric"
          min="1"
          type="number"
          {...form.register(`ingredients.${position}.grams`)}
        />
        <span>g</span>
      </label>
      <Select
        onValueChange={(chosen) => {
          const known = COOKING_METHODS.find(
            (candidate) => candidate === chosen,
          );
          if (known) {
            form.setValue(`ingredients.${position}.method`, known, {
              shouldDirty: true,
            });
          }
        }}
        value={method}
      >
        <SelectTrigger
          aria-label={`Cooking method for ${foodName}`}
          className="w-32"
          size="sm"
        >
          <SelectValue>{COOKING_METHOD_LABELS[method]}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {COOKING_METHODS.map((known) => (
            <SelectItem key={known} value={known}>
              {COOKING_METHOD_LABELS[known]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        aria-label={`Remove ${foodName}`}
        onClick={onRemove}
        size="icon-sm"
        variant="ghost"
      >
        <Trash2 aria-hidden="true" size={16} />
      </Button>
      {shownProblem(problemId, problem, "basis-full")}
    </li>
  );
}

export function BuilderMacros({ macros }: { macros: RecipeMacrosSnapshot }) {
  return (
    <section
      aria-label="Macros"
      className="mt-4 max-w-md"
      data-parity="recipe-builder-macros"
    >
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-medium text-text-primary">
          Macros (whole recipe)
        </p>
      </div>
      <MacroTiles kcalTone="base" macros={macros} />
    </section>
  );
}

export function BuilderDetails({
  form,
  values,
  problems,
  tags,
}: {
  form: RecipeForm;
  values: RecipeFormValues;
  problems: RecipeFieldProblems;
  tags: readonly NutritionTagView[];
}) {
  const instructionsId = useId();
  const instructionsProblemId = useId();

  return (
    <section
      aria-label="Recipe details"
      className="mt-6 grid max-w-2xl gap-5"
      data-parity="recipe-builder-details"
    >
      <div className="flex flex-wrap items-start gap-4">
        <MinutesField
          field="prepMinutes"
          form={form}
          label="Prep (min)"
          problem={problems.prepMinutes}
        />
        <MinutesField
          field="cookMinutes"
          form={form}
          label="Cook (min)"
          problem={problems.cookMinutes}
        />
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor={instructionsId}>Instructions</Label>
        <Textarea
          aria-describedby={describedByOf(
            problems.instructions ? instructionsProblemId : undefined,
          )}
          aria-invalid={problems.instructions ? true : undefined}
          defaultValue={form.formState.defaultValues?.instructions}
          id={instructionsId}
          placeholder="Step-by-step cooking instructions…"
          rows={4}
          {...form.register("instructions")}
        />
        {shownProblem(instructionsProblemId, problems.instructions)}
      </div>

      <fieldset className="grid gap-3">
        <Legend>Meal role &amp; tags</Legend>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {TAG_FAMILIES.map((family) => (
            <TagFamilyGroup
              chosenTagIds={values.tagIds}
              family={family}
              key={family}
              onToggle={(tagId) =>
                form.setValue("tagIds", toggled(values.tagIds, tagId), {
                  shouldDirty: true,
                })
              }
              tags={tags}
            />
          ))}
        </div>
      </fieldset>
    </section>
  );
}

function TagFamilyGroup({
  family,
  tags,
  chosenTagIds,
  onToggle,
}: {
  family: TagFamily;
  tags: readonly NutritionTagView[];
  chosenTagIds: readonly string[];
  onToggle: (tagId: string) => void;
}) {
  const { icon: FamilyIcon } = TAG_FAMILY_APPEARANCE[family];

  return (
    <div
      aria-label={TAG_FAMILY_LABELS[family]}
      className="rounded-control border bg-surface-base p-3"
      role="group"
    >
      <p className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold text-text-primary">
        <FamilyIcon
          aria-hidden="true"
          className="text-text-secondary"
          size={14}
        />
        {TAG_FAMILY_LABELS[family]}
      </p>
      <ul className="flex flex-wrap gap-1.5">
        {tags
          .filter((tag) => tag.family === family)
          .map((tag) => (
            <li key={tag.id}>
              <CheckboxChip
                aria-label={tag.label}
                isChecked={chosenTagIds.includes(tag.id)}
                onChange={() => onToggle(tag.id)}
                size="compact"
              >
                {tag.label}
              </CheckboxChip>
            </li>
          ))}
      </ul>
    </div>
  );
}

function MinutesField({
  form,
  field,
  label,
  problem,
}: {
  form: RecipeForm;
  field: "prepMinutes" | "cookMinutes";
  label: string;
  problem: string | undefined;
}) {
  const inputId = useId();
  const problemId = useId();

  return (
    <div className="grid w-40 content-start gap-1.5">
      <Label htmlFor={inputId}>{label}</Label>
      <Input
        aria-describedby={describedByOf(problem ? problemId : undefined)}
        aria-invalid={problem ? true : undefined}
        className="w-24"
        defaultValue={form.formState.defaultValues?.[field]}
        id={inputId}
        inputMode="numeric"
        min="0"
        type="number"
        {...form.register(field)}
      />
      {shownProblem(problemId, problem)}
    </div>
  );
}
