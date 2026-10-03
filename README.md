# Mathed

An independent browser equation editor with editable structured JSON and optional externally supplied variables. No accounts, database, solver or external service is required.

Public demonstration: [Mathed](https://jchristophm.github.io/mathed/).
The [embedding example](https://jchristophm.github.io/mathed/examples/embedded.html) demonstrates two independent editor sessions.

## Local development

Use Node 22 or newer:

```sh
npm ci
npm run dev
```

Open the displayed local URL. The demo provides standalone and controlled-vocabulary modes, mathematical controls, structured JSON inspection, download and reopening. The sample vocabulary represents Earth, a rock and a string; it is demonstration data, not physics-specific editor behavior. Expand **Demonstration vocabulary** to add or remove entries, edit persistent IDs, display symbols and aliases, apply the library to a new session with the current equation, or reset the original library. These edits last for the current page session. The fixtures include `m`, `m_R` and `m_{R,2}`. Typing a prefix keeps input buffered and shows matching suggestions; the first match is selected automatically, arrows choose another, and Space commits the selected persistent ID.

To test renaming, save an equation with Download JSON, edit its variable's display symbol while retaining the ID, apply the vocabulary, then reopen the JSON. The new session renders the updated symbol while preserving the saved variable ID and structure. Removing an entry leaves existing references unresolved rather than replacing or dropping them.

## Verification and builds

```sh
npm test
npm run build
npx playwright install --with-deps chromium
npm run test:browser
npm run preview
```

Build outputs: reusable ES module and declarations in `dist/`; standalone demo and embedding example in `demo-dist/`. The workflow runs units, both production builds and Chromium desktop/Pixel 7 mobile-emulation tests once. Successful development pushes upload the verified `demo-dist/` artifact and deploy it through GitHub Pages. Pull requests only verify. Assets use relative URLs, including from the nested embedding-example path.

One-time repository setup: Settings → Pages → Build and deployment → Source → GitHub Actions. If the `github-pages` environment restricts deployment branches, allow `development`. After changing settings, re-run the failed deployment job; no merge into main is needed.

## Editing

Type ordinary names such as `cos(x)`, `sqrt(4)`, decimals or `2.5e-3`. Space/Enter commits buffered input; adjacent tokens mean implicit multiplication. `/`, `^` and `_` wrap the preceding operand as a fraction, power or subscript; controls also create empty structures. In controlled mode, commit a variable before using an underscore as a structure control; otherwise underscores remain part of a complex variable name.

Arrow keys traverse nested slots; Tab/Shift+Tab and up/down visit neighboring slots. Escape returns to the parent expression. Home/End move within the current slot. Clicking/tapping insertion positions or tokens places the cursor. Backspace and forward Delete follow the same ordered nested positions as arrow navigation. They edit buffered input one character at a time, enter filled structures, traverse sibling slots and remove empty containers. Repeated Backspace from the end or Delete from the beginning empties an expression without manual repositioning. Undo/Redo is per session; Ctrl/Cmd+Z and Ctrl/Cmd+Shift+Z are supported. `editor.submit()` or Ctrl/Cmd+Enter returns a complete document; `editor.cancel()` returns no expression. Hosts provide their own Save/Cancel boundary.

The standard toolbar offers fractions, powers, subscripts, parentheses, roots, summation, functions and symbols. Derivative and vector/hat accent buttons are hidden. Saved derivative and accent nodes remain readable and editable; version 1 documents and the public integration API are unchanged. Compact insertion positions preserve mathematical spacing, with invisible click/touch targets and visible empty-slot placeholders.

## Interface and format

- [Integration API and vocabulary](docs/INTEGRATION.md)
- [Version 1 document specification](docs/FORMAT.md) and [JSON schema](docs/document.schema.json)
- [Architecture and reference inspection](docs/ARCHITECTURE.md)
- [Representative JSON and embedding example](examples/)

## Limits

Single equations only; no Notebook, assessment, symbolic solver, LaTeX import, handwriting or Diagramed integration. Selection is token/cursor based rather than arbitrary mouse text-range selection; replace a token by deleting it and inserting the replacement. Derivative structures currently represent total derivatives. Available functions and Greek symbols are enumerated in the schema. Controlled input requires supplied variable IDs, including symbolic subscripts that form part of a variable. Missing references remain unresolved drafts until the host supplies their IDs again or the author explicitly edits them.

Automated mobile checks use emulation; physical-device keyboards and assistive technologies need additional testing. The original Mathed and Balanced code in Problemly was inspected read-only; recursive token editing, buffered recognition and useful controls informed this implementation. No software license has been added.
