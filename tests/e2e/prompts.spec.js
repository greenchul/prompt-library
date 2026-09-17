import { test, expect } from "@playwright/test";
import { createPrompt, card } from "./helpers.js";

test("creates a prompt and retains it after reload", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "A clean slate." }),
  ).toBeVisible();
  await createPrompt(page, { model: "GPT-4.1" });
  await page.reload();
  await expect(card(page, "Review helper")).toContainText(
    "Review this code carefully.",
  );
  await expect(card(page, "Review helper")).toContainText("GPT-4.1");
  await expect(page.getByRole("article")).toHaveCount(1);
});

test("starts with an empty collection", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "A clean slate." }),
  ).toBeVisible();
  await expect(page.getByRole("article")).toHaveCount(0);
});

test("deletes cards and restores focus, including the final card", async ({
  page,
}) => {
  await page.goto("/");
  await createPrompt(page, { title: "First" });
  await createPrompt(page, { title: "Second" });
  await page
    .getByRole("button", { name: "Delete Second", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Delete First", exact: true }),
  ).toBeFocused();
  await expect(page.getByRole("article")).toHaveCount(1);
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("textbox", { name: "Title", exact: true }),
  ).toBeFocused();
  await expect(
    page.getByRole("heading", { name: "A clean slate." }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByRole("article")).toHaveCount(0);
});

test("renders HTML-like user content literally", async ({ page }) => {
  await page.goto("/");
  const text = '<img src=x onerror="window.injected=true">';
  await createPrompt(page, { title: text, content: text, model: text });
  const prompt = card(page, text);
  await expect(prompt.getByRole("heading")).toHaveText(text);
  await expect(prompt).toContainText(text);
  await expect(prompt.locator("img")).toHaveCount(0);
  expect(await page.evaluate(() => window.injected)).toBeUndefined();
});

test("reconnection does not duplicate action handling", async ({ page }) => {
  await page.goto("/");
  await createPrompt(page);
  await page.evaluate(() => {
    const app = document.querySelector("prompt-library");
    app.remove();
    document.querySelector("main").append(app);
    window.testWrites = 0;
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (...args) {
      window.testWrites++;
      return original.apply(this, args);
    };
  });
  await createPrompt(page, { title: "After reconnect" });
  await expect(page.getByRole("article")).toHaveCount(2);
  expect(await page.evaluate(() => window.testWrites)).toBe(1);
  await page
    .getByRole("button", { name: "Delete After reconnect", exact: true })
    .click();
  expect(await page.evaluate(() => window.testWrites)).toBe(2);
});

test("narrow viewport supports saving and deletion without overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  await createPrompt(page, {
    title: "Long title ".repeat(8),
    content: "x".repeat(300),
    model: "custom-model-".repeat(12),
  });
  await expect(page.getByRole("article")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: /^Delete / }).click();
  await expect(
    page.getByRole("heading", { name: "A clean slate." }),
  ).toBeVisible();
});
