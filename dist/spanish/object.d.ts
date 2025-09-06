import zod from "zod";
declare const _default: zod.ZodObject<{
    category: zod.ZodEnum<["🔷 Core Grammar & Verb Use", "🟨 Vocabulary & Word Use", "🟩 Conversation & Usage", "🟫 Pronunciation & Listening", "🟪 Cultural / Regional Variation"]>;
    examples: zod.ZodString;
    explanation: zod.ZodString;
    level: zod.ZodEnum<["🟢 A1: Beginner", "🟡 A2:Elementary", "🔵 B1: Intermediate", "🟣 B2: Upper Intermediate", "🔴 C1: Advanced", "⚫ C2: Proficient"]>;
    practicePrompt: zod.ZodString;
    subcategory: zod.ZodEnum<["Verb Conjugation", "Verb Usage / Meaning Differences", "Tense & Mood", "Grammar Structures", "Vocabulary", "Common Mistakes / False Friends", "Synonyms & Word Nuances", "Phrase Patterns / Sentence Starters", "Questions & Interrogatives", "Idiomatic Expressions", "Formality & Register", "Pronunciation", "Listening Tips", "Regional Usage", "Cultural Notes"]>;
    title: zod.ZodString;
}, "strip", zod.ZodTypeAny, {
    title: string;
    category: "🔷 Core Grammar & Verb Use" | "🟨 Vocabulary & Word Use" | "🟩 Conversation & Usage" | "🟫 Pronunciation & Listening" | "🟪 Cultural / Regional Variation";
    examples: string;
    explanation: string;
    level: "🟢 A1: Beginner" | "🟡 A2:Elementary" | "🔵 B1: Intermediate" | "🟣 B2: Upper Intermediate" | "🔴 C1: Advanced" | "⚫ C2: Proficient";
    practicePrompt: string;
    subcategory: "Verb Conjugation" | "Verb Usage / Meaning Differences" | "Tense & Mood" | "Grammar Structures" | "Vocabulary" | "Common Mistakes / False Friends" | "Synonyms & Word Nuances" | "Phrase Patterns / Sentence Starters" | "Questions & Interrogatives" | "Idiomatic Expressions" | "Formality & Register" | "Pronunciation" | "Listening Tips" | "Regional Usage" | "Cultural Notes";
}, {
    title: string;
    category: "🔷 Core Grammar & Verb Use" | "🟨 Vocabulary & Word Use" | "🟩 Conversation & Usage" | "🟫 Pronunciation & Listening" | "🟪 Cultural / Regional Variation";
    examples: string;
    explanation: string;
    level: "🟢 A1: Beginner" | "🟡 A2:Elementary" | "🔵 B1: Intermediate" | "🟣 B2: Upper Intermediate" | "🔴 C1: Advanced" | "⚫ C2: Proficient";
    practicePrompt: string;
    subcategory: "Verb Conjugation" | "Verb Usage / Meaning Differences" | "Tense & Mood" | "Grammar Structures" | "Vocabulary" | "Common Mistakes / False Friends" | "Synonyms & Word Nuances" | "Phrase Patterns / Sentence Starters" | "Questions & Interrogatives" | "Idiomatic Expressions" | "Formality & Register" | "Pronunciation" | "Listening Tips" | "Regional Usage" | "Cultural Notes";
}>;
export default _default;
//# sourceMappingURL=object.d.ts.map