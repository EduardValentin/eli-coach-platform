import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { DndProvider, useDrag, useDrop, useDragLayer } from 'react-dnd';
import { TouchBackend } from 'react-dnd-touch-backend';
import { ArrowLeft, GripVertical, Plus, Trash2, Search, X } from 'lucide-react';
import {
  useNutrition, computeRecipeMacros, COOKING_METHODS, TAG_FAMILIES,
} from '../../context/NutritionContext';
import type { Food, RecipeIngredient, CookingMethod, RecipeMacros, Tag, TagFamily } from '../../context/NutritionContext';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { ToggleChip } from '../../components/ToggleChip';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '../../components/ui/select';
import { CATEGORY_SWATCH, TAG_FAMILY_LABELS, TAG_FAMILY_BORDER, COOKING_METHOD_LABELS } from '../../components/coach/nutrition/nutrition-constants';
import { TAG_FAMILY_ICON } from '../../components/coach/nutrition/food-icons';

const FOOD_DRAG_TYPE = 'NUTRITION_FOOD';
interface FoodDragItem { foodId: string; name: string }

function DraggableFood({ food, onAdd }: { food: Food; onAdd: (foodId: string) => void }) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: FOOD_DRAG_TYPE,
    item: { foodId: food.id, name: food.name } as FoodDragItem,
    collect: (monitor) => ({ isDragging: !!monitor.isDragging() }),
  }), [food.id, food.name]);

  return (
    <div
      ref={drag}
      className={`flex cursor-grab items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 ${isDragging ? 'opacity-40' : ''}`}
    >
      <GripVertical size={14} className="text-muted-foreground" aria-hidden="true" />
      <span className={`size-2.5 rounded-full ${CATEGORY_SWATCH[food.category]}`} aria-hidden="true" />
      <span className="flex-1 text-sm font-medium text-foreground">{food.name}</span>
      <Button variant="ghost" size="icon" aria-label={`Add ${food.name} to recipe`} onClick={() => onAdd(food.id)}>
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
    <div className="pointer-events-none fixed left-0 top-0 z-[100]" style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}>
      <div className="inline-flex items-center gap-2 rounded-xl border border-brand bg-card px-3 py-2 shadow-lg">
        <GripVertical size={14} className="text-muted-foreground" aria-hidden="true" />
        <span className="text-sm font-semibold text-foreground">{item.name}</span>
      </div>
    </div>
  );
}

