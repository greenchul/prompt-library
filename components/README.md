# Working with Web Components

This directory contains the interactive parts of Prompt Library. Each component is a custom HTML element backed by a JavaScript class. Components own their markup and interactions, while the library component coordinates saved data.

The project uses native browser APIs and JavaScript modules. There is no component framework, compiler, build step, or runtime dependency.

## 1. What is a Web Component?

Web Components are a set of browser features for building reusable UI:

| Feature                  | Purpose                                                               | Used here?                   |
| ------------------------ | --------------------------------------------------------------------- | ---------------------------- |
| Custom elements          | Register an HTML tag with its own JavaScript behavior and lifecycle   | Yes                          |
| Shadow DOM               | Give an element a separate internal DOM tree with style encapsulation | No; we use light DOM         |
| HTML templates and slots | Define reusable markup fragments and insertion points for content     | No; markup is built directly |

These features can be used independently. A custom element does not need a shadow root to be useful.

For example, the page contains:

```html
<prompt-library></prompt-library>
```

Its JavaScript class ultimately extends the browser's `HTMLElement` class. Registration connects the tag name to that class:

```js
customElements.define("prompt-library", PromptLibrary);
```

Custom element names must contain a hyphen. In this project, tag names and filenames use lowercase words separated by hyphens, while classes use PascalCase: `prompt-card`, `prompt-card.js`, and `PromptCard`.

A custom tag does not automatically supply accessibility semantics. The elements inside it still need appropriate headings, labels, buttons, forms, and other native HTML.

## 2. How the application is assembled

```text
index.html
└── prompt-library
    ├── prompt-editor
    │   └── model-picker
    ├── prompt-collection
    │   └── prompt-card (one per saved prompt)
    │       └── star-rating
    └── status message
```

The header, footer, and main landmark remain in `index.html`. They do not have enough independent behavior to require components.

### Loading and registration

`index.html` loads `../script.js` using `type="module"`. That entry module imports `prompt-library.js`, which imports its child components. Those modules import their own dependencies and register their tags.

The import chain ensures child definitions are available before a parent creates them. Browser modules are evaluated once per module URL, so importing the same component from several modules does not repeatedly register it.

When adding a component, import it from the component that creates it. Merely adding a `.js` file to this directory does not load or register it.

Serve the project over HTTP from the repository root:

```sh
python3 -m http.server 8000
```

Then open http://localhost:8000. Opening `index.html` directly with a `file:` URL is not the supported workflow for these module scripts.

### Component responsibilities and interfaces

| Component                                   | Owns                                                             | Current public interface                                                    |
| ------------------------------------------- | ---------------------------------------------------------------- | --------------------------------------------------------------------------- |
| [`prompt-library`](prompt-library.js)       | Saved prompt state, storage coordination, status announcements   | `save(nextPrompts)`, `announce(message, error)`                             |
| [`prompt-editor`](prompt-editor.js)         | Form fields, validation, model normalization                     | `reset()`, `focusTitle()`; emits `prompt-create` and `prompt-invalid`       |
| [`model-picker`](model-picker.js)           | Model filtering, suggestion visibility, keyboard selection       | Read-only `value`, `close()`                                                |
| [`prompt-collection`](prompt-collection.js) | Card instances, empty state, focus after deletion                | `update(prompts, readable)`, `focusAfterDelete(index)`                      |
| [`prompt-card`](prompt-card.js)             | Prompt display, token summary, delete action, rating integration | `prompt` property, `focusDelete()`; emits `prompt-delete` and `prompt-rate` |
| [`star-rating`](star-rating.js)             | Native radio controls, hover preview, selected rating            | `value` and `promptTitle` properties; emits `rating-change`                 |

Most DOM-dependent methods require the component to have been connected first. Two deliberate exceptions are `prompt-card.prompt` and `star-rating.value`, which can be assigned before insertion.

The current card property setter updates the rating after initialization; it does not re-render title, content, or model changes. That matches today's create/delete/rate workflow. An edit feature would need explicit updates for those fields. Similarly, `star-rating.promptTitle` is read during initialization to construct its accessible name.

Non-UI logic lives outside this directory:

