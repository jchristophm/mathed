import { describe, expect, it } from 'vitest';
import Ajv from 'ajv';
import katex from 'katex';
import schema from '../../docs/document.schema.json';
import weight from '../../examples/weight-equation.json';
import zero from '../../examples/known-zero.json';
import draft from '../../examples/nested-draft.json';
import { parseDocument } from '../../src/model';
import { toLatex } from '../../src/latex';
import { sampleVocabulary } from '../../demo/vocabulary';
describe('published schema and presentation',()=>{
  const validate=new Ajv({strict:false}).compile(schema);
  it.each([weight,zero,draft])('accepts published examples losslessly',example=>{
    expect(validate(example),JSON.stringify(validate.errors)).toBe(true);
    expect(parseDocument(example)).toEqual(example);
    expect(()=>katex.renderToString(toLatex(parseDocument(example).expression,sampleVocabulary),{throwOnError:true,trust:false})).not.toThrow();
  });
  it('rejects extra fields, unsupported types and pending input on complete documents',()=>{
    for(const invalid of [{...weight,version:2},{...weight,unrequested:true},{...weight,pending:{text:'x',path:[0]}},{...weight,expression:[{type:'latex',value:'x'}]}]){
      expect(validate(invalid)).toBe(false); expect(()=>parseDocument(invalid)).toThrow();
    }
  });
  it('renders representative full nested expressions with KaTeX without parse errors',()=>{
    const expression=parseDocument({format:'mathed',version:1,status:'complete',expression:[
      {type:'fraction',numerator:[{type:'function',name:'arccos',argument:[{type:'symbol',name:'theta'}]}],denominator:[{type:'root',index:[],radicand:[{type:'number',value:'2.50e-3'}]}]},
      {type:'operator',value:'+'},{type:'derivative',expression:[{type:'power',base:[{type:'identifier',name:'x'}],exponent:[{type:'number',value:'2'}]}],variable:[{type:'identifier',name:'x'}],order:[{type:'number',value:'1'}]}
    ]}).expression;
    expect(()=>katex.renderToString(toLatex(expression),{throwOnError:true})).not.toThrow();
  });
});
