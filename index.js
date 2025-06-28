import OpenAI from "openai";
import { Client } from "@notionhq/client";
import minimist from "minimist";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";
import "dotenv/config";
import { markdownToBlocks } from "@tryfabric/martian";

const args = minimist(process.argv.slice(2));
const prompt = args.prompt;

if (!prompt) {
  console.error("Please provide a prompt as an argument.");
  process.exit(1);
}

console.info(`Prompt received: ${prompt}`);

const Tip = z.object({
  title: z.string({
    description: "A concise title for the tip, ideally 5-10 words.",
  }),
  category: z.enum([
    "🔷 Core Grammar & Verb Use",
    "🟨 Vocabulary & Word Use",
    "🟩 Conversation & Usage",
    "🟫 Pronunciation & Listening",
    "🟪 Cultural / Regional Variation",
  ]),
  subcategory: z.enum([
    "Verb Conjugation",
    "Verb Usage / Meaning Differences",
    "Tense & Mood",
    "Grammar Structures",
    "Vocabulary",
    "Common Mistakes / False Friends",
    "Synonyms & Word Nuances",
    "Phrase Patterns / Sentence Starters",
    "Questions & Interrogatives",
    "Idiomatic Expressions",
    "Formality & Register",
    "Pronunciation",
    "Listening Tips",
    "Regional Usage",
    "Cultural Notes",
  ]),
  level: z.enum([
    "🟢 A1: Beginner",
    "🟡 A2:Elementary",
    "🔵 B1: Intermediate",
    "🟣 B2: Upper Intermediate",
    "🔴 C1: Advanced",
    "⚫ C2: Proficient",
  ]),
  explanation: z.string({
    description:
      "A clear explanation of the tip. You can use markdown formatting for emphasis.",
  }),
  examples: z.string({
    description:
      "Put the tip into practice by providing 2-3 spanish sentences of phrases that show the tip in use. You can use markdown formatting for emphasis.",
  }),
  practice_prompt: z.string({
    description:
      "Give a homework prompt for the user so that they can practice the tip. You can use markdown formatting for emphasis.",
  }),
});

const client = new OpenAI();

const response = await client.responses.parse({
  model: "gpt-4.1",
  input: prompt,
  instructions:
    "You are a spanish language tutor that provides tips to help people learn Spanish. Each tip should be concise, clear, and practical.",
  text: {
    format: zodTextFormat(Tip, "tip"),
  },
});

console.info("Response:", response.output_parsed);

// Initializing a client
const notion = new Client({
  auth: process.env.NOTION_KEY,
});

const blocks = markdownToBlocks(`# Explanation
${response.output_parsed.explanation}
# Examples
${response.output_parsed.examples}
# Practice Prompt
${response.output_parsed.practice_prompt}`);

const createResponse = await notion.pages.create({
  parent: { database_id: process.env.NOTION_DB },
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
    Category: {
      select: {
        name: response.output_parsed.category,
      },
    },
    Subcategory: {
      select: {
        name: response.output_parsed.subcategory,
      },
    },
    "CEFR Level": {
      select: {
        name: response.output_parsed.level,
      },
    },
    "Last Reviewed": {
      date: {
        start: new Date().toISOString(),
      },
    },
  },
  children: blocks,
});

// Output the Notion page URL for use in the workflow
const notionUrl = createResponse.url;
console.log(`NOTION_PAGE_URL=${notionUrl}`);
