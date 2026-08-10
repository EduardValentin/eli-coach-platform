import { useSearchParams } from 'react-router';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/tabs';
import { FoodLibrary } from '../../components/coach-portal/nutrition/FoodLibrary';
import { RecipeLibrary } from '../../components/coach-portal/nutrition/RecipeLibrary';
import { ClientPlansTab } from '../../components/coach-portal/nutrition/ClientPlansTab';

const VALID_TABS = new Set(['foods', 'recipes', 'plans']);

export function NutritionHub() {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get('tab') ?? 'foods';
  const activeTab = VALID_TABS.has(rawTab) ? rawTab : 'foods';

  return (
    <div className="w-full pb-12">
      <header className="mb-8">
        <h1 className="font-serif text-3xl lg:text-4xl text-[#121212] tracking-tight mb-2">
          Nutrition
        </h1>
        <p className="text-muted-foreground font-medium">
          Build your food library, recipes, and client meal plans.
        </p>
      </header>

      <Tabs value={activeTab} onValueChange={(v) => setSearchParams({ tab: v }, { replace: true })}>
        <TabsList>
          <TabsTrigger value="foods">Foods</TabsTrigger>
          <TabsTrigger value="recipes">Recipes</TabsTrigger>
          <TabsTrigger value="plans">Meal Plans</TabsTrigger>
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
