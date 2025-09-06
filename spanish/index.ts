import "dotenv/config";
import {
  convertToBlockObjectRequest,
  generateData,
  getPromptFromArgs,
} from "../utils.js";
import type { Block } from "@tryfabric/martian/build/src/notion/blocks.js";
import { Client } from "@notionhq/client";
import Tip from "./object.js";
import { markdownToBlocks } from "@tryfabric/martian";
import { zodTextFormat } from "openai/helpers/zod";

const format = zodTextFormat(Tip, "tip");

const createBlocks = (response: typeof format.__output): Block[] => {
  const chatQuery = encodeURIComponent(
    `You are a Spanish language tutor that provides tips to help people learn Spanish. I am currently studying the topic "${response.title}", and I want to practice it. Please provide me with practice prompts that I can use to improve my understanding of this topic.`,
  );
  return markdownToBlocks(`[Practice with ChatGPT](https://chat.openai.com/?q=${chatQuery})
# Explanation
${response.explanation}
# Examples
${response.examples}
# Practice Prompt
${response.practicePrompt}`);
};

const createNotionPage = async (
  response: typeof format.__output,
): Promise<void> => {
  const notion = new Client({
    auth: process.env.NOTION_KEY,
  });
  const blocks = createBlocks(response);

  await notion.pages.create({
    children: convertToBlockObjectRequest(blocks),
    parent: { database_id: process.env.NOTION_DB },
    properties: {
      "CEFR Level": {
        select: {
          name: response.level,
        },
      },
      Category: {
        select: {
          name: response.category,
        },
      },
      "Last Reviewed": {
        date: {
          start: new Date().toISOString(),
        },
      },
      Name: {
        title: [
          {
            text: {
              content: response.title,
            },
          },
        ],
      },
      Subcategory: {
        select: {
          name: response.subcategory,
        },
      },
    },
  });
};

const run = async (): Promise<void> => {
  try {
    const input = getPromptFromArgs();
    const response = await generateData({
      format,
      input,
      instructions:
        "You are a spanish language tutor that provides tips to help people learn Spanish. Each tip should be concise, clear, and practical.",
    });

    if (!response) {
      throw new Error("No parsed data returned.");
    }

    await createNotionPage(response);
  } catch (err) {
    throw new Error("Failed to create Notion page", { cause: err });
  }
};

run();
