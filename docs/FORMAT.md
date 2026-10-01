# Mathematical document, version 1

The JSON schema is [document.schema.json](document.schema.json). Runtime `parseDocument` additionally validates identifier characters, cursor resolution, nesting (maximum 32), total nodes (10,000), and completeness claims.

Root fields: `format: "mathed"`, `version: 1`, `status: "draft" | "complete"`, and `expression` (ordered array of nodes). Unknown versions, node types and extra fields are rejected; no automatic conversion or repair occurs.

Adjacent operand nodes express implicit multiplication. Explicit operations remain operator nodes. No simplification, rearrangement, numerical evaluation or correctness checking occurs. Multiple equalities, physically incorrect equations and unusual but filled structures remain authored data.

| Node type | Data and editable child slots |
| --- | --- |
| number | `value`: decimal/scientific string; spelling and precision preserved |
| identifier | `name`: standalone Unicode letter followed by letters/digits |
| variable | `id`: external ID only; current symbol belongs to the session vocabulary |
| constant | `name`: pi, e, i |
| symbol | `name`: supported Greek name |
| operator | `value`: +, -, *, /, =, comma |
| fraction | numerator, denominator |
| power | base, exponent |
| subscript | base, subscript |
| group | body (parentheses) |
| root | index (empty means square root), radicand |
| function | name; argument |
| sum | lower, upper, body |
| derivative | expression, variable, order; total derivative notation |
| accent | kind (vec, hat, bar, dot); body |

All child slots are expression arrays. Numbers may include signs; keyboard minus can also be an explicit unary operator, preserving the user's structure. Standalone multi-letter names are a single identifier; space commits them and separates adjacent tokens.

A draft can contain empty slots or an unfinished operation. Optional `pending: { text, path }` preserves uncommitted input exactly. The path alternates node index and child-slot name and ends with an insertion index, e.g. `[0, "denominator", 0]`. It is editor draft state, never an authorized variable token. Draft save/reopen is lossless. Successful submission has no pending input and requires filled mandatory slots and resolved permitted identifiers. This is editing completeness, not mathematical validity.

A complete document can become a draft when reopened with an unavailable vocabulary reference. Its IDs and structure remain intact. A standalone identifier imported into controlled mode stays visible but cannot be submitted as authorized input.

Representative JSON documents are in [examples](../examples): weight-equation.json, known-zero.json and nested-draft.json. LaTeX is generated using `toLatex(expression, vocabulary)`; it is not persisted as authoritative data.
