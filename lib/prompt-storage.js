const STORAGE_KEY = "prompt-library.prompts";

export function readPrompts(storage = localStorage) {
  const stored = storage.getItem(STORAGE_KEY);
  const parsed = stored === null ? [] : JSON.parse(stored);
  if (
    !Array.isArray(parsed) ||
    !parsed.every(
      (prompt) =>
        prompt &&
        typeof prompt.id === "string" &&
        typeof prompt.title === "string" &&
        typeof prompt.content === "string",
    )
  )
    throw new Error("Invalid saved prompts");
  return parsed.map((prompt) => ({
    ...prompt,
    model: typeof prompt.model === "string" ? prompt.model : "",
    isCode: prompt.isCode === true,
    rating:
      Number.isInteger(prompt.rating) &&
      prompt.rating >= 1 &&
      prompt.rating <= 5
        ? prompt.rating
        : null,
  }));
}

export function writePrompts(prompts, storage = localStorage) {
  storage.setItem(STORAGE_KEY, JSON.stringify(prompts));
}
