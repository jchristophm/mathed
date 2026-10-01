export const FORMAT_VERSION = 1 as const;
export const FUNCTIONS = ['sin', 'cos', 'tan', 'arcsin', 'arccos', 'arctan', 'sinh', 'cosh', 'tanh', 'exp', 'ln', 'log', 'abs'] as const;
export const GREEK = ['alpha', 'beta', 'gamma', 'delta', 'epsilon', 'eta', 'theta', 'kappa', 'lambda', 'mu', 'nu', 'rho', 'sigma', 'tau', 'phi', 'chi', 'psi', 'omega', 'Delta', 'Sigma', 'Omega'] as const;
export type FunctionName = typeof FUNCTIONS[number];
export type Path = (string | number)[];
export type Expression = MathNode[];
export type MathNode =
  | { type: 'number'; value: string }
  | { type: 'identifier'; name: string }
  | { type: 'variable'; id: string }
  | { type: 'constant'; name: 'pi' | 'e' | 'i' }
  | { type: 'symbol'; name: typeof GREEK[number] }
  | { type: 'operator'; value: '+' | '-' | '*' | '/' | '=' | ',' }
  | { type: 'fraction'; numerator: Expression; denominator: Expression }
  | { type: 'power'; base: Expression; exponent: Expression }
  | { type: 'subscript'; base: Expression; subscript: Expression }
  | { type: 'group'; body: Expression }
  | { type: 'root'; index: Expression; radicand: Expression }
  | { type: 'function'; name: FunctionName; argument: Expression }
  | { type: 'sum'; lower: Expression; upper: Expression; body: Expression }
  | { type: 'derivative'; expression: Expression; variable: Expression; order: Expression }
  | { type: 'accent'; kind: 'vec' | 'hat' | 'bar' | 'dot'; body: Expression };
