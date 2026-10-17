import { useEffect, useId, useState, useRef } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { DndProvider, useDrag, useDrop, useDragLayer } from 'react-dnd';
import { TouchBackend } from 'react-dnd-touch-backend';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Library,
  GripVertical,
  Plus,
  Trash2,
  X,
  ImagePlus,
  Save,
  Smile,
} from 'lucide-react';
import {
  useNutrition,
  COOKING_METHODS,
  TAG_FAMILIES,
} from '../../context/NutritionContext';
import {
  computeRecipeMacros,
  draftProblems,
  isValidDraft,
  recipeFrom,
} from '../../domain/recipes';
import type {
  RecipeDraft,
  RecipeDraftIngredient,
  RecipeDraftProblems,
} from '../../domain/recipes';
import type {
  Food,
  CookingMethod,
  RecipeIngredient,
  RecipeMacros,
  Tag,
  TagFamily,
} from '../../context/NutritionContext';
import { useAppState } from '../../context/AppContext';
import { pickableItems } from '../../domain/libraryLifecycle';
import { Label, Legend } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Checkbox } from '../../components/ui/checkbox';
import { CheckboxChip } from '../../components/CheckboxChip';
import { Button, buttonVariants } from '../../components/ui/button';
import { cn } from '../../components/ui/utils';
import { Input } from '../../components/ui/input';
import { SearchField } from '../../components/SearchField';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '../../components/ui/select';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '../../components/ui/popover';
import { LABEL_CLASS, VALUE_CLASS } from '../../components/typography';
import {
  CATEGORY_SWATCH,
  MACRO_TILE,
  TAG_FAMILY_LABELS,
  COOKING_METHOD_LABELS,
} from '../../components/coach-portal/nutrition/nutrition-constants';
import { TAG_FAMILY_ICON } from '../../components/coach-portal/nutrition/food-icons';
import { RECIPE_ICONS } from '../../components/coach-portal/nutrition/recipe-icons';
import type { RecipeIcon } from '../../components/coach-portal/nutrition/recipe-icons';
import { RecipeVisual } from '../../components/coach-portal/nutrition/RecipeVisual';
import { MediaOverlayActions } from '../../components/MediaOverlayActions';
import { InlineProblem } from '../../components/InlineProblem';
import { useCoachPortalScope } from '../../components/coach-portal/useCoachPortalScope';
import { RECIPE_NOT_SAVED, saveRecipeThroughServer } from '../../services/recipeService';

const FOOD_DRAG_TYPE = 'NUTRITION_FOOD';
const RECIPES = '/coach/nutrition?tab=recipes';

const draftIngredientOf = (
  ingredient: RecipeIngredient,
): RecipeDraftIngredient => ({
  ...ingredient,
  grams: String(ingredient.grams),
});

interface FoodDragItem {
  foodId: string;
  name: string;
}

function DraggableFood({
  food,
  onAdd,
}: {
  food: Food;
  onAdd: (foodId: string) => void;
}) {
  const [{ isDragging }, drag] = useDrag(
    () => ({
      type: FOOD_DRAG_TYPE,
      item: { foodId: food.id, name: food.name } as FoodDragItem,
      collect: (monitor) => ({ isDragging: !!monitor.isDragging() }),
    }),
    [food.id, food.name],
  );

  return (
    <div
      ref={drag}
      className={cn(
        'group flex cursor-grab select-none items-center gap-2 rounded-control border bg-card p-3 transition-all hover:shadow-card active:cursor-grabbing',
        { 'opacity-50 ring-2 ring-primary': isDragging },
      )}
    >
      <GripVertical
        size={14}
        className="text-text-secondary"
        aria-hidden="true"
      />
      <span
        className={`size-2.5 rounded-full ${CATEGORY_SWATCH[food.category]}`}
        data-parity="food-category-dot"
        aria-hidden="true"
      />
      <span className="flex-1 text-sm font-medium text-text-primary">
        {food.name}
      </span>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={`Add ${food.name} to recipe`}
        onClick={() => onAdd(food.id)}
      >
        <Plus size={16} />
      </Button>
    </div>
  );
}

