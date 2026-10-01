# Mathed

An independent browser equation editor with editable structured JSON and optional externally supplied variables. No accounts, database, solver or external service is required.

## Local development

Use Node 22 or newer:

```sh
npm ci
npm run dev
```

Open the displayed local URL. The demo provides standalone and controlled-vocabulary modes, mathematical controls, structured JSON inspection, download and reopening. The sample vocabulary represents Earth, a rock and a string; it is demonstration data, not physics-specific editor behavior.

## Verification and builds

```sh
npm test
npm run build
npx playwright install --with-deps chromium
npm run test:browser
npm run preview
```

Build outputs: reusable ES module and declarations in `dist/`; standalone demo and embedding example in `demo-dist/`. The verification workflow runs units, builds and Chromium desktop/Pixel 7 mobile-emulation tests on development pushes. It does not deploy.

## Editing

Type ordinary names such as `cos(x)`, `sqrt(4)`, decimals or `2.5e-3`. Space/Enter commits buffered input; adjacent tokens mean implicit multiplication. `/`, `^` and `_` wrap the preceding operand as a fraction, power or subscript; controls also create empty structures. In controlled mode, commit a variable before using an underscore as a structure control; otherwise underscores remain part of a complex variable name.

Arrow keys traverse nested slots; Tab/Shift+Tab and up/down visit neighboring slots. Escape or Exit returns to the parent expression. Home/End move within the current slot. Clicking/tapping insertion positions or tokens places the cursor. Backspace edits a pending buffer or deletes a preceding atomic token; on a filled structure it enters the last slot first. Delete removes the next token, including an entire structure. Undo/Redo is per session; Ctrl/Cmd+Z and Ctrl/Cmd+Shift+Z are supported. Submit or Ctrl/Cmd+Enter returns a complete document; Cancel returns no expression.

## Interface and format

- [Integration API and vocabulary](docs/INTEGRATION.md)
- [Version 1 document specification](docs/FORMAT.md) and [JSON schema](docs/document.schema.json)
- [Architecture and reference inspection](docs/ARCHITECTURE.md)
- [Representative JSON and embedding example](examples/)

## Limits

Single equations only; no Notebook, assessment, symbolic solver, LaTeX import, handwriting or Diagramed integration. Selection is token/cursor based rather than arbitrary mouse text-range selection; replace a token by deleting it and inserting the replacement. Derivative structures currently represent total derivatives. Available functions and Greek symbols are enumerated in the schema. Controlled input requires supplied variable IDs, including symbolic subscripts that form part of a variable. Missing references remain unresolved drafts until the host supplies their IDs again or the author explicitly edits them.

Automated mobile checks use emulation; physical-device keyboards and assistive technologies need additional testing. The original Mathed and Balanced code in Problemly was inspected read-only; recursive token editing, buffered recognition and useful controls informed this implementation. Licensing and public deployment have not been configured.
