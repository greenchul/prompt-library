import { test, expect } from "@playwright/test";
import {
  createPrompt,
  card,
  failWrites,
  savedPrompts,
  storageKey,
} from "./helpers.js";

test("failed save retains the complete draft", async ({ page }) => {
  await page.goto("/");
  await failWrites(page);
  await page
    .getByRole("textbox", { name: "Title", exact: true })
    .fill("Unsaved");
  await page
    .getByRole("textbox", { name: "Prompt content" })
    .fill("Keep this draft");
  await page.getByRole("combobox").fill("Custom");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Save prompt" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Changes could not be saved",
  );
  await expect(
    page.getByRole("textbox", { name: "Title", exact: true }),
  ).toHaveValue("Unsaved");
  await expect(
    page.getByRole("textbox", { name: "Prompt content" }),
  ).toHaveValue("Keep this draft");
  await expect(page.getByRole("combobox")).toHaveValue("Custom");
  await expect(page.getByRole("checkbox")).toBeChecked();
  await expect(page.getByRole("article")).toHaveCount(0);
  expect(await savedPrompts(page)).toBeNull();
});

test("failed rating restores the previous selection", async ({ page }) => {
  await page.goto("/");
  await createPrompt(page);
  const one = card(page, "Review helper").getByRole("radio", {
    name: "1 out of 5 stars",
  });
  await one.focus();
  await page.keyboard.press("Space");
  await failWrites(page);
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("status")).toContainText(
    "Changes could not be saved",
  );
  await expect(one).toBeChecked();
  expect((await savedPrompts(page))[0].rating).toBe(1);
});

test("failed deletion keeps the card and persisted record", async ({
  page,
}) => {
  await page.goto("/");
  await createPrompt(page);
  await failWrites(page);
  await page
    .getByRole("button", { name: "Delete Review helper", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "Changes could not be saved",
  );
  await expect(card(page, "Review helper")).toBeVisible();
  expect(await savedPrompts(page)).toHaveLength(1);
});

for (const inaccessible of [false, true]) {
  test(`${inaccessible ? "inaccessible" : "corrupt"} storage prevents overwriting saved data`, async ({
    page,
    context,
    baseURL,
  }) => {
    const original = inaccessible
      ? JSON.stringify([
          { id: "existing", title: "Existing", content: "Keep me" },
        ])
      : "{";
    // Seed via a temporary page, not an init script that would reset storage on reload.
    await page.goto("/");
    await page.evaluate(({ key, value }) => localStorage.setItem(key, value), {
      key: storageKey,
      value: original,
    });
    if (inaccessible) {
      await page.addInitScript((key) => {
        const originalGet = Storage.prototype.getItem;
        Storage.prototype.getItem = function (name) {
          if (this === localStorage && name === key)
            throw new DOMException("Blocked", "SecurityError");
          return originalGet.call(this, name);
        };
      }, storageKey);
    }
    await page.reload();
    await expect(page.getByRole("status")).toContainText(
      "Saved prompts could not be loaded",
    );
    await expect(
      page.getByRole("heading", { name: "A clean slate." }),
    ).toBeHidden();
    await page.getByRole("textbox", { name: "Title", exact: true }).fill("New");
    await page
      .getByRole("textbox", { name: "Prompt content" })
      .fill("Do not overwrite");
    await page.getByRole("button", { name: "Save prompt" }).click();
    await expect(page.getByRole("status")).toContainText(
      "Browser storage is unavailable",
    );
    const state = await context.storageState();
    expect(
      state.origins
        .find((origin) => origin.origin === baseURL)
        .localStorage.find((item) => item.name === storageKey).value,
    ).toBe(original);
  });
}
