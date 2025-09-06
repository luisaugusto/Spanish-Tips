import type { ParsedResponse, ResponseFormatTextConfig } from "openai/resources/responses/responses.mjs";
import type { Block } from "@tryfabric/martian/build/src/notion/blocks.js";
import type { BlockObjectRequest } from "@notionhq/client";
import type { ExtractParsedContentFromParams } from "openai/lib/ResponsesParser.mjs";
export declare const generateData: <T extends ResponseFormatTextConfig>({ input, instructions, format, }: {
    input: string;
    instructions: string;
    format: T;
}) => Promise<ParsedResponse<NonNullable<ExtractParsedContentFromParams<{
    input: string;
    instructions: string;
    model: "gpt-5";
    text: {
        format: T;
    };
}>>>["output_parsed"]>;
export declare const generateImage: (prompt: string) => Promise<string>;
export declare const getPromptFromArgs: () => string;
export declare const convertToBlockObjectRequest: (blocks: Block[]) => BlockObjectRequest[];
//# sourceMappingURL=utils.d.ts.map