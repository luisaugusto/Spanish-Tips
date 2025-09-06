import {
  type BlockObjectRequest,
  Client,
  type CreatePageParameters,
} from "@notionhq/client";
import type { Block } from "@tryfabric/martian/build/src/notion/blocks.js";
import { slugify } from "../utils.js";
import undici from "undici";

const { FormData } = undici;
const notion = new Client({ auth: process.env.NOTION_KEY });

// Need to find a way to ensure type safety here
// There's a mismatch between the Block type from Martian and the BlockObjectRequest type from Notion SDK
// Due to the version mismatch of the Notion API
export const convertToBlockObjectRequest = (
  blocks: Block[],
): BlockObjectRequest[] => blocks as BlockObjectRequest[];

export const uploadImageToNotion = async (
  b64: string,
  title: string,
): Promise<string> => {
  try {
    const imageBuffer = Buffer.from(b64, "base64");
    const filename = `${Date.now()}-${slugify(title) || "recipe"}.png`;
    const created = await notion.fileUploads.create({
      content_type: "image/png",
      filename,
    });
    const form = new FormData();
    form.append(
      "file",
      new Blob([imageBuffer], { type: "image/png" }),
      filename,
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
      },
    );
    if (!res.ok) {
      throw new Error(await res.text());
    }

    return created.id;
  } catch (err) {
    throw new Error(`Failed to upload image to Notion`, { cause: err });
  }
};

export const createNotionPage = async ({
  children,
  database_id,
  properties,
  cover,
}: {
  database_id: string;
  children: BlockObjectRequest[];
  properties: NonNullable<
    Parameters<typeof notion.pages.create>[0]["properties"]
  >;
  cover?: CreatePageParameters["cover"];
}): Promise<void> => {
  try {
    await notion.pages.create({
      children,
      cover: cover ?? null,
      parent: { database_id },
      properties,
    });
  } catch (err) {
    throw new Error(`Failed to create Notion page`, { cause: err });
  }
};
