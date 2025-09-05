import OpenAI from "openai";
import { Client } from "@notionhq/client";
import minimist from "minimist";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";
import "dotenv/config";
import { markdownToBlocks, markdownToRichText } from "@tryfabric/martian";

// Schema definition stays the same
const Recipe = z.object({
  title: z.string({ description: "Title of the recipe" }),
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
  prep_time: z.number({ description: "Preparation time in minutes." }),
  cook_time: z.number({ description: "Cooking time in minutes." }),
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
        description:
          "A single preparation step. Do not include step numbers, just the instruction.",
      })
    )
    .describe("Step-by-step preparation instructions as an array of steps."),
  instructions: z
    .array(
      z.string({
        description:
          "A single instruction step. Do not include step numbers, just the instruction.",
      })
    )
    .describe("Step-by-step cooking instructions as an array of steps."),
  serving_size: z.string({
    description:
      "Number of servings that the recipe makes and portion description.",
  }),
  calories: z.number({ description: "Calories (cal)." }),
  carbs: z.number({ description: "Carbohydrates in grams (g)." }),
  protein: z.number({ description: "Protein in grams (g)." }),
  fat: z.number({ description: "Fat in grams (g)." }),
  fiber: z.number({ description: "Fiber in grams (g)." }),
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

// Clients
const openai = new OpenAI();
const notion = new Client({ auth: process.env.NOTION_KEY });

// Utilities
function getPromptFromArgs() {
  const args = minimist(process.argv.slice(2));
  const prompt = args.prompt;
  if (!prompt)
    throw new Error(
      'Please provide a prompt as an argument. Use --prompt "..."'
    );
  console.info(`Prompt received: ${prompt}`);
  return prompt;
}

async function generateRecipe(prompt) {
  try {
    const response = await openai.responses.parse({
      model: "gpt-5",
      input: prompt,
      instructions:
        "You are a helpful assistant that provides detailed cooking recipes based on user prompts. All the instructions and details should be should be clear, concise, and easy to follow.",
      text: { format: zodTextFormat(Recipe, "recipe") },
    });
    if (!response?.output_parsed) throw new Error("No parsed recipe returned.");
    console.info("Recipe generated.");
    return response.output_parsed;
  } catch (err) {
    throw new Error(`Failed to generate recipe: ${err?.message || err}`);
  }
}

function buildImagePrompt(recipe) {
  const ingredientList = recipe.ingredients
    .map((i) => `${i.ingredient} (${i.quantity})`)
    .join(", ");
  return [
    `A high-quality, cinematic food photograph of "${recipe.title}"`,
    recipe.description,
    `Key ingredients: ${ingredientList}.`,
    "Style: natural light, shallow depth of field, vibrant colors, soft shadows, no text, no labels, no people, professional food styling.",
  ].join("\n");
}

async function generateImageBase64(imagePrompt) {
  try {
    const imageResult = await openai.images.generate({
      model: "gpt-image-1",
      prompt: imagePrompt,
      size: "1024x1024",
    });
    const b64 = imageResult?.data?.[0]?.b64_json;
    if (!b64) throw new Error("OpenAI did not return b64_json.");
    return b64;
  } catch (err) {
    throw new Error(
      `Failed to generate image (base64): ${err?.message || err}`
    );
  }
}

function slugify(str) {
  return String(str)
    .replace(/[^a-z0-9]+/gi, "-")
    .toLowerCase()
    .replace(/(^-|-$)/g, "");
}

