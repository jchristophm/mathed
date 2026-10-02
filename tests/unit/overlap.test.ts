import { expect,it } from 'vitest';
import { EditorController } from '../../src/controller';
import { sampleVocabulary } from '../../demo/vocabulary';
import { parseDocument,serialize } from '../../src/model';
import { toLatex } from '../../src/latex';
it('never commits a shorter prefix while m_R or m_{R,2} is still being typed',()=>{
  const c=new EditorController({mode:'controlled',vocabulary:sampleVocabulary});
  c.input('m');expect(c.expression).toEqual([]);expect(c.suggestions.map(v=>v.symbol)).toEqual(expect.arrayContaining(['m','m_R','m_{R,2}']));
  c.input('_{R,');expect(c.expression).toEqual([]);c.input('2} ');expect(c.expression).toEqual([{type:'variable',id:'demo.mass-2'}]);
  c.input('+m_R ');expect(c.expression.at(-1)).toEqual({type:'variable',id:'rock.mass'});
});
it('offers explicit selection when m alias and display symbol are ambiguous',()=>{
  const c=new EditorController({mode:'controlled',vocabulary:sampleVocabulary});c.input('m ');
  expect(c.expression).toEqual([]);expect(c.warning).toMatch(/Multiple/);c.chooseVariable('demo.mass');
  expect(c.submit()?.expression).toEqual([{type:'variable',id:'demo.mass'}]);
});
it('renames and removes overlapping vocabulary variables without substituting IDs',()=>{
  const c=new EditorController({mode:'controlled',vocabulary:sampleVocabulary});c.input('m_{R,2} = 0 ');
  const original=c.submit()!, saved=parseDocument(serialize(original));
  const renamed=sampleVocabulary.map(v=>({...v,symbol:v.id==='demo.mass-2'?'m_{stone,2}':v.symbol}));
  const revised=new EditorController({mode:'controlled',vocabulary:renamed,document:saved});
  expect(toLatex(revised.expression,renamed)).toContain('m_{stone,2}');expect(revised.submit()?.expression).toEqual(original.expression);
  const removed=new EditorController({mode:'controlled',vocabulary:renamed.filter(v=>v.id!=='demo.mass-2').concat({id:'replacement',symbol:'m_{R,2}'}),document:saved});
  expect(removed.submit()).toBeNull();expect(removed.issues()).toContain('Unresolved variable: demo.mass-2');expect(removed.expression).toEqual(original.expression);
});
