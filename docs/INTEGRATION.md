# Browser integration

Build the package with `npm run build`. A bundler host can consume the repository package locally (for example, `npm install ../mathed`) or alias its source during development. This package is private and is not published to npm.

```ts
import { createEditor } from '@jchristophm/mathed';
import '@jchristophm/mathed/style.css';

const editor = createEditor(document.querySelector('#equation'), {
  mode: 'controlled', // or standalone (the default)
  vocabulary: [
    { id: 'rock.mass', symbol: 'm_R', aliases: ['mass'],
      description: 'Rock mass', object: 'Rock', units: 'kg' }
  ],
  document: savedDocument, // optional versioned MathDocument
  onChange: draft => { /* optional host draft tracking */ },
  onSubmit: completeDocument => { savedDocument = completeDocument; },
  onCancel: () => { /* close without overwriting savedDocument */ }
});

editor.getDocument(); // defensive copy; may be an incomplete draft
editor.updateVocabulary(updatedEntries); // same IDs, current display metadata
editor.insertVariable(variableId); // retained logical cursor, including nested slots
editor.loadDocument(otherDocument); // validates first; same session vocabulary
editor.submit(); // true on successful callback, false with visible feedback
editor.cancel(); // cancellation callback only
editor.focus();
editor.destroy(); // idempotent; removes all listeners and owned DOM
```

The TypeScript declarations ship in `dist/mathed.d.ts`. DOM creation is scoped to the supplied container; multiple instances can coexist. No global event handlers, iframe messages, application URLs or backend services are required. Cancel does not submit, persist or mutate the original document. The host decides whether to close an editor after submit/cancel.

Vocabulary entries require a nonempty unique `id` and mathematical `symbol`; optional `aliases`, `description`, `quantity`, `object` and `units` are plain metadata. Symbols are KaTeX math fragments (e.g. `W_{E,R}` or `\\alpha_R`) rendered with trust disabled. Supply valid supported notation. Mathed adds no vector accents or physical conventions.

Matching uses the supplied symbol, a compact symbol spelling without braces/backslashes/subscript punctuation, and aliases; matching is case-insensitive. For example `W_{E,R}`, `W_E,R`, `WER`, and an explicit `weight` alias can resolve the same ID. A unique exact variable match commits; ambiguous exact matches remain buffered until selected. Partial matches appear as clickable/touchable suggestions. Alias collisions with ordinary function/constant names should be avoided; an exact supplied variable match takes precedence.

Unrecognized input remains pending with a warning. It never invents an ID. Ordinary operators, numbers, constants and functions remain available. Greek variables in controlled mode must come from the vocabulary; pi remains a built-in constant.

Vocabulary and initial document are defensively copied. Call `editor.updateVocabulary(entries)` to refresh current symbols and allowed IDs without resetting the expression, logical cursor, pending input, or undo history. `loadDocument` does not update the current session's vocabulary. Missing IDs remain visibly unresolved, even if a new variable uses the same old symbol.

A working two-instance host example is available locally at `/examples/embedded.html`; its host-side developer-tools API illustrates reopening with revised vocabulary and inspecting callbacks. The standalone demo uses this same reusable package.

The editor owns its Variables dropdown. Its two top rows contain five structures, then Variables/Functions/Symbols. Its bottom touch controls are left, right, and Backspace. Hosts own Save/Cancel boundaries through the instance API; keyboard Ctrl/Cmd+Enter and undo/redo remain supported. Suggestions display mathematical symbols without units. The first pending match is selected automatically, left/right selects another, and Space commits the selected ID.