function DragLayerPreview() {
  const { isDragging, item, offset } = useDragLayer((monitor) => ({
    isDragging: monitor.isDragging(),
    item: monitor.getItem() as FoodDragItem | null,
    offset: monitor.getSourceClientOffset(),
  }));
  if (!isDragging || !offset || !item) return null;
  return (
    <div
      className="pointer-events-none fixed left-0 top-0 z-[100]"
      style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}
    >
      <div className="inline-flex items-center gap-2 rounded-control border border-primary bg-card px-3 py-2 shadow-raised">
        <GripVertical
          size={14}
          className="text-text-secondary"
          aria-hidden="true"
        />
        <span className="text-sm font-semibold text-text-primary">
          {item.name}
        </span>
      </div>
    </div>
  );
}

function OrphanedTagChip({
  label,
  onKeep,
  onRemove,
}: {
  label: string;
  onKeep: () => void;
  onRemove: () => void;
}) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border border-dashed border-border bg-transparent py-1 pl-3 pr-1 text-xs text-text-secondary"
      title="No longer in any ingredient — remove it, or click the label to keep it"
    >
      <button
        type="button"
        onClick={onKeep}
        className="font-medium transition-colors hover:text-text-primary"
        aria-label={`${label} tag is no longer in any ingredient. Click to keep it.`}
      >
        {label}
      </button>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${label} tag`}
        className="rounded-full p-0.5 transition-colors hover:bg-surface-muted hover:text-text-primary"
      >
        <X size={13} aria-hidden="true" />
      </button>
    </span>
  );
}

function RecipeBuilderInner() {
  const { recipeId } = useParams<{ recipeId?: string }>();
  const { foods, tags, recipes, getRecipe, addRecipe, updateRecipe } =
    useNutrition();
  const navigate = useNavigate();

  const existing = recipeId ? getRecipe(recipeId) : undefined;
  const [name, setName] = useState(existing?.name ?? '');
  const [imageUrl, setImageUrl] = useState<string | undefined>(
    existing?.imageUrl,
  );
  const [icon, setIcon] = useState<RecipeIcon | undefined>(existing?.icon);
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const openLibraryButton = useRef<HTMLButtonElement>(null);
  const closeLibraryButton = useRef<HTMLButtonElement>(null);
  const libraryToggled = useRef(false);
  const openLibrary = () => {
    libraryToggled.current = true;
    setLibraryOpen(true);
  };
  const closeLibrary = () => {
    libraryToggled.current = true;
    setLibraryOpen(false);
  };
  useEffect(() => {
    if (!libraryToggled.current) return;
    (libraryOpen ? closeLibraryButton : openLibraryButton).current?.focus();
  }, [libraryOpen]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [ingredients, setIngredients] = useState<RecipeDraftIngredient[]>(
    existing?.ingredients.map(draftIngredientOf) ?? [],
  );
  const [query, setQuery] = useState('');
  const [prepMinutes, setPrepMinutes] = useState(
    String(existing?.prepMinutes ?? 0),
  );
  const [cookMinutes, setCookMinutes] = useState(
    String(existing?.cookMinutes ?? 0),
  );
  const [mealRoleIds, setMealRoleIds] = useState<string[]>(
    existing?.mealRoleIds ?? [],
  );
  const [tagIds, setTagIds] = useState<string[]>(existing?.tagIds ?? []);
  const [override, setOverride] = useState<RecipeMacros | null>(
    existing?.macroOverride ?? null,
  );
  const [instructions, setInstructions] = useState(
    existing?.instructions ?? '',
  );
  const [autoTagIds, setAutoTagIds] = useState<string[]>([]);
  const [touched, setTouched] = useState(false);
  const problemIds = useId();
  const headingId = useId();
  const markTouched = () => setTouched(true);
  const { appState } = useAppState();
  const isPostMvp = appState.prototypeMode === 'post-mvp';

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      const reader = new FileReader();
      reader.onload = () => setImageUrl(reader.result as string);
      reader.readAsDataURL(f);
    }
    // Reset so the same file can be re-selected after removal
    e.target.value = '';
  };

  const toggleIn = (list: string[], id: string) =>
    list.includes(id) ? list.filter((x) => x !== id) : [...list, id];

  const addIngredient = (foodId: string) => {
    const food = foods.find((f) => f.id === foodId);
    if (!food) return;
    markTouched();
    setIngredients((prev) => [
      ...prev,
      { foodId, grams: String(food.defaultPortionGrams), method: 'raw' },
    ]);
    if (isPostMvp) suggestTagsFrom(food);
  };
  const suggestTagsFrom = (food: Food) => {
    const foodTags = food.tagIds
      .map((id) => tags.find((t) => t.id === id))
      .filter((t): t is Tag => Boolean(t));
    const mealRoleAdds = foodTags
      .filter((t) => t.family === 'meal-time')
      .map((t) => t.id)
      .filter((id) => !mealRoleIds.includes(id));
    const tagAdds = foodTags
      .filter((t) => t.family !== 'meal-time')
      .map((t) => t.id)
      .filter((id) => !tagIds.includes(id));
    if (mealRoleAdds.length)
      setMealRoleIds((prev) => [
        ...prev,
        ...mealRoleAdds.filter((id) => !prev.includes(id)),
      ]);
    if (tagAdds.length)
      setTagIds((prev) => [
        ...prev,
        ...tagAdds.filter((id) => !prev.includes(id)),
      ]);
    const autoAdds = [...mealRoleAdds, ...tagAdds];
    if (autoAdds.length)
      setAutoTagIds((prev) => [
        ...prev,
        ...autoAdds.filter((id) => !prev.includes(id)),
      ]);
  };
  const toggleTag = (family: TagFamily, id: string) => {
    markTouched();
    if (family === 'meal-time') setMealRoleIds((prev) => toggleIn(prev, id));
    else setTagIds((prev) => toggleIn(prev, id));
    setAutoTagIds((prev) => prev.filter((x) => x !== id)); // manual action → no longer auto
  };
  const removeTag = (family: TagFamily, id: string) => {
    markTouched();
    if (family === 'meal-time')
      setMealRoleIds((prev) => prev.filter((x) => x !== id));
    else setTagIds((prev) => prev.filter((x) => x !== id));
    setAutoTagIds((prev) => prev.filter((x) => x !== id));
  };
  const keepTag = (id: string) =>
    setAutoTagIds((prev) => prev.filter((x) => x !== id)); // promote to manual, stays selected

  const changeIngredient = (
    index: number,
    change: Partial<RecipeDraftIngredient>,
  ) => {
    markTouched();
    setIngredients((prev) =>
      prev.map((ing, i) => (i === index ? { ...ing, ...change } : ing)),
    );
  };
  const removeIngredient = (index: number) => {
    markTouched();
    setIngredients((prev) => prev.filter((_, i) => i !== index));
  };
  const changeIcon = (chosen: RecipeIcon | undefined) => {
    markTouched();
    setIcon(chosen);
    setIconPickerOpen(false);
  };

  const draft: RecipeDraft = {
    name,
    ingredients,
    prepMinutes,
    cookMinutes,
    instructions,
    mealRoleIds,
    tagIds,
    icon,
  };
  const problems = draftProblems(
    draft,
    recipes.filter((recipe) => recipe.id !== existing?.id),
  );
  const shownProblems: RecipeDraftProblems = touched ? problems : {};
  const nameProblemId = `${problemIds}-name`;
  const gramsProblemId = (index: number) => `${problemIds}-grams-${index}`;
  const prepProblemId = `${problemIds}-prep`;
  const cookProblemId = `${problemIds}-cook`;
  const instructionsProblemId = `${problemIds}-instructions`;

  const macros = computeRecipeMacros(
    ingredients.map((ing) => ({
      foodId: ing.foodId,
      grams: Number(ing.grams) || 0,
    })),
    foods,
  );
  const supportedTagIds = new Set(
    ingredients.flatMap(
      (ing) => foods.find((f) => f.id === ing.foodId)?.tagIds ?? [],
    ),
  );

  const save = () => {
    const payload = {
      ...recipeFrom(draft),
      macroOverride: override ?? undefined,
      imageUrl,
    };
    try {
      saveRecipeThroughServer(appState.recipeSave, () =>
        existing ? updateRecipe(existing.id, payload) : addRecipe(payload),
      );
    } catch {
      toast.error(RECIPE_NOT_SAVED);
      return;
    }
    toast.success(existing ? 'Recipe updated' : 'Recipe created');
    navigate(RECIPES);
  };

  const filteredFoods = pickableItems(foods).filter(
    (f) =>
      !query.trim() ||
      f.name.toLowerCase().includes(query.trim().toLowerCase()),
  );

  const [{ isOver, canDrop }, drop] = useDrop(
    () => ({
      accept: FOOD_DRAG_TYPE,
      drop: (item: FoodDragItem) => addIngredient(item.foodId),
      collect: (monitor) => ({
        isOver: !!monitor.isOver(),
        canDrop: !!monitor.canDrop(),
      }),
    }),
    [foods],
  );

  const isDragging = useDragLayer((monitor) => monitor.isDragging());

  return (
    <div
      className={cn('fixed inset-0 z-50 flex flex-col bg-surface-subtle', {
        'select-none': isDragging,
      })}
      data-parity-root="RecipeBuilderPage"
    >
      <header
        className="min-h-14 py-1 px-4 lg:px-6 border-b border-border rounded-field bg-card flex items-start justify-between shrink-0"
        data-parity="recipe-builder-top-bar"
      >
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="flex h-(--size-control-md) shrink-0 items-center gap-3">
            <Button asChild variant="ghost" size="icon-sm">
              <Link to={RECIPES} aria-label="Back to Nutrition">
                <ArrowLeft size={20} />
              </Link>
            </Button>
            <Button
              ref={openLibraryButton}
              onClick={openLibrary}
              variant="ghost"
              size="icon-sm"
              className="lg:hidden"
              aria-label="Open food library"
            >
              <Library size={20} />
            </Button>
          </div>
          <div className="grid w-full max-w-sm min-w-0 gap-1">
            <Input
              value={name}
              onChange={(e) => {
                markTouched();
                setName(e.target.value);
              }}
              placeholder="Recipe name…"
              aria-label="Recipe name"
              aria-invalid={shownProblems.name ? true : undefined}
              aria-describedby={shownProblems.name ? nameProblemId : undefined}
              className="font-serif text-lg"
            />
            {shownProblems.name && (
              <InlineProblem id={nameProblemId}>
                {shownProblems.name}
              </InlineProblem>
            )}
          </div>
        </div>
        <div className="flex h-(--size-control-md) items-center gap-2 shrink-0">
          <Button asChild variant="outline">
            <Link to={RECIPES} aria-label="Cancel">
              <X aria-hidden="true" />
              <span className="hidden lg:inline">Cancel</span>
            </Link>
          </Button>
          <Button
            aria-label="Save recipe"
            onClick={save}
            disabled={!isValidDraft(problems)}
          >
            <Save aria-hidden="true" />
            <span className="hidden sm:inline">Save recipe</span>
          </Button>
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 flex min-h-0">
        {/* Library sidebar */}
        {libraryOpen && (
          <div
            aria-hidden="true"
            className="lg:hidden fixed inset-0 bg-overlay-medium z-40"
            data-parity="drawer-backdrop"
            onClick={closeLibrary}
          />
        )}
        <aside
          aria-label="Food library"
          data-parity="recipe-builder-library"
          className={cn(
            'fixed inset-y-0 left-0 z-50 w-80 shrink-0 border-r border-border bg-card flex flex-col duration-300 ease-out motion-reduce:transition-none lg:visible lg:relative lg:z-auto lg:translate-x-0',
            {
              'translate-x-0 shadow-drawer transition-[translate]': libraryOpen,
              'invisible -translate-x-full transition-[translate,visibility]': !libraryOpen,
            },
          )}
        >
          <div className="p-4 px-3 border-b border-border rounded-field bg-card">
            <div className="flex items-center justify-between mb-3">
              <p className={LABEL_CLASS}>Food library</p>
              <Button
                ref={closeLibraryButton}
                onClick={closeLibrary}
                variant="ghost"
                size="icon-sm"
                className="lg:hidden"
                aria-label="Close food library"
              >
                <X size={18} />
              </Button>
            </div>
            <SearchField
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name"
              aria-label="Search foods"
              size="sm"
            />
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-surface-page">
            {filteredFoods.map((f) => (
              <DraggableFood key={f.id} food={f} onAdd={addIngredient} />
            ))}
          </div>
        </aside>

        {/* Recipe canvas */}
        <main
          aria-labelledby={headingId}
          className="flex-1 overflow-y-auto bg-surface-page p-4 lg:p-6"
        >
          <h1 id={headingId} className="sr-only">
            Recipe builder
          </h1>

          {/* Recipe visual: photo → icon → default */}
          <div className="mb-4">
            {/* Preview area */}
            <div className="relative mb-3 rounded-card overflow-hidden">
              <RecipeVisual
                recipe={{ imageUrl, icon, name: name.trim() || 'Recipe' }}
                className="h-40 w-full rounded-card"
                iconSize={48}
              />
              {imageUrl && (
                <MediaOverlayActions
                  subject="recipe photo"
                  onReplace={() => fileInputRef.current?.click()}
                  onRemove={() => setImageUrl(undefined)}
                />
              )}
            </div>

            {/* Visual controls row: Upload photo + Choose icon */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Upload photo button (only when no photo) */}
              {!imageUrl && (
                <Button
                  type="button"
                  aria-label="Upload recipe photo"
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                >
                  <ImagePlus size={16} aria-hidden="true" />
                  Upload photo
                </Button>
              )}

              {/* Icon picker popover */}
              <Popover open={iconPickerOpen} onOpenChange={setIconPickerOpen}>
                <PopoverTrigger asChild>
                  <Button type="button" variant="outline">
                    <Smile size={16} aria-hidden="true" />
                    {icon
                      ? `Icon: ${RECIPE_ICONS.find((r) => r.key === icon)?.label ?? icon}`
                      : 'Choose icon'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-72 p-3">
                  <p className={`mb-2 ${LABEL_CLASS}`}>Meal icon</p>
                  <div
                    role="listbox"
                    aria-label="Meal icon"
                    data-parity="recipe-icon-popover"
                    className="grid grid-cols-5 gap-1"
                  >
                    {/* Clear option */}
                    <button
                      type="button"
                      role="option"
                      data-focus-ring
                      aria-selected={icon === undefined}
                      onClick={() => changeIcon(undefined)}
                      className={`flex flex-col items-center gap-0.5 rounded-compact p-1.5 text-xs transition-colors ${
                        icon === undefined
                          ? 'bg-primary-soft text-primary'
                          : 'text-text-secondary hover:bg-surface-muted hover:text-text-primary'
                      }`}
                    >
                      <X size={18} aria-hidden="true" />
                      <span className="leading-none">None</span>
                    </button>

                    {RECIPE_ICONS.map(({ key, label, Icon }) => (
                      <button
                        key={key}
                        type="button"
                        role="option"
                        data-focus-ring
                        aria-selected={icon === key}
                        aria-label={label}
                        onClick={() => changeIcon(key)}
                        className={`flex flex-col items-center gap-0.5 rounded-compact p-1.5 text-xs transition-colors ${
                          icon === key
                            ? 'bg-primary-soft text-primary'
                            : 'text-text-secondary hover:bg-surface-muted hover:text-text-primary'
                        }`}
                      >
                        <Icon size={18} aria-hidden="true" />
                        <span className="leading-none">{label}</span>
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              aria-label="Recipe photo file input"
              className="sr-only"
              onChange={handleFileChange}
              tabIndex={-1}
            />
          </div>

          <div
            ref={drop}
            data-parity="recipe-ingredients"
            className={cn(
              'rounded-card border-2 border-dashed p-4 min-h-40 transition-all duration-200 motion-reduce:transition-none',
              {
                'border-primary bg-primary-soft': isOver && canDrop,
                'border-primary/30 bg-primary-soft': canDrop && !isOver,
                'border-border bg-surface-quiet': !canDrop,
              },
            )}
          >
            {ingredients.length === 0 ? (
              <p className="text-sm text-text-secondary">
                Drag foods here (or use the + on a food) to add ingredients.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {ingredients.map((ing, index) => {
                  const food = foods.find((f) => f.id === ing.foodId);
                  const gramsProblem = shownProblems.ingredients?.[index];
                  return (
                    <li
                      key={`${ing.foodId}-${index}`}
                      className="flex flex-wrap items-center gap-2 rounded-control border border-border bg-card px-3 py-2"
                    >
                      <span className="flex-1 min-w-32 text-sm font-medium text-text-primary">
                        {food?.name ?? 'Unknown food'}
                      </span>
                      <label className="flex items-center gap-1 text-xs text-text-secondary">
                        <span className="sr-only">Grams for {food?.name}</span>
                        <Input
                          type="number"
                          min="1"
                          inputMode="numeric"
                          value={ing.grams}
                          onChange={(e) =>
                            changeIngredient(index, { grams: e.target.value })
                          }
                          className="w-20"
                          aria-label={`Grams of ${food?.name}`}
                          aria-invalid={gramsProblem ? true : undefined}
                          aria-describedby={
                            gramsProblem ? gramsProblemId(index) : undefined
                          }
                        />
                        <span>g</span>
                      </label>
                      <Select
                        value={ing.method}
                        onValueChange={(v) =>
                          changeIngredient(index, {
                            method: v as CookingMethod,
                          })
                        }
                      >
                        <SelectTrigger
                          size="sm"
                          className="w-32"
                          aria-label={`Cooking method for ${food?.name}`}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {COOKING_METHODS.map((m) => (
                            <SelectItem key={m} value={m}>
                              {COOKING_METHOD_LABELS[m]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Remove ${food?.name}`}
                        onClick={() => removeIngredient(index)}
                      >
                        <Trash2 size={16} />
                      </Button>
                      {gramsProblem && (
                        <InlineProblem
                          id={gramsProblemId(index)}
                          className="basis-full"
                        >
                          {gramsProblem}
                        </InlineProblem>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Macros: auto-computed, with optional manual override */}
          <section
            aria-label="Macros"
            className="mt-4 max-w-md"
            data-parity="recipe-builder-macros"
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-text-primary">
                Macros (whole recipe)
              </p>
              {isPostMvp && (
                <label className="flex items-center gap-2 text-xs text-text-secondary">
                  <Checkbox
                    checked={override !== null}
                    onCheckedChange={(checked) =>
                      setOverride(checked ? { ...macros } : null)
                    }
                  />
                  Override manually
                </label>
              )}
            </div>
            <dl className="grid grid-cols-4 gap-2">
              {(['kcal', 'protein', 'carb', 'fat'] as const).map((key) => (
                <div
                  key={key}
                  data-parity-root="ValueTile"
                  className={cn(
                    'rounded-compact px-1.5 py-2 text-center',
                    key === 'kcal' ? 'bg-card' : MACRO_TILE[key],
                  )}
                >
                  <dt className="text-label uppercase text-text-primary">
                    {key === 'kcal'
                      ? 'kcal'
                      : key === 'protein'
                        ? 'P'
                        : key === 'carb'
                          ? 'C'
                          : 'F'}
                  </dt>
                  <dd className={`${VALUE_CLASS} tabular-nums leading-tight`}>
                    {isPostMvp && override ? (
                      <Input
                        type="number"
                        min="0"
                        inputMode="numeric"
                        value={override[key]}
                        onChange={(e) =>
                          setOverride({
                            ...override,
                            [key]: Number(e.target.value) || 0,
                          })
                        }
                        className="h-7 w-16 mx-auto text-center"
                        aria-label={`Override ${key}`}
                      />
                    ) : key === 'kcal' ? (
                      macros.kcal
                    ) : (
                      `${macros[key]}g`
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          {/* Time + roles + tags */}
          <section
            aria-label="Recipe details"
            className="mt-6 max-w-2xl grid gap-5"
            data-parity="recipe-builder-details"
          >
            <div className="flex flex-wrap items-start gap-4">
              <div className="grid w-40 content-start gap-1.5">
                <Label htmlFor="recipe-prep">Prep (min)</Label>
                <Input
                  id="recipe-prep"
                  type="number"
                  min="0"
                  inputMode="numeric"
                  value={prepMinutes}
                  onChange={(e) => {
                    markTouched();
                    setPrepMinutes(e.target.value);
                  }}
                  className="w-24"
                  aria-invalid={shownProblems.prepMinutes ? true : undefined}
                  aria-describedby={
                    shownProblems.prepMinutes ? prepProblemId : undefined
                  }
                />
                {shownProblems.prepMinutes && (
                  <InlineProblem id={prepProblemId}>
                    {shownProblems.prepMinutes}
                  </InlineProblem>
                )}
              </div>
              <div className="grid w-40 content-start gap-1.5">
                <Label htmlFor="recipe-cook">Cook (min)</Label>
                <Input
                  id="recipe-cook"
                  type="number"
                  min="0"
                  inputMode="numeric"
                  value={cookMinutes}
                  onChange={(e) => {
                    markTouched();
                    setCookMinutes(e.target.value);
                  }}
                  className="w-24"
                  aria-invalid={shownProblems.cookMinutes ? true : undefined}
                  aria-describedby={
                    shownProblems.cookMinutes ? cookProblemId : undefined
                  }
                />
                {shownProblems.cookMinutes && (
                  <InlineProblem id={cookProblemId}>
                    {shownProblems.cookMinutes}
                  </InlineProblem>
                )}
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="recipe-instructions">Instructions</Label>
              <Textarea
                id="recipe-instructions"
                rows={4}
                value={instructions}
                onChange={(e) => {
                  markTouched();
                  setInstructions(e.target.value);
                }}
                placeholder="Step-by-step cooking instructions…"
                aria-invalid={shownProblems.instructions ? true : undefined}
                aria-describedby={
                  shownProblems.instructions ? instructionsProblemId : undefined
                }
              />
              {shownProblems.instructions && (
                <InlineProblem id={instructionsProblemId}>
                  {shownProblems.instructions}
                </InlineProblem>
              )}
            </div>

            <fieldset className="grid gap-3">
              <Legend>Meal role & tags</Legend>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {TAG_FAMILIES.map((family) => {
                  const isMealTime = family === 'meal-time';
                  const selected = isMealTime ? mealRoleIds : tagIds;
                  return (
                    <div
                      key={family}
                      role="group"
                      aria-label={TAG_FAMILY_LABELS[family]}
                      className="rounded-control border border-border bg-card p-3"
                    >
                      <p className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold text-text-primary">
                        {(() => {
                          const Icon = TAG_FAMILY_ICON[family];
                          return (
                            <Icon
                              size={14}
                              className="text-text-secondary"
                              aria-hidden="true"
                            />
                          );
                        })()}
                        {TAG_FAMILY_LABELS[family]}
                      </p>
                      <ul className="flex flex-wrap gap-1.5">
                        {tags
                          .filter((t) => t.family === family)
                          .map((t) => {
                            const isSelected = selected.includes(t.id);
                            const orphaned =
                              isSelected &&
                              autoTagIds.includes(t.id) &&
                              !supportedTagIds.has(t.id);
                            return (
                              <li key={t.id}>
                                {orphaned ? (
                                  <OrphanedTagChip
                                    label={t.label}
                                    onKeep={() => keepTag(t.id)}
                                    onRemove={() => removeTag(family, t.id)}
                                  />
                                ) : (
                                  <CheckboxChip
                                    size="compact"
                                    aria-label={t.label}
                                    checked={isSelected}
                                    onCheckedChange={() =>
                                      toggleTag(family, t.id)
                                    }
                                  >
                                    {t.label}
                                  </CheckboxChip>
                                )}
                              </li>
                            );
                          })}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </fieldset>
          </section>
        </main>
      </div>
    </div>
  );
}

export function RecipeBuilderPage() {
  useCoachPortalScope();

  return (
    <DndProvider backend={TouchBackend} options={{ enableMouseEvents: true }}>
      <DragLayerPreview />
      <RecipeBuilderInner />
    </DndProvider>
  );
}