- [`../lib/prompt-storage.js`](../lib/prompt-storage.js): read, validate, normalize, and write saved records.
- [`../lib/models.js`](../lib/models.js): model options and name/ID normalization.
- [`../lib/token-estimate.js`](../lib/token-estimate.js): token calculation without DOM dependencies.

## 3. Lifecycle and the shared base class

Every component extends [`Component`](component.js), a small subclass of `HTMLElement`:

```js
export class Component extends HTMLElement {
  connectedCallback() {
    if (this.initialized) return;
    this.initialized = true;
    this.initialize();
  }

  emit(type, detail) {
    this.dispatchEvent(
      new CustomEvent(type, {
        detail,
        bubbles: true,
        composed: true,
      }),
    );
  }
}
```

`connectedCallback()` is a browser lifecycle callback. The browser calls it when the element connects to the document, including when an existing element is removed and reinserted.

`initialize()` is our project convention, not a browser callback. The base class calls it once per element instance. Subclasses use it to create markup, retain DOM references, and attach local listeners.

The `initialized` guard prevents reconnection from rebuilding the UI or duplicating listeners. Existing listeners remain attached to the element and its children while detached. The guard does not implement automatic rendering, cleanup, or retries if initialization throws.

### If a component needs external resources

Current components attach listeners to their own DOM and do not need a disconnect hook. A future component that subscribes to `window`, `document`, timers, observers, or an external service should clean those resources up in `disconnectedCallback()`.

Recreate those resources on every connection, outside the one-time `initialize()` method:

```js
connectedCallback() {
  super.connectedCallback();
  this.connectionController?.abort();
  this.connectionController = new AbortController();
  window.addEventListener("resize", this.handleResize, {
    signal: this.connectionController.signal
  });
}

disconnectedCallback() {
  this.connectionController?.abort();
}
```

This pattern assumes `handleResize` is an instance callback, such as an arrow-function class field. Cleaning up in `disconnectedCallback()` but subscribing only in `initialize()` would leave a reconnected component without its subscription.

## 4. Data goes down; requests come up

The library owns the saved prompt array. Children receive the information they need through properties or methods and emit events describing user requests.

For example, the collection creates a card like this:

```js
const card = document.createElement("prompt-card");
card.prompt = prompt;
this.list.append(card);
```

Assigning the data before insertion makes it available when the card initializes.

Properties are convenient for objects, arrays, numbers, and booleans. HTML attributes are strings and are a separate interface. Setting `card.prompt` does not create a `prompt` attribute. The current components do not implement attribute observation or automatic property/attribute reflection.

### Event contracts

All events below use the base class's `emit()` helper. Payloads are available through `event.detail`.

| Event            | Emitter | Payload                             | Handler                                                  |
| ---------------- | ------- | ----------------------------------- | -------------------------------------------------------- |
| `prompt-create`  | Editor  | `{ title, content, model, isCode }` | Library creates an ID and attempts to save               |
| `prompt-invalid` | Editor  | `{ message }`                       | Library announces the validation error                   |
| `prompt-delete`  | Card    | `{ id }`                            | Library attempts deletion and restores useful focus      |
| `rating-change`  | Rating  | `{ value }`                         | Card translates the request into a prompt-specific event |
| `prompt-rate`    | Card    | `{ id, rating }`                    | Library attempts to save the new rating                  |

`bubbles: true` lets ancestor components handle an event without registering a listener on every descendant. `composed: true` allows the event to cross a shadow boundary if one is introduced later; it has no special isolation role in the current light DOM tree.

The card stops propagation of `rating-change` and emits `prompt-rate` with the prompt ID. This keeps the rating control independent of the application's prompt record format.

These events are requests, not proof that a write succeeded. They are not configured as cancelable, and `emit()` does not return an acceptance result.

### Saving and handling failure

The library's `save()` method follows this order:

1. Check whether saved data was successfully read.
2. Attempt the storage write.
3. Commit the new in-memory prompt array only if the write succeeds.
4. Update the collection.

The editor resets only after a successful save. A failed write leaves its draft intact. A read failure prevents later mutations from overwriting data that could not be loaded.

Rating requests currently use synchronous event dispatch and synchronous localStorage writes. After emitting its request, the rating control refreshes from its accepted `value`. On success, the library's update supplies the new value; on failure, the previous value remains and the control restores its selection.