function OrphanedTagChip({ label, onKeep, onRemove }: { label: string; onKeep: () => void; onRemove: () => void }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border border-dashed border-border bg-transparent py-1 pl-3 pr-1 text-xs text-muted-foreground"
      title="No longer in any ingredient — remove it, or click the label to keep it"
    >
      <button
        type="button"
        onClick={onKeep}
        className="font-medium transition-colors hover:text-foreground"
        aria-label={`${label} tag is no longer in any ingredient. Click to keep it.`}
      >
        {label}
      </button>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${label} tag`}
        className="rounded-full p-0.5 transition-colors hover:bg-muted hover:text-foreground"
      >
        <X size={13} aria-hidden="true" />
      </button>
    </span>
  );
}

function RecipeBuilderInner() {
  const { recipeId } = useParams<{ recipeId?: string }>();
  const { foods, tags, getRecipe, addRecipe, updateRecipe } = useNutrition();
  const navigate = useNavigate();

  const existing = recipeId ? getRecipe(recipeId) : undefined;
  const [name, setName] = useState(existing?.name ?? '');
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>(existing?.ingredients ?? []);
  const [query, setQuery] = useState('');
  const [prepMinutes, setPrepMinutes] = useState(existing?.prepMinutes ?? 0);
  const [cookMinutes, setCookMinutes] = useState(existing?.cookMinutes ?? 0);
  const [mealRoleIds, setMealRoleIds] = useState<string[]>(existing?.mealRoleIds ?? []);
  const [tagIds, setTagIds] = useState<string[]>(existing?.tagIds ?? []);
  const [override, setOverride] = useState<RecipeMacros | null>(existing?.macroOverride ?? null);
  const [instructions, setInstructions] = useState(existing?.instructions ?? '');
  const [autoTagIds, setAutoTagIds] = useState<string[]>([]);

  const toggleIn = (list: string[], id: string) =>
    list.includes(id) ? list.filter((x) => x !== id) : [...list, id];

  const addIngredient = (foodId: string) => {
    const food = foods.find((f) => f.id === foodId);
    if (!food) return;
    setIngredients((prev) => [...prev, { foodId, grams: food.defaultPortionGrams, method: 'raw' }]);

    // Auto-derive tags from the added food (coach can still adjust)
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
    if (mealRoleAdds.length) setMealRoleIds((prev) => [...prev, ...mealRoleAdds.filter((id) => !prev.includes(id))]);
    if (tagAdds.length) setTagIds((prev) => [...prev, ...tagAdds.filter((id) => !prev.includes(id))]);
    const autoAdds = [...mealRoleAdds, ...tagAdds];
    if (autoAdds.length) setAutoTagIds((prev) => [...prev, ...autoAdds.filter((id) => !prev.includes(id))]);
  };
  const toggleTag = (family: TagFamily, id: string) => {
    if (family === 'meal-time') setMealRoleIds((prev) => toggleIn(prev, id));
    else setTagIds((prev) => toggleIn(prev, id));
    setAutoTagIds((prev) => prev.filter((x) => x !== id)); // manual action → no longer auto
  };
  const removeTag = (family: TagFamily, id: string) => {
    if (family === 'meal-time') setMealRoleIds((prev) => prev.filter((x) => x !== id));
    else setTagIds((prev) => prev.filter((x) => x !== id));
    setAutoTagIds((prev) => prev.filter((x) => x !== id));
  };
  const keepTag = (id: string) => setAutoTagIds((prev) => prev.filter((x) => x !== id)); // promote to manual, stays selected

  const setGrams = (index: number, grams: number) =>
    setIngredients((prev) => prev.map((ing, i) => (i === index ? { ...ing, grams } : ing)));
  const setMethod = (index: number, method: CookingMethod) =>
    setIngredients((prev) => prev.map((ing, i) => (i === index ? { ...ing, method } : ing)));
  const removeIngredient = (index: number) =>
    setIngredients((prev) => prev.filter((_, i) => i !== index));

  const macros = computeRecipeMacros(ingredients, foods);
  const supportedTagIds = new Set(
    ingredients.flatMap((ing) => foods.find((f) => f.id === ing.foodId)?.tagIds ?? []),
  );

  const save = () => {
    const payload = {
      name: name.trim(),
      ingredients,
      prepMinutes,
      cookMinutes,
      mealRoleIds,
      tagIds,
      macroOverride: override ?? undefined,
      instructions: instructions.trim(),
    };
    if (existing) updateRecipe(existing.id, payload);
    else addRecipe(payload);
    navigate('/coach/nutrition');
  };

  const filteredFoods = foods.filter((f) =>
    !query.trim() || f.name.toLowerCase().includes(query.trim().toLowerCase()),
  );

  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: FOOD_DRAG_TYPE,
    drop: (item: FoodDragItem) => addIngredient(item.foodId),
    collect: (monitor) => ({ isOver: !!monitor.isOver(), canDrop: !!monitor.canDrop() }),
  }), [foods]);

  return (
      <div className="fixed inset-0 z-50 flex flex-col bg-surface-subtle">
        {/* Header */}
        <div className="h-14 px-4 lg:px-6 border-b border-border bg-card flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <button
              onClick={() => navigate('/coach/nutrition')}
              aria-label="Back to Nutrition"
              className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-colors shrink-0"
            >
              <ArrowLeft size={20} />
            </button>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Recipe name…"
              aria-label="Recipe name"
              className="max-w-sm font-serif text-lg"
            />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" onClick={() => navigate('/coach/nutrition')}>Cancel</Button>
            <Button onClick={save} disabled={name.trim() === ''}>Save recipe</Button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 flex min-h-0">
          {/* Library sidebar */}
          <aside aria-label="Food library" className="w-72 shrink-0 border-r border-border bg-card flex flex-col">
            <div className="p-3 border-b border-border">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <Input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search foods…"
                  aria-label="Search foods"
                  className="pl-9"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
              {filteredFoods.map((f) => (
                <DraggableFood key={f.id} food={f} onAdd={addIngredient} />
              ))}
            </div>
          </aside>

          {/* Recipe canvas */}
          <main className="flex-1 overflow-y-auto p-4 lg:p-6">
            <h1 className="sr-only">Recipe builder</h1>
            <div
              ref={drop}
              className={`rounded-2xl border-2 border-dashed p-4 min-h-40 transition-colors ${
                isOver && canDrop ? 'border-brand bg-brand-soft' : 'border-border'
              }`}
            >
              {ingredients.length === 0 ? (
                <p className="text-sm text-muted-foreground">Drag foods here (or use the + on a food) to add ingredients.</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {ingredients.map((ing, index) => {
                    const food = foods.find((f) => f.id === ing.foodId);
                    return (
                      <li key={`${ing.foodId}-${index}`} className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card px-3 py-2">
                        <span className="flex-1 min-w-32 text-sm font-medium text-foreground">{food?.name ?? 'Unknown food'}</span>
                        <label className="flex items-center gap-1 text-xs text-muted-foreground">
                          <span className="sr-only">Grams for {food?.name}</span>
                          <Input
                            type="number" min="0" inputMode="numeric"
                            value={ing.grams}
                            onChange={(e) => setGrams(index, Number(e.target.value) || 0)}
                            className="w-20"
                            aria-label={`Grams of ${food?.name}`}
                          />
                          <span>g</span>
                        </label>
                        <Select value={ing.method} onValueChange={(v) => setMethod(index, v as CookingMethod)}>
                          <SelectTrigger size="sm" className="w-32" aria-label={`Cooking method for ${food?.name}`}><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {COOKING_METHODS.map((m) => (
                              <SelectItem key={m} value={m}>{COOKING_METHOD_LABELS[m]}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button variant="ghost" size="icon" aria-label={`Remove ${food?.name}`} onClick={() => removeIngredient(index)}>
                          <Trash2 size={16} />
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Macros: auto-computed, with optional manual override */}
            <section aria-label="Macros" className="mt-4 max-w-md">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-foreground">Macros (whole recipe)</p>
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={override !== null}
                    onChange={(e) => setOverride(e.target.checked ? { ...macros } : null)}
                  />
                  Override manually
                </label>
              </div>
              <dl className="grid grid-cols-4 gap-2">
                {(['kcal', 'protein', 'carb', 'fat'] as const).map((key) => (
                  <div key={key} className="rounded-lg bg-muted py-2 text-center">
                    <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      {key === 'kcal' ? 'kcal' : key === 'protein' ? 'P' : key === 'carb' ? 'C' : 'F'}
                    </dt>
                    <dd className="text-sm font-semibold text-foreground">
                      {override ? (
                        <Input
                          type="number" min="0" inputMode="numeric"
                          value={override[key]}
                          onChange={(e) => setOverride({ ...override, [key]: Number(e.target.value) || 0 })}
                          className="h-7 w-16 mx-auto text-center"
                          aria-label={`Override ${key}`}
                        />
                      ) : (
                        key === 'kcal' ? macros.kcal : `${macros[key]}g`
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>

            {/* Time + roles + tags */}
            <section aria-label="Recipe details" className="mt-6 max-w-2xl grid gap-5">
              <div className="flex flex-wrap gap-4">
                <div className="grid gap-1.5">
                  <Label htmlFor="recipe-prep">Prep (min)</Label>
                  <Input id="recipe-prep" type="number" min="0" inputMode="numeric" value={prepMinutes}
                    onChange={(e) => setPrepMinutes(Number(e.target.value) || 0)} className="w-24" />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="recipe-cook">Cook (min)</Label>
                  <Input id="recipe-cook" type="number" min="0" inputMode="numeric" value={cookMinutes}
                    onChange={(e) => setCookMinutes(Number(e.target.value) || 0)} className="w-24" />
                </div>
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="recipe-instructions">Instructions</Label>
                <Textarea
                  id="recipe-instructions"
                  rows={4}
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="Step-by-step cooking instructions…"
                />
              </div>

              <fieldset className="grid gap-3">
                <legend className="mb-1 text-sm font-medium">Meal role & tags</legend>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {TAG_FAMILIES.map((family) => {
                    const isMealTime = family === 'meal-time';
                    const selected = isMealTime ? mealRoleIds : tagIds;
                    return (
                      <div
                        key={family}
                        role="group"
                        aria-label={TAG_FAMILY_LABELS[family]}
                        className={`rounded-xl border border-border border-l-[3px] bg-card p-3 ${TAG_FAMILY_BORDER[family]}`}
                      >
                        <p className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold text-foreground">
                          {(() => { const Icon = TAG_FAMILY_ICON[family]; return <Icon size={14} className="text-muted-foreground" aria-hidden="true" />; })()}
                          {TAG_FAMILY_LABELS[family]}
                        </p>
                        <ul className="flex flex-wrap gap-1.5">
                          {tags.filter((t) => t.family === family).map((t) => {
                            const isSelected = selected.includes(t.id);
                            const orphaned = isSelected && autoTagIds.includes(t.id) && !supportedTagIds.has(t.id);
                            return (
                              <li key={t.id}>
                                {orphaned ? (
                                  <OrphanedTagChip
                                    label={t.label}
                                    onKeep={() => keepTag(t.id)}
                                    onRemove={() => removeTag(family, t.id)}
                                  />
                                ) : (
                                  <ToggleChip pressed={isSelected} onPressedChange={() => toggleTag(family, t.id)}>
                                    {t.label}
                                  </ToggleChip>
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
  return (
    <DndProvider backend={TouchBackend} options={{ enableMouseEvents: true }}>
      <DragLayerPreview />
      <RecipeBuilderInner />
    </DndProvider>
  );
}
