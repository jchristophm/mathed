import katex from 'katex';
import 'katex/dist/katex.min.css';
import './style.css';
import { EditorController, ControllerOptions, Structure } from './controller';
import { clone, numeric, FUNCTIONS, GREEK, MathDocument, parseDocument, serialize } from './model';
import { validateVocabulary } from './vocabulary';
import type { Variable } from './model';
import { renderExpression } from './renderer';
export * from './model';
export { toLatex } from './latex';
export interface EditorOptions extends ControllerOptions {
  onSubmit?: (document: MathDocument) => void;
  onCancel?: () => void;
  onChange?: (draft: MathDocument) => void;
}
export interface MathedEditor {
  getDocument(): MathDocument;
  insertVariable(id: string): void;
  updateVocabulary(vocabulary: readonly Variable[]): void;
  loadDocument(document: MathDocument): void;
  submit(): boolean;
  cancel(): void;
  focus(): void;
  destroy(): void;
}
export function createEditor(container: HTMLElement, options: EditorOptions = {}): MathedEditor {
  if (!(container instanceof HTMLElement)) throw new Error('Provide a browser HTMLElement');
  let controller = new EditorController(options), destroyed = false;
  const abort = new AbortController();
  const root = document.createElement('section'); root.className = 'mathed-editor';
  const toolbar = document.createElement('div'); toolbar.className = 'me-toolbar'; toolbar.setAttribute('aria-label', 'Mathematical controls');
  const structuresRow = document.createElement('div'); structuresRow.className = 'me-structures';
  const menusRow = document.createElement('div'); menusRow.className = 'me-menus'; toolbar.append(structuresRow, menusRow);
  const variables = document.createElement('details'); variables.className = 'me-variables';
  const variablesSummary = document.createElement('summary'); variablesSummary.textContent = 'Variables ▾'; variablesSummary.setAttribute('aria-label', 'Variables');
  const variableMenu = document.createElement('div'); variableMenu.className = 'me-variable-menu'; variables.append(variablesSummary, variableMenu); menusRow.append(variables);
  const field = document.createElement('div'); field.className = 'me-field'; field.setAttribute('aria-label', 'Mathematical expression');
  const input = document.createElement('textarea'); input.className = 'me-input'; input.setAttribute('aria-label', 'Type mathematics'); input.autocomplete = 'off'; input.autocapitalize = 'off'; input.spellcheck = false;
  const suggestions = document.createElement('div'); suggestions.className = 'me-suggestions'; suggestions.setAttribute('aria-label', 'Variable suggestions'); suggestions.setAttribute('role', 'listbox');
  const status = document.createElement('div'); status.className = 'me-status'; status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
  const help = document.createElement('p'); help.className = 'me-help'; help.textContent = 'Type variables or functions; Space commits input. Arrow keys select suggestions or move; Tab visits slots; Esc exits a structure. Ctrl/Cmd+Enter submits.';
  const actions = document.createElement('div'); actions.className = 'me-actions';
  function listen(target: EventTarget, type: string, fn: EventListener) { target.addEventListener(type, fn, { signal: abort.signal }); }
  function refresh(notify = true): void {
    if (destroyed) return;
    field.replaceChildren(renderExpression(controller));
    suggestions.replaceChildren();
    variableMenu.replaceChildren();
    for (const v of controller.vocabulary) {
      const b = document.createElement('button'); b.type = 'button'; b.dataset.referenceId = v.id; b.setAttribute('aria-label', 'Insert ' + v.symbol);
      b.innerHTML = katex.renderToString(v.symbol, {throwOnError:false, trust:false}); variableMenu.append(b);
    }
    for (const v of controller.suggestions) {
      const b = document.createElement('button'); b.type = 'button'; b.dataset.variableId = v.id;
      b.innerHTML = katex.renderToString(v.symbol, {throwOnError:false, trust:false});
      b.setAttribute('aria-label', v.symbol); b.setAttribute('aria-selected', String(v.id === controller.selectedSuggestion?.id)); b.setAttribute('role', 'option');
      suggestions.append(b);
    }
    const issues = controller.issues();
    status.textContent = controller.warning || (controller.buffer ? 'Pending input: ' + controller.buffer : issues.length ? 'Draft — ' + issues.join(' ') : 'Ready to submit');
    status.classList.toggle('me-warning', !!controller.warning || issues.some(x => /Unresolved|outside/.test(x)));
    if (notify) options.onChange?.(controller.getDocument());
  }
  function run(fn: () => void): void { if (destroyed) return; fn(); refresh(); input.focus({ preventScroll: true }); }
  function button(parent: HTMLElement, label: string, text: string, fn: () => void): void {
    const b = document.createElement('button'); b.type = 'button'; b.setAttribute('aria-label', label); b.title = label; b.textContent = text;
    listen(b, 'click', () => run(fn)); parent.append(b);
  }
  const structures: [Structure, string, string][] = [['fraction', 'Fraction', 'a/b'], ['power', 'Power', 'xⁿ'], ['subscript', 'Subscript', 'xₙ'], ['group', 'Parentheses', '( )'], ['root', 'Square root', '√']];
  for (const [type, label, text] of structures) button(structuresRow, label, text, () => controller.insertStructure(type));
  function select(label: string, choices: readonly string[], choose: (value: string) => void): void {
    const s = document.createElement('select'); s.setAttribute('aria-label', label);
    const prompt = document.createElement('option'); prompt.value = ''; prompt.textContent = label; s.append(prompt);
    for (const value of choices) { const o = document.createElement('option'); o.value = value; o.textContent = value; s.append(o); }
    listen(s, 'change', () => { const value = s.value; if (value) run(() => choose(value)); s.value = ''; });
    menusRow.append(s);
  }
  select('Functions', FUNCTIONS, value => controller.insertFunction(value as typeof FUNCTIONS[number]));
  select('Symbols', controller.mode === 'standalone' ? ['pi', ...GREEK] : ['pi'], value => controller.insertSymbol(value));
  button(actions, 'Move left', '←', () => controller.move(-1));
  button(actions, 'Move right', '→', () => controller.move(1));
  button(actions, 'Backspace', '⌫', () => controller.delete());
  const submit = (): boolean => {
    if (destroyed) return false;
    const d = controller.submit(); refresh();
    if (!d) return false;
    options.onSubmit?.(clone(d)); return true;
  };
  listen(variableMenu, 'click', e => {
    const target = (e.target as HTMLElement).closest<HTMLElement>('[data-reference-id]');
    if (target) { run(() => { if (numeric.test(controller.buffer)) controller.commitBuffer(); controller.chooseVariable(target.dataset.referenceId!); }); variables.open = false; }
  });
  listen(field, 'click', e => {
    const target = (e.target as HTMLElement).closest<HTMLElement>('[data-path]');
    run(() => { if (target) controller.setCursor(JSON.parse(target.dataset.path!)); });
  });
  listen(suggestions, 'click', e => {
    const target = (e.target as HTMLElement).closest<HTMLElement>('[data-variable-id]');
    if (target) run(() => { controller.chooseVariable(target.dataset.variableId!); });
  });
  let composing = false;
  listen(input, 'compositionstart', () => { composing = true; });
  listen(input, 'compositionend', () => { composing = false; controller.input(input.value); input.value = ''; refresh(); });
  listen(input, 'input', () => { if (!composing) { controller.input(input.value); input.value = ''; refresh(); } });
  listen(input, 'keydown', e => {
    const k = e as KeyboardEvent;
    if (k.isComposing) return;
    if ((k.ctrlKey || k.metaKey) && k.key === 'Enter') { k.preventDefault(); submit(); return; }
    if ((k.ctrlKey || k.metaKey) && k.key.toLowerCase() === 'z') { k.preventDefault(); run(() => k.shiftKey ? controller.redo() : controller.undo()); return; }
    const commands: Record<string, () => void> = {
      ArrowLeft: () => controller.move(-1), ArrowRight: () => controller.move(1),
      ArrowUp: () => controller.nextSlot(-1), ArrowDown: () => controller.nextSlot(),
      Backspace: () => controller.delete(), Delete: () => controller.delete(true),
      Escape: () => controller.exit(), Home: () => controller.home(), End: () => controller.home(true),
      Enter: () => { controller.commitBuffer(); }
    };
    if (k.key === 'Tab') {
      // Nested Tab navigation; at the top level, let Tab leave the editor for accessibility.
      if (controller.path.length > 1 || controller.buffer) { k.preventDefault(); run(() => controller.nextSlot(k.shiftKey ? -1 : 1)); }
    } else if (commands[k.key]) { k.preventDefault(); run(commands[k.key]); }
  });
  root.append(toolbar, field, input, suggestions, status, help, actions); container.append(root); refresh(false);
  return {
    insertVariable: id => run(() => { if(numeric.test(controller.buffer))controller.commitBuffer();controller.chooseVariable(id); }),
    updateVocabulary: vocabulary => { const next=validateVocabulary(vocabulary); controller.vocabulary.splice(0,controller.vocabulary.length,...next); refresh(false); },
    getDocument: () => { if (destroyed) throw new Error('Editor destroyed'); return controller.getDocument(); },
    loadDocument: d => { if (destroyed) throw new Error('Editor destroyed'); const parsed = parseDocument(d); controller = new EditorController({ mode: controller.mode, vocabulary: controller.vocabulary, document: parsed }); refresh(); },
    submit,
    cancel: () => { if (!destroyed) options.onCancel?.(); },
    focus: () => { if (!destroyed) input.focus({ preventScroll: true }); },
    destroy: () => { if (destroyed) return; destroyed = true; abort.abort(); root.remove(); }
  };
}
export { parseDocument, serialize };
