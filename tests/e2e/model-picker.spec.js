import { test, expect } from "@playwright/test";
import { createPrompt, card, savedPrompts } from "./helpers.js";

test("filters and selects models with arrow keys and Enter", async ({
  page,
}) => {
  await page.goto("/");
  const input = page.getByRole("combobox");
  await input.fill("gpt");
  await expect(page.getByRole("option")).toHaveText(["GPT-4.1", "GPT-4o"]);
  await input.press("ArrowDown");
  await expect(
    page.getByRole("option", { name: "GPT-4.1", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await input.press("ArrowDown");
  await input.press("ArrowUp");
  await input.press("Enter");
  await expect(input).toHaveValue("GPT-4.1");
  await expect(input).toHaveAttribute("aria-expanded", "false");
  await expect(page.getByRole("article")).toHaveCount(0);
  await createPrompt(page);
  expect((await savedPrompts(page))[0].model).toBe("gpt-4.1");
});

test("Escape and Tab dismiss suggestions and preserve navigation", async ({
  page,
}) => {
  await page.goto("/");
  const input = page.getByRole("combobox");
  await input.fill("gpt");
  await input.press("ArrowDown");
  await input.press("Escape");
  await expect(page.getByRole("listbox")).toBeHidden();
  await expect(input).toBeFocused();
  await expect(input).not.toHaveAttribute("aria-activedescendant", /.+/);
  await input.press("ArrowDown");
  await expect(page.getByRole("listbox")).toBeVisible();
  await input.press("Tab");
  await expect(
    page.getByRole("textbox", { name: "Prompt content" }),
  ).toBeFocused();
  await expect(page.getByRole("listbox")).toBeHidden();
});

test("custom model names survive reload", async ({ page }) => {
  await page.goto("/");
  await createPrompt(page, { model: "My local model" });
  await page.reload();
  await expect(card(page, "Review helper")).toContainText("My local model");
});
