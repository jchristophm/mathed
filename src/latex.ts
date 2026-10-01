import { Expression, MathNode, Variable } from './model';
export function escapeText(text: string): string {
  const escapes: Record<string, string> = { '\\': '\\textbackslash{}', '{': '\\{', '}': '\\}', '_': '\\_', '%': '\\%', '#': '\\#', '&': '\\&', '$': '\\$', '^': '\\textasciicircum{}', '~': '\\textasciitilde{}' };
  return [...text].map(c => escapes[c] || c).join('');
}
export function nodeToLatex(n: MathNode, vocabulary: readonly Variable[] = []): string {
  const render = (expression: Expression) => toLatex(expression, vocabulary) || '\\square';
  switch (n.type) {
    case 'number': return n.value.replace(/[eE]([+-]?\d+)$/, '\\times 10^{$1}');
    case 'identifier': return n.name.length === 1 ? n.name : '\\mathit{' + n.name + '}';
    case 'variable': {
      const v = vocabulary.find(v => v.id === n.id);
      return v ? '{' + v.symbol + '}' : '\\text{unresolved: ' + escapeText(n.id) + '}';
    }
    case 'constant': return n.name === 'pi' ? '\\pi' : '\\mathrm{' + n.name + '}';
    case 'symbol': return '\\' + n.name;
    case 'operator': return n.value === '*' ? '\\cdot' : n.value === '/' ? '\\div' : n.value;
    case 'fraction': return '\\frac{' + render(n.numerator) + '}{' + render(n.denominator) + '}';
    case 'power': return '{' + render(n.base) + '}^{' + render(n.exponent) + '}';
    case 'subscript': return '{' + render(n.base) + '}_{' + render(n.subscript) + '}';
    case 'group': return '\\left(' + render(n.body) + '\\right)';
    case 'root': return '\\sqrt' + (n.index.length ? '[' + render(n.index) + ']' : '') + '{' + render(n.radicand) + '}';
    case 'function': return n.name === 'abs' ? '\\left|' + render(n.argument) + '\\right|' : '\\' + n.name + '\\left(' + render(n.argument) + '\\right)';
    case 'sum': return '\\sum_{' + render(n.lower) + '}^{' + render(n.upper) + '}{' + render(n.body) + '}';
    case 'derivative': return '\\frac{d^{' + render(n.order) + '}{' + render(n.expression) + '}}{d{' + render(n.variable) + '}^{' + render(n.order) + '}}';
    case 'accent': return '\\' + n.kind + '{' + render(n.body) + '}';
  }
}
export const toLatex = (expression: Expression, vocabulary: readonly Variable[] = []): string => expression.map(n => nodeToLatex(n, vocabulary)).join(' ');
