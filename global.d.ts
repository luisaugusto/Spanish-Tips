declare namespace NodeJS {
  interface ProcessEnv {
    OPENAI_API_KEY: string;
    NOTION_KEY: string;
    NOTION_DB: string;
    RECIPE_DB: string;
  }
}
