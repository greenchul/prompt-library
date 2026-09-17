import { Component } from "./component.js";
import "./prompt-card.js";

let collectionSequence = 0;
export class PromptCollection extends Component {
  initialize() {
    this.innerHTML = `<section class="collection" aria-labelledby="collection-title">
          <div class="collection-heading"><h2 id="collection-title">Saved prompts</h2><span class="eyebrow">YOUR COLLECTION</span></div>
          <div class="prompt-list"></div>
          <div class="empty-state">
            <span class="empty-icon" aria-hidden="true">{ }</span>
            <h3>A clean slate.</h3>
            <p>Save your first prompt and give your next idea a head start.</p>
          </div>
        </section>`;
    const heading = this.querySelector("h2");
    heading.id = `collection-${++collectionSequence}`;
    this.querySelector("section").setAttribute("aria-labelledby", heading.id);
    this.list = this.querySelector(".prompt-list");
    this.emptyState = this.querySelector(".empty-state");
    this.cards = new Map();
  }
  update(prompts, readable) {
    const ids = new Set(prompts.map((prompt) => prompt.id));
    for (const [id, card] of this.cards) {
      if (!ids.has(id)) {
        card.remove();
        this.cards.delete(id);
      }
    }
    prompts.forEach((prompt, index) => {
      let card = this.cards.get(prompt.id);
      if (!card) {
        card = document.createElement("prompt-card");
        this.cards.set(prompt.id, card);
      }
      card.prompt = prompt;
      if (this.list.children[index] !== card)
        this.list.insertBefore(card, this.list.children[index] ?? null);
    });
    this.emptyState.hidden = prompts.length > 0 || !readable;
  }
  focusAfterDelete(index) {
    const cards = [...this.list.children];
    const next = cards[Math.min(index, cards.length - 1)];
    next?.focusDelete();
    return Boolean(next);
  }
}
customElements.define("prompt-collection", PromptCollection);
