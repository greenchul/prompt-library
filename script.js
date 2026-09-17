"use strict";

const STORAGE_KEY = "prompt-library.prompts";
// Names verified against official provider model documentation.
// https://developers.openai.com/api/docs/models/gpt-4.1
// https://platform.claude.com/docs/en/models/overview
// https://ai.google.dev/gemini-api/docs/models
const modelOptions = [
  { id: "gpt-4.1", name: "GPT-4.1", provider: "OpenAI" },
  { id: "gpt-4o", name: "GPT-4o", provider: "OpenAI" },
  { id: "claude-opus-5", name: "Claude Opus 5", provider: "Anthropic" },
  { id: "claude-sonnet-5", name: "Claude Sonnet 5", provider: "Anthropic" },
  { id: "claude-haiku-4-5-20251001", name: "Claude Haiku 4.5", provider: "Anthropic" },
  { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro", provider: "Google" },
  { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", provider: "Google" }
];
const form = document.querySelector("#prompt-form");
const modelInput = document.querySelector("#prompt-model");
const modelSuggestions = document.querySelector("#model-suggestions");
const titleInput = document.querySelector("#prompt-title");
const contentInput = document.querySelector("#prompt-content");
const codeInput = document.querySelector("#prompt-is-code");
const list = document.querySelector("#prompt-list");
const emptyState = document.querySelector("#empty-state");
const status = document.querySelector("#status");
let prompts = [];
let storageReadable = true;

let activeModelIndex = -1;
let suggestedModels = [];

function closeModelSuggestions() {
  modelSuggestions.hidden = true;
  modelInput.setAttribute("aria-expanded", "false");
  modelInput.removeAttribute("aria-activedescendant");
  activeModelIndex = -1;
}

function populateModels() {
  const query = modelInput.value.trim().toLowerCase();
  suggestedModels = modelOptions.filter(model =>
    `${model.name} ${model.id} ${model.provider}`.toLowerCase().includes(query)
  );
  modelSuggestions.replaceChildren();
  closeModelSuggestions();
  suggestedModels.forEach((model, index) => {
    const option = document.createElement("li");
    option.id = `model-suggestion-${index}`;
    option.setAttribute("role", "option");
    option.setAttribute("aria-selected", "false");
    option.textContent = model.name;
    // Keep input focus until click selection completes.
    option.addEventListener("pointerdown", event => event.preventDefault());
    option.addEventListener("click", () => selectModel(index));
    modelSuggestions.append(option);
  });
  modelSuggestions.hidden = suggestedModels.length === 0;
  modelInput.setAttribute("aria-expanded", String(!modelSuggestions.hidden));
}

function selectModel(index) {
  modelInput.value = suggestedModels[index].name;
  closeModelSuggestions();
}

modelInput.addEventListener("focus", populateModels);
modelInput.addEventListener("click", populateModels);
modelInput.addEventListener("input", populateModels);
modelInput.addEventListener("blur", closeModelSuggestions);
form.addEventListener("reset", closeModelSuggestions);
modelInput.addEventListener("keydown", event => {
  if (event.isComposing) return;
  if (event.key === "Escape") {
    if (!modelSuggestions.hidden) event.preventDefault();
    closeModelSuggestions();
  } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    event.preventDefault();
    if (modelSuggestions.hidden) populateModels();
    if (!suggestedModels.length) return;
    const direction = event.key === "ArrowDown" ? 1 : -1;
    activeModelIndex = activeModelIndex < 0
      ? (direction === 1 ? 0 : suggestedModels.length - 1)
      : (activeModelIndex + direction + suggestedModels.length) % suggestedModels.length;
    Array.from(modelSuggestions.children).forEach((option, index) => {
      option.setAttribute("aria-selected", String(index === activeModelIndex));
    });
    const activeOption = modelSuggestions.children[activeModelIndex];
    modelInput.setAttribute("aria-activedescendant", activeOption.id);
    activeOption.scrollIntoView({ block: "nearest" });
  } else if (event.key === "Enter" && !modelSuggestions.hidden && activeModelIndex >= 0) {
    event.preventDefault();
    selectModel(activeModelIndex);
  } else if (event.key === "Tab") {
    closeModelSuggestions();
  }
});

function announce(message, isError = false) {
  status.textContent = message;
  status.classList.toggle("error", isError);
}

/**
 * @typedef {{ min: number, max: number, confidence: 'high'|'medium'|'low' }} TokenEstimate
 */
/**
 * Estimate from the full text, counting whitespace-separated words and Unicode characters.
 * Keep formula results unrounded; confidence uses the larger estimate after the code multiplier.
 * @param {string} text
 * @param {boolean} isCode
 * @returns {TokenEstimate}
 */
function estimateTokens(text, isCode) {
  const wordCount = text.trim() ? text.trim().split(/\s+/u).length : 0;
  const characterCount = Array.from(text).length;
  const multiplier = isCode ? 1.3 : 1;
  const min = 0.75 * wordCount * multiplier;
  const max = 0.25 * characterCount * multiplier;
  const upperEstimate = Math.max(min, max);
  return {
    min,
    max,
    confidence: upperEstimate < 1000 ? "high" : upperEstimate <= 5000 ? "medium" : "low"
  };
}

function readPrompts() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const parsed = stored === null ? [] : JSON.parse(stored);
    if (!Array.isArray(parsed) || !parsed.every(prompt =>
      prompt && typeof prompt.id === "string" &&
      typeof prompt.title === "string" && typeof prompt.content === "string"
    )) {
      throw new Error("Invalid saved prompts");
    }
    prompts = parsed.map(prompt => ({
      ...prompt,
      model: typeof prompt.model === "string" ? prompt.model : "",
      isCode: prompt.isCode === true,
      rating: Number.isInteger(prompt.rating) && prompt.rating >= 1 && prompt.rating <= 5
        ? prompt.rating : null
    }));
    storageReadable = true;
    return true;
  } catch {
    storageReadable = false;
    announce("Saved prompts could not be loaded. Check browser storage permissions and reload to try again.", true);
    return false;
  }
}