If persistence becomes asynchronous, this interaction must change: introduce an explicit pending state and an eventual success/failure update rather than relying on the owner responding before `emit()` returns.

## 5. Rendering without losing focus

The collection stores cards in a `Map` keyed by prompt ID. On update, it removes deleted cards, creates new cards, and reuses existing instances.

A rating change updates existing radio inputs instead of replacing the card's HTML. This preserves focus while the user navigates the rating controls. After deletion, the collection focuses the next suitable delete button; if no cards remain, the library focuses the editor's title input.

For new components, distinguish initial markup creation from later value updates. Replacing `innerHTML` on every update destroys child nodes, their listeners, and potentially the user's focus or selection.

Use `textContent` for user-provided text. Existing `innerHTML` templates contain static markup only. Never interpolate saved prompt titles, content, or custom model names into those templates.

## 6. Styling and light DOM

These components render into their ordinary child DOM. None calls `attachShadow()`.

This keeps native form inputs inside the editor's form, makes labels straightforward to connect, and allows the existing theme to be shared. It also means CSS isolation is a convention rather than a browser-enforced boundary.

Each styled component has a matching `.css` file. The root [`../styles.css`](../styles.css) imports those files before its other rules:

```css
@import url("components/prompt-card.css");
```

JavaScript imports do not load those CSS files. A new component stylesheet must be added to the root stylesheet explicitly.

Prefix selectors with the owning tag:

```css
prompt-card {
  display: flex;
  min-width: 0;
}

prompt-card .model-badge {
  color: var(--accent);
  border-color: var(--accent-border);
}
```

Set the custom element's display behavior deliberately; a custom tag does not inherently behave like a block-level section. Theme variables such as `--accent`, `--muted`, and `--border` are defined globally and reused in component CSS.

Keep component-specific responsive rules with the component. Keep page layout rules, including the editor/collection workspace grid, in the root stylesheet.

A selector such as `prompt-editor input` also matches inputs inside its nested `model-picker`, because both use light DOM. Scope selectors more narrowly when that inheritance is unwanted. Global rules can still affect every component, so inspect specificity when changing styles.

Moving to Shadow DOM later would require deliberate changes to stylesheet loading, DOM queries, form integration, labels, and event handling. It is not just a switch to turn on.

## 7. Create a new component: a prompt count

This example adds a small `<prompt-count>` display above the collection. It is an instructional example, not a component currently registered by the application. A count this simple could also remain ordinary markup; the example demonstrates the full creation workflow.

### Step 1: Define its responsibility and API

The component displays a count supplied by its owner. It does not read storage or query other components.

Its interface is one numeric property, `count`, accepting a non-negative integer. No event is needed because it has no user action.

### Step 2: Create `components/prompt-count.js`

```js
import { Component } from "./component.js";

export class PromptCount extends Component {
  set count(value) {
    this._count = Number.isInteger(value) && value >= 0 ? value : 0;
    this.render();
  }

  get count() {
    return this._count ?? 0;
  }

  initialize() {
    this.innerHTML = '<p class="prompt-count-text"></p>';
    this.label = this.querySelector(".prompt-count-text");
    this.render();
  }

  render() {
    if (!this.label) return;
    const noun = this.count === 1 ? "prompt" : "prompts";
    this.label.textContent = `${this.count} saved ${noun}`;
  }
}

customElements.define("prompt-count", PromptCount);
```

The setter stores the value even before the element connects. `render()` safely does nothing until its DOM exists, and `initialize()` renders the stored value once the element connects. Later assignments update only the text node.

Use `initialize()` for setup rather than overriding `connectedCallback()` unless you need work on every connection. Register the element once at the bottom of its module.

### Step 3: Create `components/prompt-count.css`

```css
prompt-count {
  display: block;
}

prompt-count .prompt-count-text {
  margin: 0 0 12px;
  color: var(--muted);
  font: 12px/1.6 var(--mono);
}
```

Add the following alongside the imports at the top of root `styles.css`:

```css
@import url("components/prompt-count.css");
```

CSS imports must appear before ordinary style rules.

### Step 4: Import it from its parent

In `prompt-collection.js`, add:

