import { describe, expect, it } from 'vitest';
import { EditorController } from '../../src/controller';
import { Expression, FUNCTIONS, GREEK, makeDocument, MathNode, parseDocument, serialize, slots, child } from '../../src/model';
import { toLatex } from '../../src/latex';
import { sampleVocabulary } from '../../demo/vocabulary';
const controlled = () => new EditorController({ mode: 'controlled', vocabulary: sampleVocabulary });
describe('buffered mathematical input', () => {
  it('closes the enclosing function through powers and fractions rather than changing its argument', () => {
    const c = new EditorController(); c.input('cos(x^2)+sqrt(x/2)+3 ');
    expect(c.submit()?.expression.map(n=>n.type)).toEqual(['function','operator','root','operator','number']);
    expect(toLatex(c.expression)).toBe('\\cos\\left({x}^{2}\\right) + \\sqrt{\\frac{x}{2}} + 3');
  });
  it('preserves unmatched closing parentheses as incomplete drafts', () => {
    const c = new EditorController(); c.input('x)'); expect(c.getDocument().pending?.text).toBe(')'); expect(c.submit()).toBeNull();
    c.delete(); expect(c.submit()).not.toBeNull();
  });
  it.each(['0', '12', '2.50', '.125', '3e8', '1.2e-3', '1E+4'])('preserves numerical spelling %s', value => {
    const c = new EditorController(); c.input(value + ' '); expect(c.expression).toEqual([{ type: 'number', value }]); expect(c.submit()?.status).toBe('complete');
  });
  it('preserves negative numbers, incorrect equalities and implicit multiplication', () => {
    const c = new EditorController(); c.input('-2 x = 999 '); const d = c.submit()!;
    expect(d.expression).toEqual([{ type:'operator',value:'-' },{ type:'number',value:'2' },{ type:'identifier',name:'x' },{ type:'operator',value:'=' },{ type:'number',value:'999' }]);
    expect(parseDocument(serialize(d))).toEqual(d);
  });
  it.each(FUNCTIONS)('recognizes %s without LaTeX commands', name => {
    const c = new EditorController(); c.input(name + '(x)');
    expect(c.expression).toEqual([{ type:'function',name,argument:[{type:'identifier',name:'x'}] }]);
    expect(c.path).toEqual([1]); expect(c.submit()).not.toBeNull();
  });
  it.each(GREEK)('recognizes standalone Greek %s', name => {
    const c = new EditorController(); c.input(name + ' '); expect(c.expression).toEqual([{type:'symbol',name}]); expect(toLatex(c.expression)).toBe('\\' + name);
  });
  it('edits nested fractions, powers, functions and parentheses with slot traversal', () => {
    const c = new EditorController(); c.input('(x+1)'); c.input('/cos(theta)'); c.exit(); c.input('^2 '); c.exit();
    expect(c.submit()).not.toBeNull();
    expect(toLatex(c.expression)).toBe('{\\frac{\\left(x + 1\\right)}{\\cos\\left(\\theta\\right)}}^{2}');
    const positions = c.positions(); for (const path of positions) { c.setCursor(path); expect(c.path).toEqual(path); }
    c.home(); c.move(1); expect(c.path.length).toBeGreaterThan(1);
    const saved = c.getDocument(); expect(new EditorController({ document: parseDocument(serialize(saved)) }).expression).toEqual(c.expression);
  });
  it('supports roots, subscripts, summations, derivatives and explicit vector accents', () => {
    const c = new EditorController(); c.input('x_1 '); c.exit(); c.input('+sqrt(4)');
    c.input('+'); c.insertStructure('sum'); c.input('i=1 '); c.nextSlot(); c.input('3 '); c.nextSlot(); c.input('x '); c.exit();
    c.input('+'); c.insertStructure('derivative'); c.input('x '); c.nextSlot(); c.input('x '); c.exit();
    c.input('+'); c.insertStructure('vec'); c.input('v '); c.exit();
    expect(c.submit()).not.toBeNull();
    expect(toLatex(c.expression)).toContain('\\sum_{\\mathrm{i} = 1}^{3}');
    expect(toLatex(c.expression)).toContain('\\frac{d^{1}{x}}{d{x}^{1}}');
    expect(toLatex(c.expression)).toContain('\\vec{v}');
  });
  it('keeps holes and invalid numbers as explicit drafts until completed', () => {
    const c = new EditorController(); c.insertStructure('fraction'); c.input('1 '); expect(c.submit()).toBeNull();
    c.nextSlot(); c.input('2e-'); expect(c.submit()).toBeNull();
    const draft = parseDocument(serialize(c.getDocument())); expect(draft.pending?.text).toBe('2e-');
    const reopened = new EditorController({document:draft}); reopened.input('3 '); expect(reopened.submit()).not.toBeNull();
  });
  it('deletes and replaces atomic identifiers and navigates structures without destroying content', () => {
    const c = new EditorController(); c.input('12 '); c.delete(); expect(c.buffer).toBe('1'); c.input('3 '); expect(c.expression).toEqual([{type:'number',value:'13'}]);
    c.input('/4 '); c.exit(); c.delete(); expect(c.path).toEqual([0,'denominator',1]);
    c.home(); c.delete(true); c.input('5 '); expect(toLatex(c.expression)).toBe('\\frac{13}{5}');
    c.exit(); c.home(); c.delete(true); expect(c.path).toEqual([0,'numerator',0]);
    for(let i=0;i<12&&(c.expression.length||c.buffer);i++)c.delete(true);
    expect(c.expression).toEqual([]);
  });
  it('undoes and redoes structure, input and pending state', () => {
    const c = new EditorController(); c.input('x '); const before = c.getDocument();
    c.insertStructure('power'); c.input('2 '); c.exit(); const after = c.getDocument();
    c.undo(); c.undo(); c.undo(); expect(c.getDocument()).toEqual(before);
    c.redo(); c.redo(); c.redo(); expect(c.getDocument()).toEqual(after);
  });
});
describe('controlled vocabulary and host identities', () => {
  it('constructs the weight equation with exact external IDs and zero', () => {
    const c = controlled(); c.input('W_{E,R} = m_R * g_E '); const d = c.submit()!;
    expect(d.expression).toEqual([{type:'variable',id:'earth-rock.weight'},{type:'operator',value:'='},{type:'variable',id:'rock.mass'},{type:'operator',value:'*'},{type:'variable',id:'earth.gravity'}]);
    expect(toLatex(d.expression,sampleVocabulary)).toBe('{W_{E,R}} = {m_R} \\cdot {g_E}');
    const zero = controlled(); zero.input('a_R = 0 '); expect(zero.submit()?.expression.at(-1)).toEqual({type:'number',value:'0'});
  });
  it('resolves renames by ID and preserves missing references', () => {
    const c = controlled(); c.input('mass = 0 '); const d = c.submit()!;
    const revised = sampleVocabulary.map(v=>({...v,symbol:v.id==='rock.mass'?'m_{stone}':v.symbol}));
    const renamed = new EditorController({mode:'controlled',vocabulary:revised,document:d});
    expect(toLatex(renamed.expression,revised)).toContain('m_{stone}'); expect(renamed.submit()?.expression).toEqual(d.expression);
    const absent = new EditorController({mode:'controlled',vocabulary:[],document:d});
    expect(absent.issues()).toContain('Unresolved variable: rock.mass'); expect(absent.submit()).toBeNull();
    expect(absent.getDocument().expression).toEqual(d.expression); expect(absent.getDocument().status).toBe('draft');
  });
  it('selects the first ambiguous match and supports choosing another', () => {
    const c = new EditorController({mode:'controlled',vocabulary:[{id:'one',symbol:'q',aliases:['charge']},{id:'two',symbol:'q',aliases:['charge']}]});
    c.input('charge'); expect(c.expression).toEqual([]); expect(c.suggestions).toHaveLength(2);expect(c.selectedSuggestion?.id).toBe('one');
    c.chooseVariable('two'); expect(c.submit()?.expression).toEqual([{type:'variable',id:'two'}]);
  });
  it('warns for unknown identifiers without authorizing or losing the draft buffer', () => {
    const c = controlled(); c.input('banana '); expect(c.submit()).toBeNull(); expect(c.warning).toMatch(/Unrecognized/);
    expect(c.expression).toEqual([]); expect(parseDocument(serialize(c.getDocument())).pending?.text).toBe('banana');
  });
  it('allows wrong equations and ordinary constants/functions, without vector accents', () => {
    const c = controlled(); c.input('weight = cos(mass)+pi+0 '); expect(c.submit()).not.toBeNull();
    expect(toLatex(c.expression,sampleVocabulary)).not.toContain('vec');
  });
  it('does not authorize standalone identifiers imported into controlled mode', () => {
    const c = controlled(), standalone = new EditorController(); standalone.input('x '); const d = standalone.submit()!;
    const imported = new EditorController({mode:c.mode,vocabulary:c.vocabulary,document:d}); expect(imported.submit()).toBeNull();
    expect(imported.getDocument().expression).toEqual(d.expression);
  });
  it('uses defensive copies and independent histories', () => {
    const input = structuredClone(sampleVocabulary), c = new EditorController({mode:'controlled',vocabulary:input}), second = controlled();
    input[0].id = 'changed'; c.input('mass '); const d = c.getDocument(); d.expression.length = 0;
    expect(c.expression).toEqual([{type:'variable',id:'rock.mass'}]); expect(second.expression).toEqual([]); second.undo(); expect(c.expression).toHaveLength(1);
  });
  it('rejects duplicate host IDs but permits ambiguous display symbols', () => {
    expect(()=>new EditorController({vocabulary:[sampleVocabulary[0],sampleVocabulary[0]]})).toThrow(/unique/);
    expect(()=>new EditorController({vocabulary:[{id:'a',symbol:'x'},{id:'b',symbol:'x'}]})).not.toThrow();
  });
});
describe('document validation', () => {
  it.each([
    {type:'number',value:'NaN'}, {type:'number',value:'2e'}, {type:'variable',id:''},
    {type:'identifier',name:'x<script>'}, {type:'function',name:'html',argument:[]},
    {type:'operator',value:'??'}, {type:'power',base:[]}, {type:'unknown'}
  ])('rejects malformed nodes %j', node => {
    expect(()=>parseDocument({format:'mathed',version:1,status:'draft',expression:[node]})).toThrow();
  });
  it('rejects unsupported versions, invalid cursor paths and falsely complete documents', () => {
    expect(()=>parseDocument({...makeDocument(),version:2})).toThrow();
    expect(()=>parseDocument({...makeDocument(),status:'complete'})).toThrow();
    expect(()=>parseDocument({...makeDocument(),pending:{text:'x',path:[99]}})).toThrow();
  });
  it('round trips all structure types and arbitrary nested combinations without rewriting', () => {
    const atom: MathNode = {type:'number',value:'-1.20e-3'};
    const structures: MathNode[] = [
      {type:'fraction',numerator:[atom],denominator:[atom]}, {type:'power',base:[atom],exponent:[atom]},
      {type:'subscript',base:[{type:'identifier',name:'x'}],subscript:[atom]}, {type:'group',body:[atom]},
      {type:'root',index:[atom],radicand:[atom]}, {type:'function',name:'arctan',argument:[atom]},
      {type:'sum',lower:[atom],upper:[atom],body:[atom]}, {type:'derivative',expression:[atom],variable:[atom],order:[atom]},
      {type:'accent',kind:'vec',body:[atom]}
    ];
    for (let i=0;i<60;i++) {
      let expression: Expression = [structuredClone(structures[i%structures.length])];
      for (let depth=0;depth<4;depth++) { const parent=structuredClone(structures[(i+depth)%structures.length]); child(parent,slots(parent)[0]).splice(0,1,...expression); expression=[parent]; }
      const d=makeDocument(expression); expect(parseDocument(serialize(d))).toEqual(d);
      expect(new EditorController({document:d}).getDocument()).toEqual(d); expect(toLatex(expression)).not.toContain('undefined');
    }
  });
});
