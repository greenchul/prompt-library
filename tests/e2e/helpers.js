import { expect } from "@playwright/test";

export const storageKey = "prompt-library.prompts";

export async function createPrompt(
  page,
  {
    title = "Review helper",
    content = "Review this code carefully.",
    model = "",
  } = {},
) {
  await page.getByRole("textbox", { name: "Title", exact: true }).fill(title);
  await page.getByRole("textbox", { name: "Prompt content" }).fill(content);
  if (model) await page.getByRole("combobox").fill(model);
  await page.getByRole("button", { name: "Save prompt" }).click();
  await expect(page.getByRole("status")).toHaveText("Prompt saved.");
}

export function card(page, title) {
  return page
    .getByRole("article")
    .filter({ has: page.getByRole("heading", { name: title, exact: true }) });
}

export async function savedPrompts(page) {
  return page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)),
    storageKey,
  );
}

export async function failWrites(page) {
  await page.evaluate((key) => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (name, value) {
      if (this === localStorage && name === key)
        throw new DOMException("Storage full", "QuotaExceededError");
      return original.call(this, name, value);
    };
  }, storageKey);
}
