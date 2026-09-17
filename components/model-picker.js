import { Component } from "./component.js";
import { modelOptions } from "../lib/models.js";

let pickerSequence = 0;
export class ModelPicker extends Component {
  get value() {
    return this.querySelector("input").value;
  }
  initialize() {
    this.innerHTML = `            <label for="prompt-model">Model (optional)</label>
            <div class="model-field">
              <input type="text" id="prompt-model" name="model" role="combobox" aria-autocomplete="list" aria-controls="model-suggestions" aria-expanded="false" autocomplete="off" placeholder="Select or enter a model">
              <ul id="model-suggestions" class="model-suggestions" role="listbox" aria-label="Suggested models" hidden></ul>
            </div>
`;
    const modelInput = this.querySelector("input");
    const modelSuggestions = this.querySelector("ul");
    const prefix = `model-${++pickerSequence}`;
    modelInput.id = `${prefix}-input`;
    modelSuggestions.id = `${prefix}-list`;
    this.querySelector("label").htmlFor = modelInput.id;
    modelInput.setAttribute("aria-controls", modelSuggestions.id);
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
      suggestedModels = modelOptions.filter((model) =>
        `${model.name} ${model.id} ${model.provider}`
          .toLowerCase()
          .includes(query),
      );
      modelSuggestions.replaceChildren();
      closeModelSuggestions();
      suggestedModels.forEach((model, index) => {
        const option = document.createElement("li");
        option.id = `${prefix}-suggestion-${index}`;
        option.setAttribute("role", "option");
        option.setAttribute("aria-selected", "false");
        option.textContent = model.name;
        // Keep input focus until click selection completes.
        option.addEventListener("pointerdown", (event) =>
          event.preventDefault(),
        );
        option.addEventListener("click", () => selectModel(index));
        modelSuggestions.append(option);
      });
      modelSuggestions.hidden = suggestedModels.length === 0;
      modelInput.setAttribute(
        "aria-expanded",
        String(!modelSuggestions.hidden),
      );
    }

    function selectModel(index) {
      modelInput.value = suggestedModels[index].name;
      closeModelSuggestions();
    }

    modelInput.addEventListener("focus", populateModels);
    modelInput.addEventListener("click", populateModels);
    modelInput.addEventListener("input", populateModels);
    modelInput.addEventListener("blur", closeModelSuggestions);
    this.close = closeModelSuggestions;
    modelInput.addEventListener("keydown", (event) => {
      if (event.isComposing) return;
      if (event.key === "Escape") {
        if (!modelSuggestions.hidden) event.preventDefault();
        closeModelSuggestions();
      } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        if (modelSuggestions.hidden) populateModels();
        if (!suggestedModels.length) return;
        const direction = event.key === "ArrowDown" ? 1 : -1;
        activeModelIndex =
          activeModelIndex < 0
            ? direction === 1
              ? 0
              : suggestedModels.length - 1
            : (activeModelIndex + direction + suggestedModels.length) %
              suggestedModels.length;
        Array.from(modelSuggestions.children).forEach((option, index) => {
          option.setAttribute(
            "aria-selected",
            String(index === activeModelIndex),
          );
        });
        const activeOption = modelSuggestions.children[activeModelIndex];
        modelInput.setAttribute("aria-activedescendant", activeOption.id);
        activeOption.scrollIntoView({ block: "nearest" });
      } else if (
        event.key === "Enter" &&
        !modelSuggestions.hidden &&
        activeModelIndex >= 0
      ) {
        event.preventDefault();
        selectModel(activeModelIndex);
      } else if (event.key === "Tab") {
        closeModelSuggestions();
      }
    });
  }
}
customElements.define("model-picker", ModelPicker);
