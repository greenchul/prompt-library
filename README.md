# Prompt Library

A browser-local prompt library built with native Web Components and JavaScript modules. No framework, build step, or runtime dependencies.

## Run

Serve the project over HTTP (module scripts require a server):

```sh
python3 -m http.server 8000
```

Open http://localhost:8000. Saved prompts remain under `prompt-library.prompts` in localStorage. Use the same browser and origin (including port) to access existing data.

## Structure

- `index.html`: page header, main landmark, and footer.
- `script.js`: component registration entry point.
- `styles.css`: theme variables, base styles, and page layout.
- [`components/`](components/README.md): custom elements and their scoped CSS. See the component guide for architecture, lifecycle, event contracts, and a step-by-step example of creating a component.
- `lib/`: storage validation/persistence, model options/normalization, and token estimation.

Components use light DOM, preserving native form behavior and label relationships. Styles are scoped by component tag; theme variables are shared globally.

`prompt-library` owns saved state and announcements. `prompt-editor` emits `prompt-create` with title, content, model, and isCode; `model-picker` owns autocomplete. `prompt-collection` retains cards by ID. `prompt-card` emits `prompt-delete` with an ID and `prompt-rate` with an ID and rating. `star-rating` emits `rating-change` with a value, which its card translates into a prompt event.

The library writes storage before committing state or clearing the editor. Failed rating writes restore the previous selection. Ratings update existing controls to preserve focus. Each component initializes once; its listeners remain attached to its own DOM when reconnected. Prompt text is rendered with `textContent`; HTML templates contain only static markup.

## Testing and formatting

Use Node.js 24 or later and Python 3. Install the pinned development dependencies and Playwright's Chromium browser:

```sh
npm ci
npx playwright install chromium
```

On Linux CI, install browser system dependencies with `npx playwright install --with-deps chromium`.

Playwright is pinned to **1.55.1** because the newest release's Chromium installer rejected macOS 13 on the development machine. Upgrade the pin and reinstall browsers when the development OS can support a newer version; CI uses the same pinned version for consistency.

```sh
npm run format        # Format the project
npm run format:check  # Check formatting without changing files
npm test             # Node logic tests
npm run test:e2e      # Chromium browser tests
npm run test:e2e:ui   # Interactive browser test runner
npm run test:e2e:report # Open the most recent HTML report
```

Playwright automatically starts and stops a Python HTTP server at `http://127.0.0.1:8766`. Leave that dedicated port free; the runner deliberately refuses to reuse an existing server. Each test gets a fresh browser context and storage. Tests do not use your normal browser profile or saved prompts. Reloads within a test retain its storage.

The Node tests cover storage normalization/failure handling, model matching, and token calculations. Tests in `tests/e2e/` cover creation and reload, autocomplete and custom models, keyboard ratings and focus, deletion, storage failures, literal text rendering, reconnection, and a narrow viewport. They replace the old manual `tests/browser.html` harness.

### Debugging and adding tests

Run a single file or scenario:

```sh
npm run test:e2e -- tests/e2e/ratings.spec.js
npm run test:e2e -- --grep "failed deletion" --debug
```

Failures produce screenshots and traces in `test-results/`; the HTML report links to them. Open it with `npm run test:e2e:report`, or inspect a trace directly with `npx playwright show-trace <path-to-trace.zip>`. Generated artifacts are ignored by Git and Prettier.

Add independent `*.spec.js` tests under `tests/e2e/`. Prefer accessible roles/labels, actual keyboard and pointer actions, and awaited Playwright assertions. Use `helpers.js` for common creation, card lookup, and storage-write failures. Keep mocks inside the current page/context. Avoid fixed sleeps and cross-test dependencies. Keep DOM-independent calculations in `tests/logic.test.js`.

GitHub Actions runs formatting, Node tests, and Chromium tests on pushes and pull requests, uploading reports and failure artifacts for 14 days. CI uses one worker and one retry; local runs use two workers and no retries. Traces are retained for failed attempts, including failures that later pass on retry.

Coverage is Chromium-only. The narrow-viewport test is not a visual regression suite, and automated keyboard checks do not replace a full accessibility or screen-reader audit.

Development tools are not required to serve the application.
