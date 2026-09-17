import { Component } from "./component.js";
import { readPrompts, writePrompts } from "../lib/prompt-storage.js";
import "./prompt-editor.js";
import "./prompt-collection.js";

export class PromptLibrary extends Component {
  initialize() {
    this.innerHTML = `<div class="workspace"><prompt-editor></prompt-editor><prompt-collection></prompt-collection></div><p class="status" role="status" aria-live="polite"></p>`;
    this.editor = this.querySelector("prompt-editor");
    this.collection = this.querySelector("prompt-collection");
    this.status = this.querySelector(".status");
    this.prompts = [];
    this.readable = true;
    try {
      this.prompts = readPrompts();
    } catch {
      this.readable = false;
      this.announce(
        "Saved prompts could not be loaded. Check browser storage permissions and reload to try again.",
        true,
      );
    }
    this.collection.update(this.prompts, this.readable);
    this.addEventListener("prompt-invalid", (event) =>
      this.announce(event.detail.message, true),
    );
    this.addEventListener("prompt-create", (event) => {
      const id =
        typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      if (this.save([{ ...event.detail, id, rating: null }, ...this.prompts])) {
        this.editor.reset();
        this.announce("Prompt saved.");
      }
    });
    this.addEventListener("prompt-delete", (event) => {
      const index = this.prompts.findIndex(
        (prompt) => prompt.id === event.detail.id,
      );
      if (
        this.save(
          this.prompts.filter((prompt) => prompt.id !== event.detail.id),
        )
      ) {
        this.announce("Prompt deleted.");
        if (!this.collection.focusAfterDelete(index)) this.editor.focusTitle();
      }
    });
    this.addEventListener("prompt-rate", (event) => {
      const { id, rating } = event.detail;
      const prompt = this.prompts.find((prompt) => prompt.id === id);
      if (!prompt) return;
      if (
        this.save(
          this.prompts.map((item) =>
            item.id === id ? { ...item, rating } : item,
          ),
        )
      ) {
        this.announce(`Rated ${prompt.title}: ${rating} out of 5 stars.`);
      }
    });
  }
  announce(message, error = false) {
    this.status.textContent = message;
    this.status.classList.toggle("error", error);
  }
  save(nextPrompts) {
    if (!this.readable) {
      this.announce(
        "Browser storage is unavailable. Reload and try again before making changes.",
        true,
      );
      return false;
    }
    try {
      writePrompts(nextPrompts);
    } catch {
      this.announce(
        "Changes could not be saved. Browser storage may be full or unavailable.",
        true,
      );
      return false;
    }
    this.prompts = nextPrompts;
    this.collection.update(this.prompts, this.readable);
    return true;
  }
}
customElements.define("prompt-library", PromptLibrary);
