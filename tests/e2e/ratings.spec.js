import { test, expect } from "@playwright/test";
import { createPrompt, card } from "./helpers.js";

test("keyboard ratings preserve focus, remain independent, and persist", async ({
  page,
}) => {
  await page.goto("/");
  await createPrompt(page, { title: "First" });
  await createPrompt(page, { title: "Second" });
  const first = card(page, "First");
  const second = card(page, "Second");
  const title = page.getByRole("textbox", { name: "Title", exact: true });
  await expect(title).toBeFocused();
  // Title → model → content → code checkbox → save → first radio in newest card.
  for (let i = 0; i < 5; i++) await page.keyboard.press("Tab");
  await expect(
    second.getByRole("radio", { name: "1 out of 5 stars" }),
  ).toBeFocused();
  await page.keyboard.press("Space");
  await page.keyboard.press("ArrowRight");
  const two = second.getByRole("radio", { name: "2 out of 5 stars" });
  await expect(two).toBeChecked();
  await expect(two).toBeFocused();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await expect(
    first.getByRole("radio", { name: "1 out of 5 stars" }),
  ).toBeFocused();
  await page.keyboard.press("Space");
  await expect(two).toBeChecked();
  await page.reload();
  await expect(
    first.getByRole("radio", { name: "1 out of 5 stars" }),
  ).toBeChecked();
  await expect(two).toBeChecked();
});
