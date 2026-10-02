import katex from 'katex';
import { EditorController } from './controller';
import { child, Expression, MathNode, Path } from './model';
import { nodeToLatex } from './latex';
const element = (tag: string, className: string, text = '') => {
  const e = document.createElement(tag); e.className = className; if (text) e.textContent = text; return e;
};
export function renderExpression(controller: EditorController): HTMLElement {
  const selected = JSON.stringify(controller.path);
  function sequence(list: Expression, prefix: Path, optional = false): HTMLElement {
    const row = element('span', 'me-sequence');
    for (let i = 0; i <= list.length; i++) {
      const path = prefix.concat(i);
      const position = element('button', 'me-position');
      position.setAttribute('type', 'button');
      position.dataset.path = JSON.stringify(path);
      position.setAttribute('aria-label', 'Cursor ' + path.join('/'));
      position.tabIndex = -1;
      const current = JSON.stringify(path) === selected;
      if (!list.length && !optional && !(current && controller.buffer)) position.classList.add('me-empty');
      if (current) {
        position.classList.add('me-current');
        if (controller.buffer) { position.classList.add('me-pending'); position.append(element('span', 'me-buffer', controller.buffer)); }
        position.append(element('span', 'me-caret', '|'));
      } else if (!list.length && !optional) position.append(element('span', 'me-hole', '□'));
      row.append(position);
      if (list[i]) {
        const rendered = node(list[i], prefix.concat(i));
        if (list[i].type === 'operator') {
          const operator = list[i] as Extract<MathNode, { type: 'operator' }>;
          rendered.classList.add(operator.value === '=' ? 'me-relation' : operator.value === ',' ? 'me-comma' : i > 0 && list[i - 1].type !== 'operator' ? 'me-binary' : 'me-unary');
        }
        row.append(rendered);
      }
    }
    return row;
  }
  function node(n: MathNode, path: Path): HTMLElement {
    const wrapper = element('span', 'me-node me-' + n.type);
    wrapper.dataset.nodeType = n.type;
    const slot = (key: string) => sequence(child(n, key), path.concat(key), n.type === 'root' && key === 'index');
    const glyph = (text: string) => element('span', 'me-glyph', text);
    switch (n.type) {
      case 'fraction':
        wrapper.append(element('span', 'me-numerator'), element('span', 'me-denominator'));
        wrapper.children[0].append(slot('numerator')); wrapper.children[1].append(slot('denominator')); break;
      case 'power': case 'subscript': {
        wrapper.append(slot('base'));
        const small = element('span', 'me-script'); small.append(slot(n.type === 'power' ? 'exponent' : 'subscript')); wrapper.append(small); break;
      }
      case 'group': wrapper.append(glyph('('), slot('body'), glyph(')')); break;
      case 'root': {
        const small = element('span', 'me-root-index'); small.append(slot('index'));
        const radicand = element('span', 'me-radicand'); radicand.append(slot('radicand'));
        wrapper.append(small, glyph('√'), radicand); break;
      }
      case 'function': wrapper.append(glyph(n.name === 'abs' ? '|' : n.name + '('), slot('argument'), glyph(n.name === 'abs' ? '|' : ')')); break;
      case 'sum': {
        const limits = element('span', 'me-limits');
        limits.append(slot('upper'), glyph('∑'), slot('lower')); wrapper.append(limits, slot('body')); break;
      }
      case 'derivative': {
        const quotient = element('span', 'me-fraction'), top = element('span', 'me-numerator'), bottom = element('span', 'me-denominator');
        const order = element('span', 'me-script'); order.append(slot('order'));
        top.append(glyph('d'), order, slot('expression')); bottom.append(glyph('d'), slot('variable'));
        // Order is editable once, displayed in the denominator as well.
        if (n.order.length) { const displayOrder = element('span', 'me-script'); katex.render(n.order.map(x => nodeToLatex(x, controller.vocabulary)).join(' '), displayOrder, { throwOnError: false, trust: false, strict: 'ignore' }); bottom.append(displayOrder); }
        quotient.append(top, bottom); wrapper.append(quotient); break;
      }
      case 'accent': wrapper.append(element('span', 'me-accent-mark', { vec: '→', hat: '^', bar: '¯', dot: '·' }[n.kind]), slot('body')); break;
      default:
        if (n.type === 'variable' && !controller.vocabulary.some(v => v.id === n.id)) {
          wrapper.classList.add('me-unresolved'); wrapper.textContent = '[unresolved: ' + n.id + ']';
        } else {
          katex.render(nodeToLatex(n, controller.vocabulary), wrapper, { throwOnError: false, trust: false, strict: 'ignore', maxExpand: 100, maxSize: 10 });
        }
        // Clicking a leaf positions the cursor immediately after its semantic token.
        wrapper.dataset.path = JSON.stringify(path.slice(0, -1).concat((path.at(-1) as number) + 1));
    }
    return wrapper;
  }
  return sequence(controller.expression, []);
}