```js
import "./prompt-count.js";
```

Insert the tag in the collection's static template, for example between the collection heading and the prompt list:

```html
<prompt-count></prompt-count>
```

After the template is inserted in `initialize()`, retain a reference:

```js
this.countDisplay = this.querySelector("prompt-count");
```

### Step 5: Pass data during collection updates

In the existing `update(prompts, readable)` method, add:

```js
this.countDisplay.count = prompts.length;
this.countDisplay.hidden = !readable;
```

Hiding the count after a storage read failure avoids presenting an unknown collection as having zero saved prompts.

No change to the application entry point is necessary: the collection imports and registers its new child.

### Step 6: Check the component

Verify zero, one, and several prompts; assignment before insertion; assignment after insertion; removal and reinsertion; and storage-read failure. Confirm that adding or deleting a prompt updates the count without replacing the editor or rating controls.

For a component that accepts user actions, additionally define an event contract and register the owner's handler. For example, an action component might emit:

```js
this.emit("prompt-copy", { id: this.promptId });
```

The owner would decide what to do with that request. Merely emitting an event does not implement the action.

## 8. Accessibility and maintenance conventions

- Prefer real buttons, inputs, radio groups, forms, fieldsets, and legends for their native interactions.
- Generate unique IDs when connecting labels, headings, or combobox options. Light DOM IDs share the document namespace.
- Give each rating instance a unique radio group name so controls in separate cards do not become one group.
- Preserve focus during updates and choose a useful destination when removing the focused control.
- Use the library's existing live status message for application feedback; avoid duplicate announcements from several components.
- Query from `this` or a retained local node instead of using document-wide selectors for component internals.
- Keep shared calculations and persistence in `lib/`; components should own presentation and interaction.
- Document whether each property can change after initialization. A stored field alone does not make the rendered UI reactive.
- Keep components substantial enough to own a clear behavior or reusable interface. Every wrapper and styled span does not need a custom tag.

## 9. Testing components

From the repository root, install the pinned tools with `npm ci` and the browser with `npx playwright install chromium`. Node.js 24+ and Python 3 are required. Playwright 1.55.1 is pinned for the development machine's macOS 13 compatibility; see the root README before upgrading it.

```sh
npm test                 # DOM-independent logic tests
npm run test:e2e          # Automated Chromium interactions
npm run test:e2e:ui       # Interactive test runner
npm run test:e2e:report   # Last HTML report
```

Playwright starts a dedicated local server on port 8766 and creates a fresh browser context per test. No normal browser profile is touched. The suite in `tests/e2e/` replaces `tests/browser.html` and runs against the actual application entry page.

For a new component, add tests to an appropriate `*.spec.js` file under `tests/e2e/`. Import `test` and `expect` from `@playwright/test`, navigate with `await page.goto("/")`, then interact through accessible roles and labels. Use awaited assertions so Playwright waits for the expected state. Exercise keyboard navigation and focus when the component is interactive, and verify both success and failure outcomes when it requests persistence.

Use `helpers.js` for shared actions rather than duplicating form setup. Each test owns its mocks and storage; do not share a page between tests. The storage error tests demonstrate seeding records before reload, mocking browser storage, and inspecting context storage independently of a mocked read method. Initialization scripts run on every navigation, so avoid reseeding saved records that way in persistence tests.

The reconnection test deliberately detaches and reinserts the library, then checks that one user action causes one write. Other tests retain observable UI assertions rather than calling component methods to simulate user behavior. Continue putting pure calculation and normalization tests in `tests/logic.test.js`.

To debug one file, run `npm run test:e2e -- tests/e2e/ratings.spec.js --debug`. Failure screenshots and traces appear in `test-results/` and are linked from the HTML report. GitHub Actions runs the same suites and uploads diagnostics. See the [root README](../README.md#testing-and-formatting) for setup and CI details.

Only Chromium is configured initially. Continue manual screen-reader and visual checks where needed; the narrow-viewport scenario checks overflow and usable controls, not screenshot baselines.

## Further reading

- [MDN: Using custom elements](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_custom_elements)
- [MDN: Using Shadow DOM](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_shadow_DOM)

The implementation links throughout this document describe this project's conventions; the MDN guides cover the broader browser APIs.
