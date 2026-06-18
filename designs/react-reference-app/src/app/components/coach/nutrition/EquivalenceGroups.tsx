import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useNutrition } from '../../../context/NutritionContext';
import { Card, CardContent } from '../../ui/card';
import { Input } from '../../ui/input';
import { Button } from '../../ui/button';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '../../ui/select';
import { CATEGORY_SWATCH } from './nutrition-constants';

export function EquivalenceGroups() {
  const { foods, equivalenceGroups, addEquivalenceGroup, assignFoodToGroup } = useNutrition();
  const [newName, setNewName] = useState('');

  const create = () => {
    const name = newName.trim();
    if (!name) return;
    addEquivalenceGroup(name);
    setNewName('');
  };

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-muted-foreground">
        Group interchangeable foods (e.g. "Lean proteins"). A client can swap one for another within the same group.
      </p>

      <div className="flex flex-wrap items-end gap-2">
        <div className="grid gap-1.5">
          <label htmlFor="new-group" className="text-sm font-medium">New group</label>
          <Input id="new-group" value={newName} onChange={(e) => setNewName(e.target.value)}
            placeholder="e.g. Leafy greens" className="w-64"
            onKeyDown={(e) => { if (e.key === 'Enter') create(); }} />
        </div>
        <Button onClick={create} disabled={newName.trim() === ''}><Plus size={16} /> Create group</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {equivalenceGroups.map((group) => {
          const members = foods.filter((f) => f.equivalenceGroupId === group.id);
          return (
            <Card key={group.id}>
              <CardContent className="pt-6 flex flex-col gap-3">
                <p className="font-semibold text-foreground">{group.name}</p>
                {members.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No foods yet.</p>
                ) : (
                  <ul className="flex flex-col gap-1.5">
                    {members.map((f) => (
                      <li key={f.id} className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-2 text-sm text-foreground">
                          <span className={`size-2.5 rounded-full ${CATEGORY_SWATCH[f.category]}`} aria-hidden="true" />
                          {f.name}
                        </span>
                        <Button variant="ghost" size="sm" onClick={() => assignFoodToGroup(f.id, null)}>
                          Remove
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
                <AddToGroup groupId={group.id} />
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function AddToGroup({ groupId }: { groupId: string }) {
  const { foods, assignFoodToGroup } = useNutrition();
  const available = foods.filter((f) => f.equivalenceGroupId !== groupId);
  return (
    <Select value="" onValueChange={(foodId) => assignFoodToGroup(foodId, groupId)}>
      <SelectTrigger size="sm"><SelectValue placeholder="Add a food…" /></SelectTrigger>
      <SelectContent>
        {available.map((f) => (
          <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
