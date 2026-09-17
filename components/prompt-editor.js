import { Component } from "./component.js";
import { normalizeModel } from "../lib/models.js";
import "./model-picker.js";

let editorSequence = 0;
export class PromptEditor extends Component {
  initialize() {
    this.innerHTML = `<section class="editor" aria-labelledby="editor-title">
          <div class="panel-heading"><span class="code-mark" aria-hidden="true">&lt;/&gt;</span><h2 id="editor-title">New prompt</h2></div>
          <form id="prompt-form">
            <label for="prompt-title">Title</label>
            <input id="prompt-title" name="title" placeholder="e.g. Code review companion" required maxlength="120">
            <model-picker></model-picker>
            <label for="prompt-content">Prompt content</label>
            <textarea id="prompt-content" name="content" placeholder="Write your prompt here…" rows="9" required></textarea>
            <label class="code-option" for="prompt-is-code"><input type="checkbox" id="prompt-is-code" name="isCode"> Contains code (1.3× token estimate)</label>
            <button class="save-button" type="submit"><span aria-hidden="true">+</span> Save prompt</button>
            <p class="form-note">Saved in this browser. Ready when you are.</p>
          </form>
        </section>`;
    const prefix = `editor-${++editorSequence}`;
    // Keep labels and headings local even when multiple editors are mounted.
    this.querySelectorAll("[id]").forEach((element) => {
      const oldId = element.id;
      if (element.closest("model-picker")) return;
      element.id = `${prefix}-${oldId}`;
      this.querySelectorAll(`[for="${oldId}"]`).forEach(
        (label) => (label.htmlFor = element.id),
      );
      this.querySelectorAll(`[aria-labelledby="${oldId}"]`).forEach((node) =>
        node.setAttribute("aria-labelledby", element.id),
      );
    });
    this.form = this.querySelector("form");
    this.titleInput = this.form.elements.title;
    this.form.addEventListener("reset", () =>
      this.querySelector("model-picker").close(),
    );
    this.form.addEventListener("submit", (event) => {
      event.preventDefault();
      const title = this.titleInput.value.trim();
      const content = this.form.elements.content.value.trim();
      if (!title || !content) {
        this.emit("prompt-invalid", {
          message: "Enter a title and prompt content before saving.",
        });
        (!title ? this.titleInput : this.form.elements.content).focus();
        return;
      }
      this.emit("prompt-create", {
        title,
        content,
        model: normalizeModel(this.querySelector("model-picker").value),
        isCode: this.form.elements.isCode.checked,
      });
    });
  }
  reset() {
    this.form.reset();
    this.focusTitle();
  }
  focusTitle() {
    this.titleInput.focus();
  }
}
customElements.define("prompt-editor", PromptEditor);
