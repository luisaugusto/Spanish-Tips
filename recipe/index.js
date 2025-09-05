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

// Initialize Notion client early (used by file uploads and page creation)
const notion = new Client({
  auth: process.env.NOTION_KEY,
});

// Generate an image for the recipe using OpenAI Images and upload to Notion via File Uploads API
let fileUploadId;
let imageUrl; // fallback if needed
try {
  const ingredientList = response.output_parsed.ingredients
    .map((i) => `${i.ingredient} (${i.quantity})`)
    .join(", ");
  const imagePrompt = [
    `A high-quality, cinematic food photograph of "${response.output_parsed.title}"`,
    response.output_parsed.description,
    `Key ingredients: ${ingredientList}.`,
    "Style: natural light, shallow depth of field, vibrant colors, soft shadows, no text, no labels, no people, professional food styling.",
  ].join("\n");

  // Request base64 so we can upload directly to Notion
  const imageResult = await client.images.generate({
    model: "gpt-image-1",
    prompt: imagePrompt,
    size: "1024x1024",
    response_format: "b64_json",
  });

  const b64 = imageResult.data?.[0]?.b64_json;
  if (!b64) {
    throw new Error("No b64_json returned from OpenAI Images API");
  }

  const imageBuffer = Buffer.from(b64, "base64");
  const filenameSlug = response.output_parsed.title
    .replace(/[^a-z0-9]+/gi, "-")
    .toLowerCase()
    .replace(/(^-|-$)/g, "");
  const filename = `${Date.now()}-${filenameSlug || "recipe"}.png`;

  // 1) Create file upload in Notion (single-part upload)
  const created = await notion.fileUploads.create({
    mode: "upload",
    filename,
    content_type: "image/png",
    number_of_parts: 1,
  });

  // 2) Send the file content
  await notion.fileUploads.send({
    file_upload_id: created.id,
    file: imageBuffer,
    part_number: 1,
  });

  // 3) Complete the upload
  const completed = await notion.fileUploads.complete({
    file_upload_id: created.id,
  });

  fileUploadId = completed.id;
  console.info("Notion file upload completed:", fileUploadId);
} catch (err) {
  console.warn(
    "Notion file upload failed, falling back to external URL cover:",
    err?.message || err
  );
  try {
    // Fallback: request a URL from OpenAI and use it as external cover
    const ingredientList = response.output_parsed.ingredients
      .map((i) => `${i.ingredient} (${i.quantity})`)
      .join(", ");
    const imagePrompt = [
      `A high-quality, cinematic food photograph of "${response.output_parsed.title}"`,
      response.output_parsed.description,
      `Key ingredients: ${ingredientList}.`,
      "Style: natural light, shallow depth of field, vibrant colors, soft shadows, no text, no labels, no people, professional food styling.",
    ].join("\n");

    const urlResult = await client.images.generate({
      model: "gpt-image-1",
      prompt: imagePrompt,
      size: "1024x1024",
      response_format: "url",
    });
    imageUrl = urlResult.data?.[0]?.url;
    if (imageUrl) console.info("Generated image URL (fallback):", imageUrl);
  } catch (fallbackErr) {
    console.warn(
      "Fallback URL generation failed:",
      fallbackErr?.message || fallbackErr
    );
  }
}

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

// Build the page payload and conditionally add a cover image
const pagePayload = {
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
};

if (fileUploadId) {
  pagePayload.cover = {
    type: "file_upload",
    file_upload: { id: fileUploadId },
  };
} else if (imageUrl) {
  pagePayload.cover = {
    type: "external",
    external: { url: imageUrl },
  };
}

const createResponse = await notion.pages.create(pagePayload);

// Output the Notion page URL for use in the workflow
const notionUrl = createResponse.url;
console.log(`NOTION_PAGE_URL=${notionUrl}`);
