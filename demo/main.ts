import { clone, createEditor, MathedEditor, MathDocument, parseDocument, serialize, toLatex } from '../src/mathed';
import { sampleVocabulary } from './vocabulary';
import { createLibraryEditor } from './library-editor';
import './style.css';
const app = document.querySelector<HTMLElement>('#app')!;
app.innerHTML = `<header><p class="eyebrow">Independent mathematical editor</p><h1>Mathed</h1><p>One equation. Editable structure. Your variables.</p></header>
<div class="demo-tools"><label>Mode <select id="mode"><option value="standalone">Standalone</option><option value="controlled">Controlled vocabulary</option></select></label>
<button id="new">New equation</button><button id="download">Download JSON</button><label class="file-button">Open JSON<input id="open" type="file" accept=".json,application/json"></label></div>
<p id="mode-description"></p><details id="vocabulary"><summary>Demonstration vocabulary</summary><div id="library-editor"></div></details>
<div id="editor"></div><p id="result" role="status"></p>
<details open><summary>Structured document</summary><pre id="json"></pre></details>`;
const host = app.querySelector<HTMLElement>('#editor')!, mode = app.querySelector<HTMLSelectElement>('#mode')!;
const json = app.querySelector<HTMLElement>('#json')!, result = app.querySelector<HTMLElement>('#result')!;
const description = app.querySelector<HTMLElement>('#mode-description')!, library = app.querySelector<HTMLDetailsElement>('#vocabulary')!;
let vocabulary = clone(sampleVocabulary);
let editor: MathedEditor;
function initialize(document?: MathDocument): void {
  editor?.destroy();
  const controlled = mode.value === 'controlled';
  library.hidden = !controlled;
  description.textContent = controlled ? 'Type “weight = mass * gravity”, or choose suggestions. Expand Demonstration vocabulary to add, edit, remove or reset entries; apply to a new session.' : 'Type freely, for example “cos(x) + 2”. Adjacent tokens preserve implicit multiplication.';
  const sessionVocabulary = controlled ? clone(vocabulary) : [];
  editor = createEditor(host, {
    mode: controlled ? 'controlled' : 'standalone',
    vocabulary: sessionVocabulary,
    document,
    onChange: d => { json.textContent = serialize(d); },
    onSubmit: d => { json.textContent = serialize(d); result.textContent = 'Submitted: ' + toLatex(d.expression, sessionVocabulary); },
    onCancel: () => { result.textContent = 'Canceled. No expression was submitted.'; }
  });
  json.textContent = serialize(editor.getDocument()); result.textContent = ''; editor.focus();
}
mode.addEventListener('change', () => initialize());
app.querySelector('#new')!.addEventListener('click', () => initialize());
app.querySelector('#download')!.addEventListener('click', () => {
  const blob = new Blob([serialize(editor.getDocument())], { type: 'application/json' });
  const url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = 'equation.mathed.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
});
app.querySelector('#open')!.addEventListener('change', async e => {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0]; if (!file) return;
  try {
    if (file.size > 2_000_000) throw new Error('JSON file is too large');
    const document = parseDocument(await file.text()); initialize(document);
    result.textContent = 'Opened editable equation.';
  } catch (error) { result.textContent = 'Unable to open: ' + (error as Error).message; }
  input.value = '';
});
initialize();
createLibraryEditor(app.querySelector<HTMLElement>('#library-editor')!, sampleVocabulary, updated => {
  const current = editor.getDocument();
  vocabulary = clone(updated);
  initialize(current);
});
