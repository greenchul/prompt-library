// Initialize once; listeners stay on the component's own DOM across reconnects.
export class Component extends HTMLElement {
  connectedCallback() {
    if (this.initialized) return;
    this.initialized = true;
    this.initialize();
  }

  emit(type, detail) {
    this.dispatchEvent(
      new CustomEvent(type, { detail, bubbles: true, composed: true }),
    );
  }
}
