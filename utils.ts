import type {
  ParsedResponse,
  ResponseFormatTextConfig,
} from "openai/resources/responses/responses.mjs";
import type { Block } from "@tryfabric/martian/build/src/notion/blocks.js";
import type { BlockObjectRequest } from "@notionhq/client";
import type { ExtractParsedContentFromParams } from "openai/lib/ResponsesParser.mjs";
import OpenAI from "openai";
import minimist from "minimist";

export const generateData = async <T extends ResponseFormatTextConfig>({
  input,
  instructions,
  format,
}: {
  input: string;
  instructions: string;
  format: T;
}): Promise<
  ParsedResponse<
    NonNullable<
      ExtractParsedContentFromParams<{
        input: string;
        instructions: string;
        model: "gpt-5";
        text: { format: T };
      }>
    >
  >["output_parsed"]
> => {
  const openai = new OpenAI();

  try {
    const response = await openai.responses.parse({
      input,
      instructions,
      model: "gpt-5",
      text: { format },
    });

    if (!response?.output_parsed) {
      throw new Error("No parsed data returned.");
    }
    return response.output_parsed;
  } catch (err) {
    throw new Error("Failed to generate data", { cause: err });
  }
};

export const generateImage = async (prompt: string): Promise<string> => {
  const openai = new OpenAI();

  try {
    const imageResult = await openai.images.generate({
      model: "gpt-image-1",
      prompt,
      size: "1024x1024",
    });
    const b64 = imageResult?.data?.[0]?.b64_json;
    if (!b64) {
      throw new Error("OpenAI did not return b64_json.");
    }
    return b64;
  } catch (err) {
    throw new Error("Failed to generate image (base64)", { cause: err });
  }
};

export const getPromptFromArgs = (): string => {
  const args = minimist(process.argv.slice(2));
  const { prompt } = args;

  if (!prompt) {
    throw new Error(
      'Please provide a prompt as an argument. Use --prompt "..."',
    );
  }
  return String(prompt);
};

// Need to find a way to ensure type safety here
export const convertToBlockObjectRequest = (
  blocks: Block[],
): BlockObjectRequest[] => blocks as BlockObjectRequest[];
