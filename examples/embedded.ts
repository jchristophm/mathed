import { createEditor, MathedEditor, MathDocument, Variable } from '../src/mathed';
// A normal browser host owns persistence and supplies callbacks. No globals are required by Mathed.
const firstHost = document.querySelector<HTMLElement>('#first')!;
const secondHost = document.querySelector<HTMLElement>('#second')!;
const output = document.querySelector<HTMLElement>('#output')!;
let first: MathedEditor, second: MathedEditor, submissions: MathDocument[] = [], cancellations = 0;
function initialize(vocabulary: Variable[] = [], document?: MathDocument) {
  first?.destroy(); second?.destroy(); submissions = []; cancellations = 0;
  first = createEditor(firstHost, { mode: vocabulary.length ? 'controlled' : 'standalone', vocabulary, document,
    onSubmit: d => { submissions.push(d); output.textContent = JSON.stringify(d, null, 2); },
    onCancel: () => { cancellations++; output.textContent = 'Canceled'; }
  });
  second = createEditor(secondHost, { onSubmit: d => { output.textContent = JSON.stringify(d, null, 2); } });
}
initialize();
// This example's host API makes lifecycle and persistence experiments possible from developer tools.
Object.assign(window, { example: {
  initialize, get first() { return first; }, get second() { return second; },
  get submissions() { return submissions; }, get cancellations() { return cancellations; }
} });
