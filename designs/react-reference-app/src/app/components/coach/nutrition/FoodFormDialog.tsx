import { useEffect, useState } from 'react';
import {
  useNutrition, FOOD_CATEGORIES, TAG_FAMILIES,
} from '../../../context/NutritionContext';
import type { Food, FoodCategory, FoodIcon } from '../../../context/NutritionContext';
import { FOOD_ICONS } from './food-icons';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '../../ui/dialog';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '../../ui/select';
import { ToggleChip } from '../../ToggleChip';
import { CATEGORY_LABELS, TAG_FAMILY_DOT, TAG_FAMILY_BORDER, TAG_FAMILY_LABELS } from './nutrition-constants';

interface FoodFormDialogProps {
  open: boolean;
  food?: Food;            // present = edit; absent = create
  onOpenChange: (open: boolean) => void;
}

interface DraftState {
  name: string;
  category: FoodCategory;
  icon: FoodIcon;
  kcal: string; protein: string; carb: string; fat: string;
  defaultPortionGrams: string;
  tagIds: string[];
  equivalenceGroupId: string; // '' = none
}

const EMPTY: DraftState = {
  name: '', category: 'protein', icon: 'other',
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
          name: food.name, category: food.category, icon: food.icon ?? 'other',
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
      icon: draft.icon,
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
          <DialogDescription>
            Set the category, reference macros per 100 g, swap group, and tags for this food.
          </DialogDescription>
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

          <fieldset className="grid gap-2">
            <legend className="text-sm font-medium">Icon</legend>
            <ul className="flex flex-wrap gap-2">
              {FOOD_ICONS.map(({ key, label, Icon }) => (
                <li key={key}>
                  <button
                    type="button"
                    aria-label={label}
                    aria-pressed={draft.icon === key}
                    onClick={() => set('icon', key)}
                    className={`flex size-9 items-center justify-center rounded-lg border transition-colors ${draft.icon === key ? 'border-brand bg-brand-soft text-brand' : 'border-border text-muted-foreground hover:bg-muted'}`}
                  >
                    <Icon size={18} aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          </fieldset>

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

          <fieldset className="grid gap-3">
            <legend className="mb-1 text-sm font-medium">Tags</legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {TAG_FAMILIES.map((family) => (
                <div
                  key={family}
                  role="group"
                  aria-label={TAG_FAMILY_LABELS[family]}
                  className={`rounded-xl border border-border border-l-[3px] bg-card p-3 ${TAG_FAMILY_BORDER[family]}`}
                >
                  <p className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold text-foreground">
                    <span className={`size-1.5 rounded-full ${TAG_FAMILY_DOT[family]}`} aria-hidden="true" />
                    {TAG_FAMILY_LABELS[family]}
                  </p>
                  <ul className="flex flex-wrap gap-1.5">
                    {tags.filter((t) => t.family === family).map((t) => (
                      <li key={t.id}>
                        <ToggleChip pressed={draft.tagIds.includes(t.id)} onPressedChange={() => toggleTag(t.id)}>
                          {t.label}
                        </ToggleChip>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </fieldset>
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
