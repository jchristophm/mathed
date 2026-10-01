# Independent editor architecture

Reference inspection: Problemly main, original Mathed editor.js, index.html and style.css; balanced-reference/balanced.js.ref and README.md (October 1, 2026). The references remain unchanged.

Retained mechanisms: recursive arrays for nested mathematical structures, an array path into an editable slot, buffered keyboard recognition, a native input for mobile keyboards, generated mathematical presentation, and explicit structure/symbol controls.

Redesigned mechanisms: versioned semantic nodes replace raw LaTeX/character tokens; variable references contain host IDs; ordered child slots provide consistent traversal without emergency cursor patches; ambiguous vocabulary matches require selection; incomplete buffers are preserved in drafts; submission uses a callback rather than global iframe postMessage. No chemical balancing or mathematical correctness evaluation is reused.

- model.ts: types, format validation, draft diagnostics, child slots and serialization.
- vocabulary.ts: session-local vocabulary validation, recognition and identity resolution.
- controller.ts: keyboard buffering, structural mutations, path navigation and history, independent of DOM.
- latex.ts: safe generated presentation; never the authoritative document.
- renderer.ts: nested visual structures and clickable insertion positions; KaTeX for leaf symbols.
- mathed.ts: instance-scoped DOM, controls and lifecycle, callbacks.
- demo/: small host using the actual package, JSON open/download and two modes.

All state and listeners belong to an editor instance. Teardown removes listeners and DOM. Inputs and outputs are defensive copies. Persistence belongs to the host. The package is independently versioned; no Diagramed globals, server, account or iframe is required.
