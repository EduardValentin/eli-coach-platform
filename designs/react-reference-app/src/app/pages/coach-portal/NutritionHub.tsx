import { useState, type ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Plus } from 'lucide-react';
import { PortalPageHeader } from '../../components/PortalPageHeader';
import { Button } from '../../components/ui/button';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '../../components/ui/tabs';
import { FoodLibrary } from '../../components/coach-portal/nutrition/FoodLibrary';
import { FoodFormDialog } from '../../components/coach-portal/nutrition/FoodFormDialog';
import { RecipeLibrary } from '../../components/coach-portal/nutrition/RecipeLibrary';
import { ClientPlansTab } from '../../components/coach-portal/nutrition/ClientPlansTab';
import { useAppState } from '../../context/AppContext';

const MVP_TABS = new Set(['foods', 'recipes']);
const POST_MVP_TABS = new Set(['foods', 'recipes', 'plans']);

export function NutritionHub() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { appState } = useAppState();
  const [addingFood, setAddingFood] = useState(false);
  const isPostMvp = appState.prototypeMode === 'post-mvp';
  const validTabs = isPostMvp ? POST_MVP_TABS : MVP_TABS;
  const rawTab = searchParams.get('tab') ?? 'foods';
  const activeTab = validTabs.has(rawTab) ? rawTab : 'foods';

  const tabs = (
    <TabsList>
      <TabsTrigger value="foods" className="px-4 sm:px-5">
        Foods
      </TabsTrigger>
      <TabsTrigger value="recipes" className="px-4 sm:px-5">
        Recipes
      </TabsTrigger>
      {isPostMvp && (
        <TabsTrigger value="plans" className="px-4 sm:px-5">
          Meal Plans
        </TabsTrigger>
      )}
    </TabsList>
  );

  const headerActions: Record<string, ReactNode> = {
    foods: (
      <Button type="button" variant="primary" size="md" onClick={() => setAddingFood(true)}>
        <Plus aria-hidden="true" />
        Add food
      </Button>
    ),
    recipes: (
      <Button
        type="button"
        variant="primary"
        size="md"
        onClick={() => navigate('/coach/nutrition/recipe-builder')}
      >
        <Plus aria-hidden="true" />
        New recipe
      </Button>
    ),
  };

  return (
    <div className="w-full">
      <PortalPageHeader
        title="Nutrition"
        subtitle={
          isPostMvp
            ? 'Build your food library, recipes, and client meal plans.'
            : 'Build your food library and recipes.'
        }
        actions={headerActions[activeTab]}
      />

      <Tabs
        variant="segmented"
        value={activeTab}
        onValueChange={(v) => setSearchParams({ tab: v }, { replace: true })}
        className="w-full"
      >
        <TabsContent value="foods">
          <FoodLibrary tabs={tabs} />
        </TabsContent>
        <TabsContent value="recipes">
          <RecipeLibrary tabs={tabs} />
        </TabsContent>
        {isPostMvp && (
          <TabsContent value="plans">
            <div className="mb-6">{tabs}</div>
            <ClientPlansTab />
          </TabsContent>
        )}
      </Tabs>

      <FoodFormDialog open={addingFood} onOpenChange={setAddingFood} />
    </div>
  );
}
