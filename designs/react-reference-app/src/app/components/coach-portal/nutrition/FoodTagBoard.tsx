import { useDrag, useDrop, useDragLayer, DndProvider } from 'react-dnd';
import { TouchBackend } from 'react-dnd-touch-backend';
import { GripVertical, X } from 'lucide-react';
import { useNutrition, TAG_FAMILIES } from '../../../context/NutritionContext';
import type { Food, Tag } from '../../../context/NutritionContext';
import { LABEL_CLASS } from '../../typography';
import { CATEGORY_SWATCH, TAG_FAMILY_LABELS } from './nutrition-constants';

const FOOD_DRAG_TYPE = 'NUTRITION_FOOD';
interface FoodDragItem {
  foodId: string;
  name: string;
}

function FoodChip({ food }: { food: Food }) {
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
      className={`inline-flex cursor-grab items-center gap-2 rounded-control border border-border bg-card px-3 py-2 ${isDragging ? 'opacity-40' : ''}`}
    >
      <GripVertical
        size={14}
        className="text-text-secondary"
        aria-hidden="true"
      />
      <span
        className={`size-2.5 rounded-full ${CATEGORY_SWATCH[food.category]}`}
        aria-hidden="true"
      />
      <span className="text-sm font-medium text-text-primary">{food.name}</span>
      {food.tagIds.length > 0 && (
        <span className="text-xs text-text-secondary">
          · {food.tagIds.length} tag{food.tagIds.length > 1 ? 's' : ''}
        </span>
      )}
    </div>
  );
}

function TagBucket({ tag }: { tag: Tag }) {
  const { foods, addFoodTag, removeFoodTag } = useNutrition();
  const tagged = foods.filter((f) => f.tagIds.includes(tag.id));

  const [{ isOver, canDrop }, drop] = useDrop(
    () => ({
      accept: FOOD_DRAG_TYPE,
      drop: (item: FoodDragItem) => addFoodTag(item.foodId, tag.id),
      collect: (monitor) => ({
        isOver: !!monitor.isOver(),
        canDrop: !!monitor.canDrop(),
      }),
    }),
    [tag.id, addFoodTag],
  );

  return (
    <div
      ref={drop}
      className={`flex min-h-24 flex-col gap-2 rounded-control border-2 border-dashed p-3 transition-colors ${
        isOver && canDrop ? 'border-primary bg-primary-soft' : 'border-border'
      }`}
    >
      <p className="text-sm font-semibold text-text-primary">{tag.label}</p>
      <ul className="flex flex-wrap gap-1.5">
        {tagged.map((f) => (
          <li
            key={f.id}
            className="inline-flex items-center gap-1 rounded-full bg-surface-quiet px-2 py-0.5"
          >
            <span className="text-xs text-text-primary">{f.name}</span>
            <button
              type="button"
              aria-label={`Remove ${tag.label} from ${f.name}`}
              onClick={() => removeFoodTag(f.id, tag.id)}
              className="text-text-secondary hover:text-text-primary"
            >
              <X size={12} />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function DragLayer() {
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
        <GripVertical size={14} className="text-text-secondary" />
        <span className="text-sm font-semibold text-text-primary">
          {item.name}
        </span>
      </div>
    </div>
  );
}

export function FoodTagBoard() {
  const { foods, tags } = useNutrition();
  return (
    <DndProvider backend={TouchBackend} options={{ enableMouseEvents: true }}>
      <DragLayer />
      <p className="mb-4 text-sm text-text-secondary">
        Drag a food onto a tag to apply it. To tag without dragging, use a
        food's Edit dialog.
      </p>
      <div className="grid gap-6 lg:grid-cols-[18rem_1fr]">
        <section aria-label="Foods" className="flex flex-col gap-2">
          <h2 className={LABEL_CLASS}>Foods</h2>
          <div className="flex flex-wrap gap-2 lg:flex-col lg:items-start">
            {foods.map((f) => (
              <FoodChip key={f.id} food={f} />
            ))}
          </div>
        </section>
        <section aria-label="Tags" className="flex flex-col gap-5">
          {TAG_FAMILIES.map((family) => (
            <div key={family}>
              <h2 className={`mb-2 ${LABEL_CLASS}`}>
                {TAG_FAMILY_LABELS[family]}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {tags
                  .filter((t) => t.family === family)
                  .map((t) => (
                    <TagBucket key={t.id} tag={t} />
                  ))}
              </div>
            </div>
          ))}
        </section>
      </div>
    </DndProvider>
  );
}
