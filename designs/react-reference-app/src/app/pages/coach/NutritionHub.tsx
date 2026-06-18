import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/tabs';
import { FoodLibrary } from '../../components/coach/nutrition/FoodLibrary';

export function NutritionHub() {
  return (
    <div className="w-full pb-12">
      <header className="mb-8">
        <h1 className="font-serif text-3xl lg:text-4xl text-[#121212] tracking-tight mb-2">
          Nutrition
        </h1>
        <p className="text-neutral-500 font-medium">
          Build your food library, recipes, and client meal plans.
        </p>
      </header>

      <Tabs defaultValue="foods">
        <TabsList>
          <TabsTrigger value="foods">Foods</TabsTrigger>
          <TabsTrigger value="recipes">Recipes</TabsTrigger>
          <TabsTrigger value="plans">Client Plans</TabsTrigger>
        </TabsList>

        <TabsContent value="foods" className="pt-6">
          <FoodLibrary />
        </TabsContent>
        <TabsContent value="recipes" className="pt-6">
          <p className="text-neutral-500">Recipes arrive in the next slice.</p>
        </TabsContent>
        <TabsContent value="plans" className="pt-6">
          <p className="text-neutral-500">Client meal plans arrive in a later slice.</p>
        </TabsContent>
      </Tabs>
    </div>
  );
}
