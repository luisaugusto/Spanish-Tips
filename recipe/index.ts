import "dotenv/config";
import type {
  Block,
  RichText,
} from "@tryfabric/martian/build/src/notion/blocks.js";
import {
  convertToBlockObjectRequest,
  createNotionPage,
  uploadImageToNotion,
} from "../api/notion.js";
import { generateData, generateImage } from "../api/openai.js";
import { markdownToBlocks, markdownToRichText } from "@tryfabric/martian";
import type { CreatePageParameters } from "@notionhq/client";
import Recipe from "./object.js";
import { getPromptFromArgs } from "../utils.js";
import { zodTextFormat } from "openai/helpers/zod";

const format = zodTextFormat(Recipe, "recipe");

const buildImagePrompt = (recipe: typeof format.__output): string => {
  const ingredientList = recipe.ingredients
    .map((ing) => `${ing.ingredient} (${ing.quantity})`)
    .join(", ");
  return [
    `A high-quality, cinematic food photograph of "${recipe.title}"`,
    recipe.description,
    `Key ingredients: ${ingredientList}.`,
    "Style: natural light, shallow depth of field, vibrant colors, soft shadows, no text, no labels, no people, professional food styling.",
  ].join("\n");
};

const buildIngredientsRichText = (recipe: typeof format.__output): RichText[] =>
  markdownToRichText(
    recipe.ingredients
      .map(
        (ingredient) => `**${ingredient.ingredient}** - ${ingredient.quantity}`,
      )
      .join("\n"),
  );

const buildNutritionRichText = (recipe: typeof format.__output): RichText[] =>
  markdownToRichText(
    recipe.otherNutrition
      .map((item) => `**${item.item}** - ${item.quantity}`)
      .join("\n"),
  );

const buildBodyBlocks = (recipe: typeof format.__output): Block[] =>
  markdownToBlocks(`# Preparation
${recipe.preparation.map((step, index) => `${index + 1}. ${step}`).join("\n")}
# Instructions
${recipe.instructions
  .map((step, index) => `${index + 1}. ${step}`)
  .join("\n")}`);

const buildInformation = (
  recipe: typeof format.__output,
): {
  blocks: Block[];
  ingredientsRT: RichText[];
  nutritionRT: RichText[];
} => ({
  blocks: buildBodyBlocks(recipe),
  ingredientsRT: buildIngredientsRichText(recipe),
  nutritionRT: buildNutritionRichText(recipe),
});

const createRecipe = async (
  recipe: typeof format.__output,
  cover: CreatePageParameters["cover"],
): Promise<void> => {
  const { blocks, ingredientsRT, nutritionRT } = buildInformation(recipe);

  await createNotionPage({
    children: convertToBlockObjectRequest(blocks),
    cover: cover ?? null,
    database_id: process.env.RECIPE_DB,
    properties: {
      Allergies: {
        multi_select: recipe.allergies.map((allergy) => ({ name: allergy })),
      },
      "Calories (cal)": { number: recipe.calories },
      "Carbs (g)": { number: recipe.carbs },
      "Cook Time (min)": { number: recipe.cookTime },
      "Country of Origin": { select: { name: recipe.country } },
      Description: {
        rich_text: [{ text: { content: recipe.description } }],
      },
      Diet: { multi_select: recipe.diet.map((item) => ({ name: item })) },
      Difficulty: { select: { name: recipe.difficulty } },
      "Fat (g)": { number: recipe.fat },
      "Fiber (g)": { number: recipe.fiber },
      Ingredients: { rich_text: ingredientsRT },
      "Meal Type": {
        multi_select: recipe.mealType.map((type) => ({ name: type })),
      },
      Name: { title: [{ text: { content: recipe.title } }] },
      "Nutrition Facts": { rich_text: nutritionRT },
      "Prep Time (min)": { number: recipe.prepTime },
      "Protein (g)": { number: recipe.protein },
      "Protein Type": {
        multi_select: recipe.proteinType.map((type) => ({ name: type })),
      },
      "Serving Size": {
        rich_text: [{ text: { content: recipe.servingSize } }],
      },
    },
  });
};

const run = async (): Promise<void> => {
  try {
    const prompt = getPromptFromArgs();
    const recipe = await generateData({
      format,
      input: prompt,
      instructions:
        "You are a helpful assistant that provides detailed cooking recipes based on user prompts. All the instructions and details should be should be clear, concise, and easy to follow.",
    });

    if (!recipe) {
      throw new Error("No recipe generated");
    }

    const imagePrompt = buildImagePrompt(recipe);
    const b64 = await generateImage(imagePrompt);
    const fileUploadId = await uploadImageToNotion(b64, recipe.title);
    const cover: CreatePageParameters["cover"] = {
      file_upload: { id: fileUploadId },
      type: "file_upload",
    };

    await createRecipe(recipe, cover);
  } catch (err) {
    throw new Error(`Error in recipe generation`, {
      cause: err,
    });
  }
};

run();
