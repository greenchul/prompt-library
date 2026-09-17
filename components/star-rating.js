import { Component } from "./component.js";

let ratingSequence = 0;
export class StarRating extends Component {
  set value(value) {
    this._value = value;
    this.refreshValue?.();
  }
  get value() {
    return this._value ?? null;
  }
  initialize() {
    const radioName = `rating-${++ratingSequence}`;
    const group = document.createElement("fieldset");
    group.className = "rating";
    const legend = document.createElement("legend");
    legend.textContent = "Effectiveness";
    group.setAttribute("aria-label", `Rate effectiveness: ${this.promptTitle}`);
    const stars = document.createElement("div");
    stars.className = "rating-stars";
    const summary = document.createElement("span");
    summary.className = "rating-summary";
    const controls = [];
    let currentRating = this._value ?? null;

    function paint(value) {
      controls.forEach(({ star, value: starValue }) => {
        star.textContent = starValue <= value ? "★" : "☆";
        star.classList.toggle("filled", starValue <= value);
      });
    }

    function refresh() {
      controls.forEach(({ input, value }) => {
        input.checked = value === currentRating;
      });
      summary.textContent =
        currentRating === null ? "Not rated" : `${currentRating} out of 5`;
      paint(currentRating ?? 0);
    }

    for (let value = 1; value <= 5; value++) {
      const label = document.createElement("label");
      label.className = "rating-option";
      const input = document.createElement("input");
      input.type = "radio";
      input.name = radioName;
      input.value = String(value);
      input.setAttribute("aria-label", `${value} out of 5 stars`);
      const star = document.createElement("span");
      star.className = "rating-star";
      star.setAttribute("aria-hidden", "true");
      controls.push({ input, star, value });
      label.addEventListener("pointerenter", () => paint(value));
      input.addEventListener("change", () => {
        this.emit("rating-change", { value });
        // The owner synchronously accepts or rejects the requested change.
        currentRating = this._value;
        refresh();
      });
      label.append(input, star);
      stars.append(label);
    }
    stars.addEventListener("pointerleave", () => paint(currentRating ?? 0));
    refresh();
    group.append(legend, stars, summary);
    this.refreshValue = () => {
      currentRating = this._value;
      refresh();
    };
    this.append(group);
  }
}
customElements.define("star-rating", StarRating);
