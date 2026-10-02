# Independent editor delivery and refinements

Implemented on development. Original Mathed and Balanced inspected read-only; no Problemly or Diagramed changes. No software license added.

Public demo deployment is now authorized. The existing verification workflow deploys the verified `demo-dist/` artifact using GitHub's standard Pages actions after successful development pushes. Repository Pages source must be configured as GitHub Actions; the README documents the one-time setting and public demo/embedding URLs.

Delivered: reusable browser API, standalone and controlled-vocabulary modes, version 1 structured documents and schema, nested editing/navigation, buffered recognition and explicit ambiguity selection, externally assigned variable IDs, symbol renaming and unresolved-reference feedback, draft persistence, submission/cancellation, JSON demonstration, session-local undo/redo and teardown.

Refinements: ordered structural Backspace/forward Delete, including empty and partially completed containers; demo-only vocabulary editing with overlapping `m` variables; removal of derivative/vector/hat toolbar buttons while preserving saved-node compatibility; compact mathematical spacing with usable pointer targets. Version 1 JSON and public integration API are unchanged.

Verification: 101 unit/model/schema/presentation cases; 48 Chromium desktop and Pixel 7 mobile-emulation browser cases. Production demo build, reusable ES-module build and generated TypeScript declarations passed. Browser tests include repeated deletion to empty expressions, structural undo/redo, overlapping suggestions, library add/rename/remove/reset between sessions, spacing/cursor positioning, saved derivatives/accents, nested structure input/controls, replacement, autocomplete, wrong equations, zero, JSON reopen, renamed/missing references, cancellation, resizing and 12 repeated two-session initialization/teardown cycles per browser project.

Deferred: Diagramed integration, Notebook, assessment, symbolic evaluation, physical-device/assistive-technology checks, LaTeX import and arbitrary text-range selection. Derivatives currently use total derivative notation; supported functions/symbols are enumerated. See README and FORMAT for editing/validation limits.
