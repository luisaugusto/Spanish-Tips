import zod from "zod";
declare const _default: zod.ZodObject<{
    allergies: zod.ZodArray<zod.ZodString, "many">;
    calories: zod.ZodNumber;
    carbs: zod.ZodNumber;
    cookTime: zod.ZodNumber;
    country: zod.ZodString;
    description: zod.ZodString;
    diet: zod.ZodArray<zod.ZodString, "many">;
    difficulty: zod.ZodEnum<["Easy", "Medium", "Hard"]>;
    fat: zod.ZodNumber;
    fiber: zod.ZodNumber;
    ingredients: zod.ZodArray<zod.ZodObject<{
        ingredient: zod.ZodString;
        quantity: zod.ZodString;
    }, "strip", zod.ZodTypeAny, {
        ingredient: string;
        quantity: string;
    }, {
        ingredient: string;
        quantity: string;
    }>, "many">;
    instructions: zod.ZodArray<zod.ZodString, "many">;
    mealType: zod.ZodArray<zod.ZodEnum<["Breakfast", "Lunch", "Dinner", "Snack", "Dessert"]>, "many">;
    otherNutrition: zod.ZodArray<zod.ZodObject<{
        item: zod.ZodString;
        quantity: zod.ZodString;
    }, "strip", zod.ZodTypeAny, {
        quantity: string;
        item: string;
    }, {
        quantity: string;
        item: string;
    }>, "many">;
    prepTime: zod.ZodNumber;
    preparation: zod.ZodArray<zod.ZodString, "many">;
    protein: zod.ZodNumber;
    proteinType: zod.ZodArray<zod.ZodEnum<["None", "Chicken", "Beef", "Pork", "Tofu", "Fish", "Seafood", "Other"]>, "many">;
    servingSize: zod.ZodString;
    title: zod.ZodString;
}, "strip", zod.ZodTypeAny, {
    instructions: string[];
    allergies: string[];
    description: string;
    calories: number;
    carbs: number;
    cookTime: number;
    country: string;
    diet: string[];
    difficulty: "Easy" | "Medium" | "Hard";
    fat: number;
    fiber: number;
    ingredients: {
        ingredient: string;
        quantity: string;
    }[];
    mealType: ("Breakfast" | "Lunch" | "Dinner" | "Snack" | "Dessert")[];
    otherNutrition: {
        quantity: string;
        item: string;
    }[];
    prepTime: number;
    preparation: string[];
    protein: number;
    proteinType: ("None" | "Chicken" | "Beef" | "Pork" | "Tofu" | "Fish" | "Seafood" | "Other")[];
    servingSize: string;
    title: string;
}, {
    instructions: string[];
    allergies: string[];
    description: string;
    calories: number;
    carbs: number;
    cookTime: number;
    country: string;
    diet: string[];
    difficulty: "Easy" | "Medium" | "Hard";
    fat: number;
    fiber: number;
    ingredients: {
        ingredient: string;
        quantity: string;
    }[];
    mealType: ("Breakfast" | "Lunch" | "Dinner" | "Snack" | "Dessert")[];
    otherNutrition: {
        quantity: string;
        item: string;
    }[];
    prepTime: number;
    preparation: string[];
    protein: number;
    proteinType: ("None" | "Chicken" | "Beef" | "Pork" | "Tofu" | "Fish" | "Seafood" | "Other")[];
    servingSize: string;
    title: string;
}>;
export default _default;
//# sourceMappingURL=object.d.ts.map