import { expect, it } from 'vitest';
import { EditorController } from '../../src/controller';
import { child, Expression, makeDocument, MathNode, parseDocument, slots } from '../../src/model';
const n=(value='12'):MathNode=>({type:'number',value});
const fixtures:Expression[]=[
  [{type:'fraction',numerator:[n('1')],denominator:[n('2')]}],
  [{type:'power',base:[{type:'identifier',name:'v'}],exponent:[n('2')]}],
  [{type:'subscript',base:[{type:'identifier',name:'m'}],subscript:[{type:'identifier',name:'R'}]}],
  [{type:'group',body:[{type:'fraction',numerator:[n('1')],denominator:[n('2')]}]},{type:'identifier',name:'m'},{type:'power',base:[{type:'identifier',name:'v'}],exponent:[n('2')]}],
  [{type:'fraction',numerator:[{type:'power',base:[n()],exponent:[n('3')]}],denominator:[{type:'subscript',base:[{type:'identifier',name:'mass'}],subscript:[n('2')]}]}],
  [{type:'fraction',numerator:[],denominator:[n()]}],
  [{type:'power',base:[n()],exponent:[]}],
  [{type:'subscript',base:[],subscript:[n()]}],
  [{type:'group',body:[{type:'fraction',numerator:[],denominator:[]}]}],
  [{type:'function',name:'cos',argument:[{type:'root',index:[],radicand:[n()]}]}],
  [{type:'sum',lower:[n('1')],upper:[n('9')],body:[{type:'identifier',name:'x'}]}],
  [{type:'derivative',expression:[n()],variable:[{type:'identifier',name:'x'}],order:[n('1')]},{type:'accent',kind:'vec',body:[{type:'identifier',name:'v'}]}]
];
for(const forward of [false,true]){
  it.each(fixtures.map((expression,i)=>({expression,i})))('repeated '+(forward?'Delete':'Backspace')+' empties fixture $i and undo/redo restores it',({expression})=>{
    const c=new EditorController({document:makeDocument(expression)}); c.setCursor([forward?0:expression.length]);
    const original=c.getDocument(); let operations=0;
    while(c.expression.length||c.buffer){
      const before=JSON.stringify({d:c.getDocument(),path:c.path});
      c.delete(forward); operations++;
      expect(JSON.stringify({d:c.getDocument(),path:c.path})).not.toBe(before);
      expect(()=>parseDocument(c.getDocument())).not.toThrow();
      expect(operations).toBeLessThan(150);
    }
    expect(c.path).toEqual([0]);
    for(let i=0;i<operations;i++)c.undo();
    expect(c.getDocument()).toEqual(original);
    for(let i=0;i<operations;i++)c.redo();
    expect(c.expression).toEqual([]); expect(c.buffer).toBe('');
  });
}
it('deletion and arrows share sibling-slot navigation at partially filled boundaries',()=>{
  const d=makeDocument([{type:'fraction',numerator:[n()],denominator:[]}]);
  const a=new EditorController({document:d}),b=new EditorController({document:d});
  a.setCursor([0,'denominator',0]);b.setCursor(a.path);a.move(-1);b.delete();
  expect(b.path).toEqual(a.path);expect(b.expression).toEqual(a.expression);
  a.setCursor([0,'numerator',1]);b.setCursor(a.path);a.move(1);b.delete(true);
  expect(b.path).toEqual(a.path);expect(b.expression).toEqual(a.expression);
});
it('symmetric deletion makes progress from every position in arbitrary nested structures',()=>{
  for(let seed=0;seed<20;seed++){
    let expression=structuredClone(fixtures[seed%fixtures.length]);
    for(let depth=0;depth<2;depth++){const parent=structuredClone(fixtures[4][0]);child(parent,slots(parent)[0]).splice(0,1,...expression);expression=[parent];}
    const source=new EditorController({document:makeDocument(expression)});
    for(const forward of [false,true])for(const path of source.positions()){
      const c=new EditorController({document:source.getDocument()});c.setCursor(path);
      for(let i=0;i<120;i++){
        const before=JSON.stringify({d:c.getDocument(),path:c.path});c.delete(forward);
        expect(()=>parseDocument(c.getDocument())).not.toThrow();
        if(JSON.stringify({d:c.getDocument(),path:c.path})===before)break;
        expect(i).toBeLessThan(119);
      }
    }
  }
});
