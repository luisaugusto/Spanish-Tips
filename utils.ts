import minimist from "minimist";

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

export const slugify = (str: string): string =>
  String(str)
    .replace(/[^a-z0-9]+/giu, "-")
    .toLowerCase()
    .replace(/(?:^-|-$)/gu, "");