export interface MathDocument {
  format: 'mathed'; version: 1; status: 'draft' | 'complete'; expression: Expression;
  pending?: { text: string; path: Path };
}
export interface Variable {
  id: string; symbol: string; aliases?: string[];
  description?: string; quantity?: string; object?: string; units?: string;
}
export type Mode = 'standalone' | 'controlled';
export const clone = <T>(value: T): T => structuredClone(value);
export const numeric = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;
export const identifier = /^[\p{L}][\p{L}\p{N}]*$/u;
export function slots(n: MathNode): string[] {
  switch (n.type) {
    case 'fraction': return ['numerator', 'denominator'];
    case 'power': return ['base', 'exponent'];
    case 'subscript': return ['base', 'subscript'];
    case 'group': case 'accent': return ['body'];
    case 'root': return ['index', 'radicand'];
    case 'function': return ['argument'];
    case 'sum': return ['lower', 'upper', 'body'];
    case 'derivative': return ['expression', 'variable', 'order'];
    default: return [];
  }
}
export function child(n: MathNode, key: string): Expression {
  if (!slots(n).includes(key)) throw new Error('Invalid expression slot');
  return (n as unknown as Record<string, Expression>)[key];
}
export function resolve(expression: Expression, path: Path): { list: Expression; index: number } {
  if (!path.length || path.length % 2 !== 1) throw new Error('Invalid cursor path');
  let list = expression;
  for (let i = 0; i < path.length - 1; i += 2) {
    const index = path[i], key = path[i + 1];
    if (typeof index !== 'number' || !Number.isInteger(index) || !list[index] || typeof key !== 'string') throw new Error('Invalid cursor path');
    list = child(list[index], key);
  }
  const index = path.at(-1);
  if (typeof index !== 'number' || !Number.isInteger(index) || index < 0 || index > list.length) throw new Error('Invalid cursor position');
  return { list, index };
}
export function walk(expression: Expression, visit: (n: MathNode) => void): void {
  for (const n of expression) { visit(n); for (const key of slots(n)) walk(child(n, key), visit); }
}
export function draftIssues(expression: Expression): string[] {
  const issues: string[] = [];
  function inspect(list: Expression, label: string, optional = false) {
    if (!list.length && !optional) issues.push('Fill ' + label + '.');
    list.forEach((n, i) => {
      if (n.type === 'operator' && n.value !== ',') {
        const unary = (n.value === '-' || n.value === '+') && (i === 0 || list[i - 1].type === 'operator');
        if (!list[i + 1] || (!unary && (i === 0 || list[i - 1].type === 'operator'))) issues.push('Complete the operation in ' + label + '.');
      }
      for (const key of slots(n)) inspect(child(n, key), key, n.type === 'root' && key === 'index');
    });
  }
  inspect(expression, 'expression');
  return [...new Set(issues)];
}
export function makeDocument(expression: Expression = [], pending?: MathDocument['pending']): MathDocument {
  return { format: 'mathed', version: 1, status: pending || draftIssues(expression).length ? 'draft' : 'complete', expression: clone(expression), ...(pending ? { pending: clone(pending) } : {}) };
}
export function parseDocument(input: unknown): MathDocument {
  const value = typeof input === 'string' ? JSON.parse(input) : input;
  const record = (v: unknown): Record<string, unknown> => {
    if (!v || typeof v !== 'object' || Array.isArray(v)) throw new Error('Expected an object');
    return v as Record<string, unknown>;
  };
  const exact = (v: Record<string, unknown>, keys: string[]) => {
    if (Object.keys(v).some(k => !keys.includes(k))) throw new Error('Unsupported document field');
  };
  const text = (v: unknown) => {
    if (typeof v !== 'string' || !v.length || v.length > 1024) throw new Error('Invalid text value');
    return v;
  };
  let count = 0;
  function inspect(list: unknown, depth: number): void {
    if (!Array.isArray(list) || depth > 32 || list.length > 10000) throw new Error('Invalid or oversized expression');
    for (const raw of list) {
      if (++count > 10000) throw new Error('Expression too large');
      const n = record(raw), type = text(n.type);
      let scalar: string[] = [];
      switch (type) {
        case 'number': if (!numeric.test(text(n.value))) throw new Error('Invalid number'); scalar = ['value']; break;
        case 'identifier': if (!identifier.test(text(n.name))) throw new Error('Invalid identifier'); scalar = ['name']; break;
        case 'variable': text(n.id); scalar = ['id']; break;
        case 'constant': if (!['pi', 'e', 'i'].includes(text(n.name))) throw new Error('Invalid constant'); scalar = ['name']; break;
        case 'symbol': if (!(GREEK as readonly string[]).includes(text(n.name))) throw new Error('Invalid symbol'); scalar = ['name']; break;
        case 'operator': if (!['+', '-', '*', '/', '=', ','].includes(text(n.value))) throw new Error('Invalid operator'); scalar = ['value']; break;
        case 'function': if (!(FUNCTIONS as readonly string[]).includes(text(n.name))) throw new Error('Invalid function'); scalar = ['name']; break;
        case 'accent': if (!['vec', 'hat', 'bar', 'dot'].includes(text(n.kind))) throw new Error('Invalid accent'); scalar = ['kind']; break;
        case 'fraction': case 'power': case 'subscript': case 'group': case 'root': case 'sum': case 'derivative': break;
        default: throw new Error('Unsupported node type');
      }
      const keys = slots(n as unknown as MathNode);
      exact(n, ['type', ...scalar, ...keys]);
      for (const key of keys) inspect(n[key], depth + 1);
    }
  }
  const d = record(value);
  exact(d, ['format', 'version', 'status', 'expression', 'pending']);
  if (d.format !== 'mathed' || d.version !== 1 || !['draft', 'complete'].includes(String(d.status))) throw new Error('Unsupported Mathed format/version/status');
  inspect(d.expression, 0);
  if (d.pending !== undefined) {
    const pending = record(d.pending);
    exact(pending, ['text', 'path']); text(pending.text);
    if (!Array.isArray(pending.path)) throw new Error('Invalid pending cursor');
    resolve(d.expression as Expression, pending.path as Path);
  }
  if (d.status === 'complete' && (d.pending || draftIssues(d.expression as Expression).length)) throw new Error('Incomplete document marked complete');
  return clone(d as unknown as MathDocument);
}
export const serialize = (document: MathDocument): string => JSON.stringify(parseDocument(document), null, 2);
