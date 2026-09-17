// Names verified against official provider model documentation.
// https://developers.openai.com/api/docs/models/gpt-4.1
// https://platform.claude.com/docs/en/models/overview
// https://ai.google.dev/gemini-api/docs/models
export const modelOptions = [
  { id: "gpt-4.1", name: "GPT-4.1", provider: "OpenAI" },
  { id: "gpt-4o", name: "GPT-4o", provider: "OpenAI" },
  { id: "claude-opus-5", name: "Claude Opus 5", provider: "Anthropic" },
  { id: "claude-sonnet-5", name: "Claude Sonnet 5", provider: "Anthropic" },
  {
    id: "claude-haiku-4-5-20251001",
    name: "Claude Haiku 4.5",
    provider: "Anthropic",
  },
  { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro", provider: "Google" },
  { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", provider: "Google" },
];

export function normalizeModel(value) {
  const entered = value.trim();
  const match = modelOptions.find((model) =>
    [model.id, model.name].some(
      (name) => name.toLowerCase() === entered.toLowerCase(),
    ),
  );
  return match?.id ?? entered;
}
