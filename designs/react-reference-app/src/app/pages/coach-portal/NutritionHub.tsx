import { useSearchParams } from 'react-router';
import { PortalPageHeader } from '../../components/PortalPageHeader';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '../../components/ui/tabs';
import { FoodLibrary } from '../../components/coach-portal/nutrition/FoodLibrary';
import { RecipeLibrary } from '../../components/coach-portal/nutrition/RecipeLibrary';
import { ClientPlansTab } from '../../components/coach-portal/nutrition/ClientPlansTab';

const VALID_TABS = new Set(['foods', 'recipes', 'plans']);

export function NutritionHub() {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get('tab') ?? 'foods';
  const activeTab = VALID_TABS.has(rawTab) ? rawTab : 'foods';

  return (
    <div className="w-full">
      <PortalPageHeader
        title="Nutrition"
        subtitle="Build your food library, recipes, and client meal plans."
      />

      <Tabs
        value={activeTab}
        onValueChange={(v) => setSearchParams({ tab: v }, { replace: true })}
      >
        <TabsList variant="segmented">
          <TabsTrigger variant="segmented" value="foods">
            Foods
          </TabsTrigger>
          <TabsTrigger variant="segmented" value="recipes">
            Recipes
          </TabsTrigger>
          <TabsTrigger variant="segmented" value="plans">
            Meal Plans
          </TabsTrigger>
        </TabsList>

        <TabsContent value="foods" className="pt-6">
          <FoodLibrary />
        </TabsContent>
        <TabsContent value="recipes" className="pt-6">
          <RecipeLibrary />
        </TabsContent>
        <TabsContent value="plans" className="pt-6">
          <ClientPlansTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
