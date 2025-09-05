import OpenAI from "openai";
import { Client } from "@notionhq/client";
import minimist from "minimist";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";
import "dotenv/config";
import { markdownToBlocks, markdownToRichText } from "@tryfabric/martian";

const args = minimist(process.argv.slice(2));
const prompt = args.prompt;

if (!prompt) {
  console.error("Please provide a prompt as an argument.");
  process.exit(1);
}

console.info(`Prompt received: ${prompt}`);

const Recipe = z.object({
  title: z.string({
    description: "Title of the recipe",
  }),
  difficulty: z
    .enum(["Easy", "Medium", "Hard"])
    .describe(
      "Difficulty level of the recipe in terms of time and technical skill."
    ),
  diet: z
    .array(z.string())
    .describe("Diet types such as Keto, Vegan, Vegetarian, etc."),
  allergies: z
    .array(z.string())
    .describe("Allergens such as Shellfish, Peanuts, etc."),
  protein_type: z
    .array(
      z.enum([
        "None",
        "Chicken",
        "Beef",
        "Pork",
        "Tofu",
        "Fish",
        "Seafood",
        "Other",
      ])
    )
    .describe("Types of protein used in the recipe."),
  prep_time: z.number({
    description: "Preparation time in minutes.",
  }),
  cook_time: z.number({
    description: "Cooking time in minutes.",
  }),
  description: z.string({
    description:
      "Short description of the recipe, such as it's origins, flavor profile, cooking techniques used, common pairings, and any other interesting details.",
  }),
  ingredients: z
    .array(
      z.object({
        ingredient: z.string({ description: "Ingredient name." }),
        quantity: z.string({ description: "Amount and unit, e.g., '2 cups'." }),
      })
    )
    .describe("List of ingredients with quantities."),
  preparation: z
    .array(
      z.string({
        description: "A single preparation step.",
      })
    )
    .describe("Step-by-step preparation instructions as an array of steps."),
  instructions: z
    .array(
      z.string({
        description: "A single instruction step.",
      })
    )
    .describe("Step-by-step cooking instructions as an array of steps."),
  serving_size: z.string({
    description: "Number of servings or portion description.",
  }),
  calories: z.number({
    description: "Calories (cal).",
  }),
  carbs: z.number({
    description: "Carbohydrates in grams (g).",
  }),
  protein: z.number({
    description: "Protein in grams (g).",
  }),
  fat: z.number({
    description: "Fat in grams (g).",
  }),
  fiber: z.number({
    description: "Fiber in grams (g).",
  }),
  other_nutrition: z
    .array(
      z.object({
        item: z.string({ description: "Nutrition item." }),
        quantity: z.string({ description: "Amount and unit, e.g., '2mg'." }),
      })
    )
    .describe(
      "Other nutritional details such as cholesterol, sodium, iron, zinc, potassium, vitamins, and minerals."
    ),
});

const client = new OpenAI();

const response = await client.responses.parse({
  model: "gpt-5",
  input: prompt,
  instructions:
    "You are a helpful assistant that provides detailed cooking recipes based on user prompts. All the instructions and details should be should be clear, concise, and easy to follow.",
  text: {
    format: zodTextFormat(Recipe, "recipe"),
  },
});

console.info("Response:", response.output_parsed);

// Initializing a client
const notion = new Client({
  auth: process.env.NOTION_KEY,
});

const ingredients = markdownToRichText(
  response.output_parsed.ingredients
    .map(
      (ingredient) => `**${ingredient.ingredient}** - ${ingredient.quantity}`
    )
    .join("\n")
);

const nutritionItems = markdownToRichText(
  response.output_parsed.other_nutrition
    .map((item) => `**${item.item}** - ${item.quantity}`)
    .join("\n")
);

const blocks = markdownToBlocks(`# Preparation
${response.output_parsed.preparation
  .map((step, index) => `${index + 1}. ${step}`)
  .join("\n")}
# Instructions
${response.output_parsed.instructions
  .map((step, index) => `${index + 1}. ${step}`)
  .join("\n")}`);

const createResponse = await notion.pages.create({
  parent: { database_id: process.env.RECIPE_DB },
  properties: {
    Name: {
      title: [
        {
          text: {
            content: response.output_parsed.title,
          },
        },
      ],
    },
    Difficulty: {
      select: {
        name: response.output_parsed.difficulty,
      },
    },
    Diet: {
      multi_select: response.output_parsed.diet.map((diet) => ({
        name: diet,
      })),
    },
    Allergies: {
      multi_select: response.output_parsed.allergies.map((allergy) => ({
        name: allergy,
      })),
    },
    "Protein Type": {
      multi_select: response.output_parsed.protein_type.map((type) => ({
        name: type,
      })),
    },
    Ingredients: {
      rich_text: ingredients,
    },
    "Prep Time (min)": {
      number: response.output_parsed.prep_time,
    },
    "Cook Time (min)": {
      number: response.output_parsed.cook_time,
    },
    Description: {
      rich_text: [
        {
          text: {
            content: response.output_parsed.description,
          },
        },
      ],
    },
    "Serving Size": {
      rich_text: [
        {
          text: {
            content: response.output_parsed.serving_size,
          },
        },
      ],
    },
    "Calories (cal)": {
      number: response.output_parsed.calories,
    },
    "Carbs (g)": {
      number: response.output_parsed.carbs,
    },
    "Protein (g)": {
      number: response.output_parsed.protein,
    },
    "Fat (g)": {
      number: response.output_parsed.fat,
    },
    "Fiber (g)": {
      number: response.output_parsed.fiber,
    },
    "Nutrition Facts": {
      rich_text: nutritionItems,
    },
  },
  children: blocks,
});

// Output the Notion page URL for use in the workflow
const notionUrl = createResponse.url;
console.log(`NOTION_PAGE_URL=${notionUrl}`);