async function uploadImageToNotion(b64, title) {
  try {
    const imageBuffer = Buffer.from(b64, "base64");
    const filename = `${Date.now()}-${slugify(title) || "recipe"}.png`;

    const created = await notion.fileUploads.create({
      mode: "single_part",
      filename,
      content_type: "image/png",
    });
    if (!created?.id)
      throw new Error("Notion did not return file upload id on create.");

    await notion.fileUploads.send({
      file_upload_id: created.id,
      file: imageBuffer,
      part_number: 1,
    });

    const completed = await notion.fileUploads.complete({
      file_upload_id: created.id,
    });
    if (!completed?.id)
      throw new Error("Notion did not return file upload id on complete.");

    console.info("Image uploaded to Notion.");
    return completed.id; // fileUploadId
  } catch (err) {
    throw new Error(`Failed to upload image to Notion: ${err?.message || err}`);
  }
}

function buildIngredientsRichText(recipe) {
  return markdownToRichText(
    recipe.ingredients
      .map(
        (ingredient) => `**${ingredient.ingredient}** - ${ingredient.quantity}`
      )
      .join("\n")
  );
}

function buildNutritionRichText(recipe) {
  return markdownToRichText(
    recipe.other_nutrition
      .map((item) => `**${item.item}** - ${item.quantity}`)
      .join("\n")
  );
}

function buildBodyBlocks(recipe) {
  return markdownToBlocks(`# Preparation
${recipe.preparation.map((step, index) => `${index + 1}. ${step}`).join("\n")}
# Instructions
${recipe.instructions
  .map((step, index) => `${index + 1}. ${step}`)
  .join("\n")}`);
}

async function createNotionPage(
  recipe,
  blocks,
  ingredientsRT,
  nutritionRT,
  cover
) {
  try {
    const pagePayload = {
      parent: { database_id: process.env.RECIPE_DB },
      properties: {
        Name: { title: [{ text: { content: recipe.title } }] },
        Difficulty: { select: { name: recipe.difficulty } },
        Diet: { multi_select: recipe.diet.map((d) => ({ name: d })) },
        Allergies: { multi_select: recipe.allergies.map((a) => ({ name: a })) },
        "Protein Type": {
          multi_select: recipe.protein_type.map((t) => ({ name: t })),
        },
        Ingredients: { rich_text: ingredientsRT },
        "Prep Time (min)": { number: recipe.prep_time },
        "Cook Time (min)": { number: recipe.cook_time },
        Description: { rich_text: [{ text: { content: recipe.description } }] },
        "Serving Size": {
          rich_text: [{ text: { content: recipe.serving_size } }],
        },
        "Calories (cal)": { number: recipe.calories },
        "Carbs (g)": { number: recipe.carbs },
        "Protein (g)": { number: recipe.protein },
        "Fat (g)": { number: recipe.fat },
        "Fiber (g)": { number: recipe.fiber },
        "Nutrition Facts": { rich_text: nutritionRT },
      },
      children: blocks,
      ...(cover ? { cover } : {}),
    };

    const created = await notion.pages.create(pagePayload);
    if (!created?.url) throw new Error("Notion did not return page URL.");
    console.info("Notion page created.");
    return created.url;
  } catch (err) {
    throw new Error(`Failed to create Notion page: ${err?.message || err}`);
  }
}

async function run() {
  try {
    const prompt = getPromptFromArgs();

    // 1) Generate recipe
    const recipe = await generateRecipe(prompt);

    // 2) Prepare Notion content
    const ingredientsRT = buildIngredientsRichText(recipe);
    const nutritionRT = buildNutritionRichText(recipe);
    const blocks = buildBodyBlocks(recipe);

    // 3) Image generation and upload
    const imagePrompt = buildImagePrompt(recipe);

    let cover = null;
    const b64 = await generateImageBase64(imagePrompt);
    const fileUploadId = await uploadImageToNotion(b64, recipe.title);
    cover = { type: "file_upload", file_upload: { id: fileUploadId } };

    // 4) Create Notion page
    const notionUrl = await createNotionPage(
      recipe,
      blocks,
      ingredientsRT,
      nutritionRT,
      cover
    );
    console.log(`NOTION_PAGE_URL=${notionUrl}`);
  } catch (err) {
    console.error(err?.message || err);
    process.exit(1);
  }
}

run();
