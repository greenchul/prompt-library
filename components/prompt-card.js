import { Component } from "./component.js";
import { modelOptions } from "../lib/models.js";
import { estimateTokens } from "../lib/token-estimate.js";
import "./star-rating.js";

export class PromptCard extends Component {
  set prompt(value) {
    this._prompt = value;
    if (this.ratingControl) this.ratingControl.value = value.rating;
  }
  get prompt() {
    return this._prompt;
  }
  initialize() {
    const prompt = this.prompt;
    const card = document.createElement("article");
    card.className = "prompt-card";
    const title = document.createElement("h3");
    title.textContent = prompt.title;
    const preview = document.createElement("p");
    const words = prompt.content.trim().split(/\s+/);
    preview.textContent =
      words.slice(0, 18).join(" ") + (words.length > 18 ? "…" : "");
    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "delete-button";
    deleteButton.textContent = "Delete";
    deleteButton.setAttribute("aria-label", `Delete ${prompt.title}`);
    deleteButton.addEventListener("click", () => {
      this.emit("prompt-delete", { id: prompt.id });
    });
    card.append(title);
    if (prompt.model) {
      const badge = document.createElement("span");
      badge.className = "model-badge";
      badge.textContent =
        modelOptions.find((model) => model.id === prompt.model)?.name ??
        prompt.model;
      card.append(badge);
    }
    const estimate = estimateTokens(prompt.content, prompt.isCode);
    const tokenSummary = document.createElement("p");
    tokenSummary.className = "token-estimate";
    // Short words can invert the formula bounds; order and round only for display.
    const lower = Math.floor(Math.min(estimate.min, estimate.max));
    const upper = Math.ceil(Math.max(estimate.min, estimate.max));
    tokenSummary.textContent = `Estimated tokens: ${lower.toLocaleString()}–${upper.toLocaleString()} · ${estimate.confidence} confidence${prompt.isCode ? " · Code ×1.3" : ""}`;
    const rating = document.createElement("star-rating");
    rating.promptTitle = prompt.title;
    rating.value = prompt.rating;
    rating.addEventListener("rating-change", (event) => {
      event.stopPropagation();
      this.emit("prompt-rate", { id: prompt.id, rating: event.detail.value });
    });
    this.ratingControl = rating;
    card.append(preview, tokenSummary, rating, deleteButton);
    this.append(card);
  }
  focusDelete() {
    this.querySelector("button").focus();
  }
}
customElements.define("prompt-card", PromptCard);
