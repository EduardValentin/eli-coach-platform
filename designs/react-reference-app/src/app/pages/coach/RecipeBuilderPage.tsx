import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { DndProvider, useDrag, useDrop, useDragLayer } from 'react-dnd';
import { TouchBackend } from 'react-dnd-touch-backend';
import { ArrowLeft, GripVertical, Plus, Trash2, Search } from 'lucide-react';
import {
  useNutrition, computeRecipeMacros, COOKING_METHODS,
} from '../../context/NutritionContext';
import type { Food, RecipeIngredient, CookingMethod } from '../../context/NutritionContext';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '../../components/ui/select';
import { CATEGORY_SWATCH } from '../../components/coach/nutrition/nutrition-constants';

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

export function RecipeBuilderPage() {
  const { recipeId } = useParams<{ recipeId?: string }>();
  const { foods, getRecipe, addRecipe, updateRecipe } = useNutrition();
  const navigate = useNavigate();

  const existing = recipeId ? getRecipe(recipeId) : undefined;
  const [name, setName] = useState(existing?.name ?? '');
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>(existing?.ingredients ?? []);
  const [query, setQuery] = useState('');

  const addIngredient = (foodId: string) => {
    const food = foods.find((f) => f.id === foodId);
    if (!food) return;
    setIngredients((prev) => [...prev, { foodId, grams: food.defaultPortionGrams, method: 'raw' }]);
  };
  const setGrams = (index: number, grams: number) =>
    setIngredients((prev) => prev.map((ing, i) => (i === index ? { ...ing, grams } : ing)));
  const setMethod = (index: number, method: CookingMethod) =>
    setIngredients((prev) => prev.map((ing, i) => (i === index ? { ...ing, method } : ing)));
  const removeIngredient = (index: number) =>
    setIngredients((prev) => prev.filter((_, i) => i !== index));

  const macros = computeRecipeMacros(ingredients, foods);

  const save = () => {
    const payload = {
      name: name.trim(),
      ingredients,
      prepMinutes: existing?.prepMinutes ?? 0,
      cookMinutes: existing?.cookMinutes ?? 0,
      mealRoleIds: existing?.mealRoleIds ?? [],
      tagIds: existing?.tagIds ?? [],
      macroOverride: existing?.macroOverride,
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
    <DndProvider backend={TouchBackend} options={{ enableMouseEvents: true }}>
      <DragLayerPreview />
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
                              <SelectItem key={m} value={m}>{m}</SelectItem>
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

            {/* Auto macro summary (Task 3 adds override + meta) */}
            <dl className="mt-4 grid grid-cols-4 gap-2 max-w-md">
              {[
                { label: 'kcal', value: macros.kcal },
                { label: 'P', value: `${macros.protein}g` },
                { label: 'C', value: `${macros.carb}g` },
                { label: 'F', value: `${macros.fat}g` },
              ].map((m) => (
                <div key={m.label} className="rounded-lg bg-muted py-2 text-center">
                  <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">{m.label}</dt>
                  <dd className="text-sm font-semibold text-foreground">{m.value}</dd>
                </div>
              ))}
            </dl>
          </main>
        </div>
      </div>
    </DndProvider>
  );
}
