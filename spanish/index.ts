import "dotenv/config";
import {
  convertToBlockObjectRequest,
  createNotionPage,
} from "../api/notion.js";
import type { Block } from "@tryfabric/martian/build/src/notion/blocks.js";
import Tip from "./object.js";
import { generateData } from "../api/openai.js";
import { getPromptFromArgs } from "../utils.js";
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
${response.uses}
# Practice Prompt
${response.practicePrompt}`);
};

const createTip = async (response: typeof format.__output): Promise<void> => {
  const blocks = createBlocks(response);

  await createNotionPage({
    children: convertToBlockObjectRequest(blocks),
    database_id: process.env.NOTION_DB,
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
        "You are a positive and cheerful spanish language tutor that provides tips to help people learn Spanish. Each tip should be clear, and practical with enough information for me to learn the concept that is being discussed.",
    });

    if (!response) {
      throw new Error("No parsed data returned.");
    }

    await createTip(response);
  } catch (err) {
    throw new Error("Failed to create Notion page", { cause: err });
  }
};

run();
