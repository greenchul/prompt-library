import test from "node:test";
import assert from "node:assert/strict";
import { readPrompts, writePrompts } from "../lib/prompt-storage.js";
import { estimateTokens } from "../lib/token-estimate.js";
import { normalizeModel } from "../lib/models.js";

test("legacy records retain content and receive defaults", () => {
  const record = {
    id: "one",
    title: "Title",
    content: "Text",
    extra: "retained",
  };
  assert.deepEqual(readPrompts({ getItem: () => JSON.stringify([record]) }), [
    { ...record, model: "", isCode: false, rating: null },
  ]);
});
test("corrupt or unavailable storage throws instead of appearing empty", () => {
  for (const value of ["{", "{}", '[{"id":1}]']) {
    assert.throws(() => readPrompts({ getItem: () => value }));
  }
  assert.throws(() =>
    readPrompts({
      getItem() {
        throw Error("blocked");
      },
    }),
  );
  assert.throws(() =>
    writePrompts([], {
      setItem() {
        throw Error("full");
      },
    }),
  );
});
test("storage round trip uses the existing key and preserves metadata", () => {
  let stored;
  const storage = {
    getItem: () => stored,
    setItem(key, value) {
      assert.equal(key, "prompt-library.prompts");
      stored = value;
    },
  };
  const prompts = [
    {
      id: "a",
      title: "A",
      content: "B",
      model: "custom",
      isCode: true,
      rating: 4,
    },
  ];
  writePrompts(prompts, storage);
  assert.deepEqual(readPrompts(storage), prompts);
});
test("estimates count Unicode characters and apply code multiplier before confidence", () => {
  assert.deepEqual(estimateTokens("", false), {
    min: 0,
    max: 0,
    confidence: "high",
  });
  assert.deepEqual(estimateTokens("😀", false), {
    min: 0.75,
    max: 0.25,
    confidence: "high",
  });
  assert.equal(estimateTokens("x".repeat(4000), false).confidence, "medium");
  assert.equal(estimateTokens("x".repeat(20000), false).confidence, "medium");
  assert.equal(estimateTokens("x".repeat(20000), true).confidence, "low");
});
test("model matching accepts names and IDs while retaining custom values", () => {
  assert.equal(normalizeModel(" GPT-4.1 "), "gpt-4.1");
  assert.equal(normalizeModel(" My Model "), "My Model");
});
