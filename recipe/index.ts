import "dotenv/config";
import type {
  Block,
  RichText,
} from "@tryfabric/martian/build/src/notion/blocks.js";
import { Client, type CreatePageParameters } from "@notionhq/client";
import {
  convertToBlockObjectRequest,
  generateData,
  generateImage,
  getPromptFromArgs,
} from "../utils.js";
import { markdownToBlocks, markdownToRichText } from "@tryfabric/martian";
import Recipe from "./object.js";
import undici from "undici";
import { zodTextFormat } from "openai/helpers/zod";

const { FormData } = undici;
const notion = new Client({ auth: process.env.NOTION_KEY });
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

const slugify = (str: string): string =>
  String(str)
    .replace(/[^a-z0-9]+/giu, "-")
    .toLowerCase()
    .replace(/(?:^-|-$)/gu, "");

const uploadImageToNotion = async (
  b64: string,
  title: string
): Promise<string> => {
  try {
    const imageBuffer = Buffer.from(b64, "base64");
    const filename = `${Date.now()}-${slugify(title) || "recipe"}.png`;
    const created = await notion.fileUploads.create({
      filename,
      content_type: "image/png",
    });
    const form = new FormData();
    form.append(
      "file",
      new Blob([imageBuffer], { type: "image/png" }),
      filename
    );

    const res = await fetch(
      `https://api.notion.com/v1/file_uploads/${created.id}/send`,
      {
        body: form,
        headers: {
          Authorization: `Bearer ${process.env.NOTION_KEY}`,
          "Notion-Version": "2022-06-28",
        },
        method: "POST",
      }
    );
    if (!res.ok) {
      throw new Error(await res.text());
    }

    return created.id;
  } catch (err) {
    throw new Error(`Failed to upload image to Notion`, { cause: err });
  }
};

const buildIngredientsRichText = (recipe: typeof format.__output): RichText[] =>
  markdownToRichText(
    recipe.ingredients
      .map(
        (ingredient) => `**${ingredient.ingredient}** - ${ingredient.quantity}`
      )
      .join("\n")
  );

const buildNutritionRichText = (recipe: typeof format.__output): RichText[] =>
  markdownToRichText(
    recipe.otherNutrition
      .map((item) => `**${item.item}** - ${item.quantity}`)
      .join("\n")
  );

const buildBodyBlocks = (recipe: typeof format.__output): Block[] =>
  markdownToBlocks(`# Preparation
${recipe.preparation.map((step, index) => `${index + 1}. ${step}`).join("\n")}
# Instructions
${recipe.instructions
  .map((step, index) => `${index + 1}. ${step}`)
  .join("\n")}`);

const buildInformation = (
  recipe: typeof format.__output
): {
  blocks: Block[];
  imagePrompt: string;
  ingredientsRT: RichText[];
  nutritionRT: RichText[];
} => ({
  blocks: buildBodyBlocks(recipe),
  imagePrompt: buildImagePrompt(recipe),
  ingredientsRT: buildIngredientsRichText(recipe),
  nutritionRT: buildNutritionRichText(recipe),
});

const createNotionPage = async (
  recipe: typeof format.__output,
  cover: CreatePageParameters["cover"]
): Promise<void> => {
  try {
    const { blocks, ingredientsRT, nutritionRT } = buildInformation(recipe);

    const pagePayload: Parameters<typeof notion.pages.create>[0] = {
      children: convertToBlockObjectRequest(blocks),
      cover: cover ?? null,
      parent: { database_id: process.env.RECIPE_DB },
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
    };

    await notion.pages.create(pagePayload);
  } catch (err) {
    throw new Error(`Failed to create Notion page`, { cause: err });
  }
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

    const { imagePrompt } = buildInformation(recipe);
    const b64 = await generateImage(imagePrompt);
    const fileUploadId = await uploadImageToNotion(b64, recipe.title);
    const cover: CreatePageParameters["cover"] = {
      file_upload: { id: fileUploadId },
      type: "file_upload",
    };

    await createNotionPage(recipe, cover);
  } catch (err) {
    throw new Error(`Error in recipe generation`, {
      cause: err,
    });
  }
};

run();
