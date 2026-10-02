import { child, clone, draftIssues, Expression, FORMAT_VERSION, FUNCTIONS, GREEK, makeDocument, MathDocument, MathNode, Mode, numeric, parseDocument, Path, resolve, slots, Variable, walk } from './model';
import { matches, validateVocabulary } from './vocabulary';
export interface ControllerOptions { mode?: Mode; vocabulary?: readonly Variable[]; document?: MathDocument }
interface Snapshot { expression: Expression; path: Path; buffer: string }
export type Structure = 'fraction' | 'power' | 'subscript' | 'group' | 'root' | 'sum' | 'derivative' | 'vec' | 'hat' | 'bar' | 'dot';
export class EditorController {
  readonly mode: Mode;
  readonly vocabulary: Variable[];
  expression: Expression;
  path: Path = [0];
  buffer = '';
  warning = '';
  private past: Snapshot[] = [];
  private future: Snapshot[] = [];
  constructor(options: ControllerOptions = {}) {
    if (options.mode && !['standalone', 'controlled'].includes(options.mode)) throw new Error('Invalid mode');
    this.mode = options.mode || 'standalone';
    this.vocabulary = validateVocabulary(options.vocabulary);
    const d = options.document ? parseDocument(options.document) : makeDocument();
    this.expression = clone(d.expression);
    this.path = d.pending ? clone(d.pending.path) : [this.expression.length];
    this.buffer = d.pending?.text || '';
  }
  private snapshot(): Snapshot { return { expression: clone(this.expression), path: clone(this.path), buffer: this.buffer }; }
  private remember(): void { this.past.push(this.snapshot()); if (this.past.length > 200) this.past.shift(); this.future = []; }
  private restore(s: Snapshot): void { this.expression = clone(s.expression); this.path = clone(s.path); this.buffer = s.buffer; this.warning = ''; }
  undo(): void { const s = this.past.pop(); if (s) { this.future.push(this.snapshot()); this.restore(s); } }
  redo(): void { const s = this.future.pop(); if (s) { this.past.push(this.snapshot()); this.restore(s); } }
  get suggestions(): Variable[] { return this.mode === 'controlled' ? matches(this.vocabulary, this.buffer) : []; }
  private put(n: MathNode, field?: string): void {
    const { list, index } = resolve(this.expression, this.path);
    list.splice(index, 0, n);
    this.path = field ? this.path.slice(0, -1).concat(index, field, 0) : this.path.slice(0, -1).concat(index + 1);
  }
  private flush(): boolean {
    const value = this.buffer;
    if (!value) return true;
    if (numeric.test(value)) { this.put({ type: 'number', value }); }
    else {
      const candidates = this.mode === 'controlled' ? matches(this.vocabulary, value, true) : [];
      if (candidates.length > 1) { this.warning = 'Multiple variables match. Choose a suggestion.'; return false; }
      if (candidates.length === 1) this.put({ type: 'variable', id: candidates[0].id });
      else if ((FUNCTIONS as readonly string[]).includes(value)) this.put({ type: 'function', name: value as typeof FUNCTIONS[number], argument: [] }, 'argument');
      else if (value === 'sqrt') this.put({ type: 'root', index: [], radicand: [] }, 'radicand');
      else if (['pi', 'e', 'i'].includes(value)) this.put({ type: 'constant', name: value as 'pi' | 'e' | 'i' });
      else if ((GREEK as readonly string[]).includes(value) && this.mode === 'standalone') this.put({ type: 'symbol', name: value as typeof GREEK[number] });
      else if (this.mode === 'standalone' && /^[\p{L}][\p{L}\p{N}]*$/u.test(value)) this.put({ type: 'identifier', name: value });
      else { this.warning = this.mode === 'controlled' ? 'Unrecognized identifier: ' + value + '. Choose an allowed variable.' : 'Incomplete number or unsupported identifier: ' + value; return false; }
    }
    this.buffer = ''; this.warning = ''; return true;
  }
  commitBuffer(): boolean { this.remember(); return this.flush(); }
  chooseVariable(id: string): boolean {
    const v = this.vocabulary.find(v => v.id === id);
    if (!v || this.mode !== 'controlled') return false;
    this.remember(); this.buffer = ''; this.warning = ''; this.put({ type: 'variable', id }); return true;
  }
  input(text: string): void {
    for (const char of text) {
      this.remember();
      if (this.buffer.length >= 1024) { this.warning = 'Input is too long. Commit or delete the current buffer.'; continue; }
      if (/\d|\./.test(char)) { this.buffer += char; this.warning = ''; continue; }
      if (/[\p{L}]/u.test(char)) {
        if (/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(this.buffer) && char !== 'e' && char !== 'E') { if (!this.flush()) continue; }
        this.buffer += char; this.warning = ''; continue;
      }
      if ((char === '+' || char === '-') && /^\d.*[eE]$/.test(this.buffer)) { this.buffer += char; continue; }
      if (this.mode === 'controlled' && this.buffer && /[_{}]/.test(char)) { this.buffer += char; continue; }
      if (char === ',' && this.buffer.includes('{') && !this.buffer.includes('}')) { this.buffer += char; continue; }
      const wasFunction = ((FUNCTIONS as readonly string[]).includes(this.buffer) || this.buffer === 'sqrt') && !(this.mode === 'controlled' && matches(this.vocabulary, this.buffer, true).length);
      if (!this.flush()) continue;
      if (char === ' ' || char === '\n' || char === '\t') continue;
      if (char === '(' && wasFunction) continue;
      if (char === '(') this.structure('group');
      else if (char === ')') this.closeParenthesis();
      else if (char === '^') this.structure('power');
      else if (char === '_') this.structure('subscript');
      else if (char === '/') this.structure('fraction');
      else if (['+', '-', '*', '=', ','].includes(char)) this.put({ type: 'operator', value: char as '+' });
      else if (char === 'π') this.put({ type: 'constant', name: 'pi' });
      else {
        const greekUnicode: Record<string, typeof GREEK[number]> = { 'θ': 'theta', 'α': 'alpha', 'β': 'beta', 'μ': 'mu', 'ρ': 'rho', 'Δ': 'Delta', 'ω': 'omega' };
        if (this.mode === 'standalone' && greekUnicode[char]) this.put({ type: 'symbol', name: greekUnicode[char] });
        else { this.buffer = char; this.warning = 'Unsupported input: ' + char; }
      }
    }
  }
  insertFunction(name: typeof FUNCTIONS[number]): void {
    if (!FUNCTIONS.includes(name)) return;
    this.remember(); if (this.flush()) this.put({ type: 'function', name, argument: [] }, 'argument');
  }
  insertSymbol(name: string): void {
    this.remember(); if (!this.flush()) return;
    if (name === 'pi') this.put({ type: 'constant', name: 'pi' });
    else if (this.mode === 'standalone' && (GREEK as readonly string[]).includes(name)) this.put({ type: 'symbol', name: name as typeof GREEK[number] });
    else this.warning = 'Use a supplied variable for this symbol in controlled mode.';
  }
  insertStructure(type: Structure): void { this.remember(); if (this.flush()) this.structure(type); }
  private structure(type: Structure): void {
    const { list, index } = resolve(this.expression, this.path);
    let base: Expression = [];
    if (['fraction', 'power', 'subscript'].includes(type) && index > 0 && list[index - 1].type !== 'operator') {
      base = list.splice(index - 1, 1); this.path[this.path.length - 1] = index - 1;
    }
    switch (type) {
      case 'fraction': this.put({ type, numerator: base, denominator: [] }, base.length ? 'denominator' : 'numerator'); break;
      case 'power': this.put({ type, base, exponent: [] }, base.length ? 'exponent' : 'base'); break;
      case 'subscript': this.put({ type, base, subscript: [] }, base.length ? 'subscript' : 'base'); break;
      case 'group': this.put({ type, body: [] }, 'body'); break;
      case 'root': this.put({ type, index: [], radicand: [] }, 'radicand'); break;
      case 'sum': this.put({ type, lower: [], upper: [], body: [] }, 'lower'); break;
      case 'derivative': this.put({ type, expression: [], variable: [], order: [{ type: 'number', value: '1' }] }, 'expression'); break;
      default: this.put({ type: 'accent', kind: type, body: [] }, 'body');
    }
  }
  setCursor(path: Path): boolean {
    resolve(this.expression, path);
    if (!this.flush()) return false;
    // Committing a buffer can insert a node at the selected position. Revalidate after mutation.
    resolve(this.expression, path); this.path = clone(path); return true;
  }
  positions(): Path[] {
    const paths: Path[] = [];
    function visit(list: Expression, prefix: Path) {
      for (let i = 0; i <= list.length; i++) {
        paths.push(prefix.concat(i));
        if (list[i]) for (const key of slots(list[i])) visit(child(list[i], key), prefix.concat(i, key));
      }
    }
    visit(this.expression, []); return paths;
  }
  move(direction: -1 | 1): void {
    if (!this.flush()) return;
    this.advance(direction);
  }
  private advance(direction: -1 | 1): void {
    const positions = this.positions(), index = positions.findIndex(p => JSON.stringify(p) === JSON.stringify(this.path));
    this.path = positions[Math.max(0, Math.min(positions.length - 1, index + direction))];
  }
  nextSlot(direction: -1 | 1 = 1): void {
    if (!this.flush()) return;
    if (this.path.length === 1) { this.move(direction); return; }
    const nodePath = this.path.slice(0, -2), { list, index } = resolve(this.expression, nodePath);
    const keys = slots(list[index]), fieldIndex = keys.indexOf(this.path.at(-2) as string);
    const next = keys[fieldIndex + direction];
    this.path = next ? nodePath.concat(next, 0) : nodePath.slice(0, -1).concat(index + (direction > 0 ? 1 : 0));
  }
  exit(): void {
    if (!this.flush()) return;
    if (this.path.length > 1) {
      const nodePath = this.path.slice(0, -2);
      this.path = nodePath.slice(0, -1).concat((nodePath.at(-1) as number) + 1);
    }
  }
  private closeParenthesis(): void {
    for (let length = this.path.length - 2; length > 0; length -= 2) {
      const nodePath = this.path.slice(0, length);
      const { list, index } = resolve(this.expression, nodePath);
      if (['group', 'function', 'root'].includes(list[index].type)) {
        this.path = nodePath.slice(0, -1).concat(index + 1); return;
      }
    }
    this.buffer = ')'; this.warning = 'Unmatched closing parenthesis. Delete it or complete the draft.';
  }
  home(end = false): void { if (this.flush()) { const { list } = resolve(this.expression, this.path); this.path[this.path.length - 1] = end ? list.length : 0; } }
  delete(forward = false): void {
    this.remember(); this.warning = '';
    if (this.buffer) { this.buffer = forward ? this.buffer.slice(1) : this.buffer.slice(0, -1); return; }
    const direction = forward ? 1 : -1;
    // Empty containers are removable from their slots as well as from outside.
    if (this.path.length > 1) {
      const nodePath = this.path.slice(0, -2), parent = resolve(this.expression, nodePath);
      if (slots(parent.list[parent.index]).every(key => !child(parent.list[parent.index], key).length)) {
        parent.list.splice(parent.index, 1); this.path = nodePath; return;
      }
    }
    const { list, index } = resolve(this.expression, this.path);
    const targetIndex = forward ? index : index - 1, target = list[targetIndex];
    if (!target) { this.advance(direction); return; }
    if (slots(target).length && slots(target).some(key => child(target, key).length)) {
      // Traverse the exact ordered positions used by arrow keys, including
      // sibling slots. Do not jump outside a nonempty parent at a slot boundary.
      this.advance(direction); return;
    }
    list.splice(targetIndex, 1); this.path[this.path.length - 1] = targetIndex;
    const text = target.type === 'number' ? target.value : target.type === 'identifier' ? target.name : '';
    this.buffer = forward ? text.slice(1) : text.slice(0, -1);
  }
  issues(): string[] {
    const issues = draftIssues(this.expression);
    if (this.buffer) issues.push(this.warning || 'Commit the pending input.');
    walk(this.expression, n => {
      if (n.type === 'variable' && !this.vocabulary.some(v => v.id === n.id)) issues.push('Unresolved variable: ' + n.id);
      if (this.mode === 'controlled' && (n.type === 'identifier' || n.type === 'symbol')) issues.push('Identifier is outside the supplied vocabulary.');
    });
    return [...new Set(issues)];
  }
  getDocument(): MathDocument {
    const d = makeDocument(this.expression, this.buffer ? { text: this.buffer, path: this.path } : undefined);
    if (this.issues().length) d.status = 'draft';
    return d;
  }
  submit(): MathDocument | null {
    this.remember(); if (!this.flush()) return null;
    const issues = this.issues();
    if (issues.length) { this.warning = issues.join(' '); return null; }
    return { format: 'mathed', version: FORMAT_VERSION, status: 'complete', expression: clone(this.expression) };
  }
}
