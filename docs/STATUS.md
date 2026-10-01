# Initial independent editor delivery

Implemented on development. Original Mathed and Balanced inspected read-only; no Problemly or Diagramed changes. No license, public deployment or hosting system added.

Delivered: reusable browser API, standalone and controlled-vocabulary modes, version 1 structured documents and schema, nested editing/navigation, buffered recognition and explicit ambiguity selection, externally assigned variable IDs, symbol renaming and unresolved-reference feedback, draft persistence, submission/cancellation, JSON demonstration, session-local undo/redo and teardown.

Verification: 72 unit/model/schema/presentation cases; 28 Chromium desktop and Pixel 7 mobile-emulation browser cases. Production demo build, reusable ES-module build and generated TypeScript declarations passed. Browser tests include nested structure input/controls, replacement, autocomplete, wrong equations, zero, JSON reopen, renamed/missing references, cancellation, resizing and 12 repeated two-session initialization/teardown cycles per browser project.

Deferred: Diagramed integration, Notebook, assessment, symbolic evaluation, physical-device/assistive-technology checks, LaTeX import and arbitrary text-range selection. Derivatives currently use total derivative notation; supported functions/symbols are enumerated. See README and FORMAT for editing/validation limits.