function savePrompts(nextPrompts, shouldRender = true) {
  if (!storageReadable) {
    announce("Browser storage is unavailable. Reload and try again before making changes.", true);
    return false;
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextPrompts));
    prompts = nextPrompts;
    if (shouldRender) renderPrompts();
    return true;
  } catch {
    announce("Changes could not be saved. Browser storage may be full or unavailable.", true);
    return false;
  }
}

function createRatingComponent(prompt) {
  const group = document.createElement("fieldset");
  group.className = "rating";
  const legend = document.createElement("legend");
  legend.textContent = "Effectiveness";
  group.setAttribute("aria-label", `Rate effectiveness: ${prompt.title}`);
  const stars = document.createElement("div");
  stars.className = "rating-stars";
  const summary = document.createElement("span");
  summary.className = "rating-summary";
  const controls = [];
  let currentRating = prompt.rating;

  function paint(value) {
    controls.forEach(({ star, value: starValue }) => {
      star.textContent = starValue <= value ? "★" : "☆";
      star.classList.toggle("filled", starValue <= value);
    });
  }

  function refresh() {
    controls.forEach(({ input, value }) => { input.checked = value === currentRating; });
    summary.textContent = currentRating === null ? "Not rated" : `${currentRating} out of 5`;
    paint(currentRating ?? 0);
  }

  for (let value = 1; value <= 5; value++) {
    const label = document.createElement("label");
    label.className = "rating-option";
    const input = document.createElement("input");
    input.type = "radio";
    input.name = `rating-${prompt.id}`;
    input.value = String(value);
    input.setAttribute("aria-label", `${value} out of 5 stars`);
    const star = document.createElement("span");
    star.className = "rating-star";
    star.setAttribute("aria-hidden", "true");
    controls.push({ input, star, value });
    label.addEventListener("pointerenter", () => paint(value));
    input.addEventListener("change", () => {
      const updated = prompts.map(item => item.id === prompt.id ? { ...item, rating: value } : item);
      // Keep the controls mounted so keyboard focus survives a rating change.
      if (savePrompts(updated, false)) {
        currentRating = value;
        announce(`Rated ${prompt.title}: ${value} out of 5 stars.`);
      }
      refresh();
    });
    label.append(input, star);
    stars.append(label);
  }
  stars.addEventListener("pointerleave", () => paint(currentRating ?? 0));
  refresh();
  group.append(legend, stars, summary);
  return group;
}

function renderPrompts() {
  list.replaceChildren();
  emptyState.hidden = prompts.length > 0 || !storageReadable;

  prompts.forEach(prompt => {
    const card = document.createElement("article");
    card.className = "prompt-card";
    const title = document.createElement("h3");
    title.textContent = prompt.title;
    const preview = document.createElement("p");
    const words = prompt.content.trim().split(/\s+/);
    preview.textContent = words.slice(0, 18).join(" ") + (words.length > 18 ? "…" : "");
    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "delete-button";
    deleteButton.textContent = "Delete";
    deleteButton.setAttribute("aria-label", `Delete ${prompt.title}`);
    deleteButton.addEventListener("click", () => {
      const index = prompts.findIndex(item => item.id === prompt.id);
      if (savePrompts(prompts.filter(item => item.id !== prompt.id))) {
        announce("Prompt deleted.");
        const buttons = list.querySelectorAll("button");
        (buttons[Math.min(index, buttons.length - 1)] || titleInput).focus();
      }
    });
    card.append(title);
    if (prompt.model) {
      const badge = document.createElement("span");
      badge.className = "model-badge";
      badge.textContent = modelOptions.find(model => model.id === prompt.model)?.name ?? prompt.model;
      card.append(badge);
    }
    const estimate = estimateTokens(prompt.content, prompt.isCode);
    const tokenSummary = document.createElement("p");
    tokenSummary.className = "token-estimate";
    // Short words can invert the formula bounds; order and round only for display.
    const lower = Math.floor(Math.min(estimate.min, estimate.max));
    const upper = Math.ceil(Math.max(estimate.min, estimate.max));
    tokenSummary.textContent = `Estimated tokens: ${lower.toLocaleString()}–${upper.toLocaleString()} · ${estimate.confidence} confidence${prompt.isCode ? " · Code ×1.3" : ""}`;
    card.append(preview, tokenSummary, createRatingComponent(prompt), deleteButton);
    list.append(card);
  });
}

form.addEventListener("submit", event => {
  event.preventDefault();
  const title = titleInput.value.trim();
  const content = contentInput.value.trim();
  if (!title || !content) {
    announce("Enter a title and prompt content before saving.", true);
    (!title ? titleInput : contentInput).focus();
    return;
  }
  const id = typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const enteredModel = modelInput.value.trim();
  const normalizedModel = enteredModel.toLowerCase();
  const matchingModel = modelOptions.find(option =>
    option.id.toLowerCase() === normalizedModel || option.name.toLowerCase() === normalizedModel
  );
  const model = matchingModel?.id ?? enteredModel;
  const isCode = codeInput.checked;
  if (savePrompts([{ id, title, content, rating: null, model, isCode }, ...prompts])) {
    form.reset();
    titleInput.focus();
    announce("Prompt saved.");
  }
});

readPrompts();
renderPrompts();
