import { useEffect, useState } from 'react';
import {
  useNutrition, FOOD_CATEGORIES, TAG_FAMILIES,
} from '../../../context/NutritionContext';
import type { Food, FoodCategory } from '../../../context/NutritionContext';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '../../ui/dialog';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '../../ui/select';
import { ToggleChip } from '../../ToggleChip';
import { CATEGORY_LABELS, TAG_FAMILY_LABELS } from './nutrition-constants';

interface FoodFormDialogProps {
  open: boolean;
  food?: Food;            // present = edit; absent = create
  onOpenChange: (open: boolean) => void;
}

interface DraftState {
  name: string;
  category: FoodCategory;
  kcal: string; protein: string; carb: string; fat: string;
  defaultPortionGrams: string;
  tagIds: string[];
  equivalenceGroupId: string; // '' = none
}

const EMPTY: DraftState = {
  name: '', category: 'protein',
  kcal: '', protein: '', carb: '', fat: '',
  defaultPortionGrams: '100', tagIds: [], equivalenceGroupId: '',
};

export function FoodFormDialog({ open, food, onOpenChange }: FoodFormDialogProps) {
  const { tags, equivalenceGroups, addFood, updateFood } = useNutrition();
  const [draft, setDraft] = useState<DraftState>(EMPTY);

  useEffect(() => {
    if (!open) return;
    setDraft(food
      ? {
          name: food.name, category: food.category,
          kcal: String(food.kcal), protein: String(food.protein),
          carb: String(food.carb), fat: String(food.fat),
          defaultPortionGrams: String(food.defaultPortionGrams),
          tagIds: [...food.tagIds],
          equivalenceGroupId: food.equivalenceGroupId ?? '',
        }
      : EMPTY);
  }, [open, food]);

  const set = <K extends keyof DraftState>(key: K, value: DraftState[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  const toggleTag = (tagId: string) =>
    setDraft((prev) => ({
      ...prev,
      tagIds: prev.tagIds.includes(tagId)
        ? prev.tagIds.filter((t) => t !== tagId)
        : [...prev.tagIds, tagId],
    }));

  const num = (s: string) => (s.trim() === '' ? 0 : Number(s));

  const save = () => {
    const payload = {
      name: draft.name.trim(),
      category: draft.category,
      kcal: num(draft.kcal), protein: num(draft.protein),
      carb: num(draft.carb), fat: num(draft.fat),
      defaultPortionGrams: num(draft.defaultPortionGrams) || 100,
      tagIds: draft.tagIds,
      equivalenceGroupId: draft.equivalenceGroupId || undefined,
    };
    if (food) updateFood(food.id, payload);
    else addFood(payload);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{food ? 'Edit food' : 'Add food'}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="food-name">Name</Label>
            <Input id="food-name" value={draft.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Chicken breast" />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="food-category">Category</Label>
            <Select value={draft.category} onValueChange={(v) => set('category', v as FoodCategory)}>
              <SelectTrigger id="food-category"><SelectValue /></SelectTrigger>
              <SelectContent>
                {FOOD_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{CATEGORY_LABELS[c]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <fieldset className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <legend className="text-sm font-medium mb-1 col-span-full">Macros (per 100 g)</legend>
            {([
              ['kcal', 'Calories'], ['protein', 'Protein (g)'],
              ['carb', 'Carbs (g)'], ['fat', 'Fat (g)'],
            ] as const).map(([key, label]) => (
              <div key={key} className="grid gap-1.5">
                <Label htmlFor={`food-${key}`}>{label}</Label>
                <Input id={`food-${key}`} type="number" min="0" inputMode="decimal"
                  value={draft[key]} onChange={(e) => set(key, e.target.value)} />
              </div>
            ))}
          </fieldset>

          <div className="grid gap-2 max-w-[12rem]">
            <Label htmlFor="food-portion">Default portion (g)</Label>
            <Input id="food-portion" type="number" min="0" inputMode="numeric"
              value={draft.defaultPortionGrams} onChange={(e) => set('defaultPortionGrams', e.target.value)} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="food-group">Swap group</Label>
            <Select value={draft.equivalenceGroupId || 'none'}
              onValueChange={(v) => set('equivalenceGroupId', v === 'none' ? '' : v)}>
              <SelectTrigger id="food-group"><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {equivalenceGroups.map((g) => (
                  <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-3">
            <p className="text-sm font-medium">Tags</p>
            {TAG_FAMILIES.map((family) => {
              const familyTags = tags.filter((t) => t.family === family);
              return (
                <fieldset key={family} className="grid gap-2">
                  <legend className="text-xs uppercase tracking-wide text-muted-foreground">
                    {TAG_FAMILY_LABELS[family]}
                  </legend>
                  <ul className="flex flex-wrap gap-2">
                    {familyTags.map((t) => (
                      <li key={t.id}>
                        <ToggleChip pressed={draft.tagIds.includes(t.id)} onPressedChange={() => toggleTag(t.id)}>
                          {t.label}
                        </ToggleChip>
                      </li>
                    ))}
                  </ul>
                </fieldset>
              );
            })}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={draft.name.trim() === ''}>
            {food ? 'Save changes' : 'Add food'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
