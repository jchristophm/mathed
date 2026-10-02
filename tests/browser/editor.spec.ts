import { test, expect, Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { sampleVocabulary } from '../../demo/vocabulary';
let errors: string[];
test.beforeEach(async ({page}) => { errors=[]; page.on('pageerror',e=>errors.push(e.message)); await page.goto('/'); });
test.afterEach(() => { expect(errors || []).toEqual([]); });
test('closing parentheses exit nested powers and fractions inside functions',async({page})=>{
  await type(page,'cos(x^2)+sqrt(x/2)+3 ');
  await page.getByRole('button',{name:'Submit equation',exact:true}).click();
  expect((await document(page)).expression.map((n:any)=>n.type)).toEqual(['function','operator','root','operator','number']);
  await expect(page.locator('#result')).toContainText('Submitted');
});
async function type(page: Page, text: string, host = '#editor') {
  await page.locator(host).getByRole('textbox',{name:'Type mathematics'}).focus();
  await page.keyboard.type(text);
}
async function document(page: Page) { return JSON.parse(await page.locator('#json').innerText()); }
test('ordinary keyboard functions, incorrect equations and implicit multiplication',async({page})=>{
  await type(page,'cos(x)+2 x = 900 ');
  await page.getByRole('button',{name:'Submit equation',exact:true}).click();
  const d=await document(page); expect(d.status).toBe('complete'); expect(d.expression[0]).toEqual({type:'function',name:'cos',argument:[{type:'identifier',name:'x'}]});
  expect(d.expression.slice(-2)).toEqual([{type:'operator',value:'='},{type:'number',value:'900'}]);
  await expect(page.locator('#result')).toContainText('Submitted');
});
test('controlled weight equation and known numerical zero preserve IDs',async({page})=>{
  await page.locator('#mode').selectOption('controlled');
  await type(page,'W_{E,R} = m_R * g_E ');
  await page.getByRole('button',{name:'Submit equation',exact:true}).click();
  expect((await document(page)).expression.filter((n:any)=>n.type==='variable').map((n:any)=>n.id)).toEqual(['earth-rock.weight','rock.mass','earth.gravity']);
  await page.locator('#new').click(); await type(page,'a_R = 0 ');
  await page.getByRole('button',{name:'Submit equation',exact:true}).click();
  expect((await document(page)).expression.at(-1)).toEqual({type:'number',value:'0'});
  await expect(page.locator('.me-field .me-accent')).toHaveCount(0);
});
test('autocomplete and unknown identifier warning',async({page,isMobile})=>{
  await page.locator('#mode').selectOption('controlled'); await type(page,'wei');
  const suggestion=page.locator('.me-suggestions button').filter({hasText:'Earth force on rock'});
  if(isMobile) await suggestion.tap(); else await suggestion.click();
  await type(page,' = nonsense '); await page.getByRole('button',{name:'Submit equation',exact:true}).click();
  await expect(page.locator('.me-status')).toContainText('Unrecognized identifier');
  const d=await document(page); expect(d.status).toBe('draft'); expect(d.pending.text).toBe('nonsense');
  expect(d.expression[0]).toEqual({type:'variable',id:'earth-rock.weight'});
  await expect(page.locator('#result')).not.toContainText('Submitted');
});
test('nested structures, mouse/touch cursor placement and replacement',async({page,isMobile})=>{
  const control=async(name:string)=>{const b=page.getByRole('button',{name,exact:true}); if(isMobile)await b.tap();else await b.click();};
  await control('Fraction'); await type(page,'x+1 '); await control('Next slot');
  await page.getByRole('combobox',{name:'Functions'}).selectOption('cos'); await type(page,'theta '); await control('Exit structure'); await control('Exit structure');
  await control('Power'); await type(page,'2 '); await control('Exit structure');
  const position=page.getByRole('button',{name:'Cursor 0/base/0/denominator/0/argument/0',exact:true});
  if(isMobile)await position.tap(); else await position.click();
  await control('Delete next token'); await type(page,'alpha '); await control('Submit equation');
  const power=(await document(page)).expression[0]; expect(power.type).toBe('power'); expect(power.exponent).toEqual([{type:'number',value:'2'}]);
  expect(power.base[0].denominator[0].argument).toEqual([{type:'symbol',name:'alpha'}]);
  await expect(page.locator('.me-fraction')).toHaveCount(1);
  await expect(page.locator('.me-power')).toHaveCount(1);
});
test('keyboard navigation enters and exits nested slots',async({page})=>{
  await type(page,'x/2 '); await page.keyboard.press('Tab'); await type(page,'+1 ');
  expect((await document(page)).expression).toHaveLength(3);
  await page.keyboard.press('Home'); await page.keyboard.press('ArrowRight');
  await expect(page.locator('.me-current')).toHaveAttribute('data-path','[0,"numerator",0]');
  await page.keyboard.press('ArrowDown'); await expect(page.locator('.me-current')).toHaveAttribute('data-path','[0,"denominator",0]');
  await page.keyboard.press('Escape'); await expect(page.locator('.me-current')).toHaveAttribute('data-path','[1]');
});
test('roots, Greek, subscript and summation controls; legacy derivatives and accents reopen',async({page})=>{
  await type(page,'x_1 '); await page.getByRole('button',{name:'Exit structure',exact:true}).click();
  await type(page,'+'); await page.getByRole('button',{name:'Square root',exact:true}).click(); await type(page,'4 '); await page.getByRole('button',{name:'Exit structure',exact:true}).click();
  await type(page,'+'); await page.getByRole('button',{name:'Summation',exact:true}).click(); await type(page,'i=1 '); await page.getByRole('button',{name:'Next slot',exact:true}).click(); await type(page,'3 '); await page.getByRole('button',{name:'Next slot',exact:true}).click(); await type(page,'x '); await page.getByRole('button',{name:'Exit structure',exact:true}).click();
  await page.getByRole('button',{name:'Submit equation',exact:true}).click(); expect((await document(page)).status).toBe('complete');
  await expect(page.locator('.me-root')).toHaveCount(1); await expect(page.locator('.me-sum')).toHaveCount(1);
  for(const name of ['Derivative','Vector accent','Hat accent'])await expect(page.getByRole('button',{name,exact:true})).toHaveCount(0);
  const legacy={format:'mathed',version:1,status:'complete',expression:[
    {type:'derivative',expression:[{type:'identifier',name:'x'}],variable:[{type:'identifier',name:'x'}],order:[{type:'number',value:'1'}]},
    {type:'accent',kind:'vec',body:[{type:'identifier',name:'v'}]},
    {type:'accent',kind:'hat',body:[{type:'identifier',name:'x'}]}
  ]};
  await page.locator('#open').setInputFiles({name:'legacy.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(legacy))});
  await expect(page.locator('#result')).toContainText('Opened');
  expect((await document(page)).expression).toEqual(legacy.expression);
  await expect(page.locator('.me-derivative')).toHaveCount(1);await expect(page.locator('.me-accent')).toHaveCount(2);
  await page.getByRole('button',{name:'Submit equation',exact:true}).click();expect((await document(page)).status).toBe('complete');
});
test('JSON download/open preserves nested structure and unfinished input',async({page})=>{
  await type(page,'(x+1)/2e-');
  const expected=await document(page), download=page.waitForEvent('download'); await page.locator('#download').click();
  const file=await download; const bytes=await readFile((await file.path())!); expect(JSON.parse(bytes.toString())).toEqual(expected);
  await page.locator('#new').click();
  await page.locator('#open').setInputFiles({name:'saved.mathed.json',mimeType:'application/json',buffer:bytes});
  await expect(page.locator('#result')).toContainText('Opened');
  expect(await document(page)).toEqual(expected);
  await type(page,'3 '); await page.getByRole('button',{name:'Submit equation',exact:true}).click(); expect((await document(page)).status).toBe('complete');
});
test('undo/redo restores structured edits and input',async({page})=>{
  await type(page,'x '); const before=await document(page);
  await page.getByRole('button',{name:'Power',exact:true}).click(); await type(page,'2 '); const after=await document(page);
  for(let i=0;i<3;i++)await page.getByRole('button',{name:'Undo',exact:true}).click(); expect(await document(page)).toEqual(before);
  for(let i=0;i<3;i++)await page.getByRole('button',{name:'Redo',exact:true}).click(); expect(await document(page)).toEqual(after);
});
test('incomplete structures prevent submission and malformed imports leave editing intact',async({page})=>{
  await page.getByRole('button',{name:'Fraction',exact:true}).click(); await type(page,'1 ');
  await page.getByRole('button',{name:'Submit equation',exact:true}).click(); await expect(page.locator('.me-status')).toContainText('denominator');
  const d=await document(page);
  await page.locator('#open').setInputFiles({name:'invalid.json',mimeType:'application/json',buffer:Buffer.from('{"version":99}')});
  await expect(page.locator('#result')).toContainText('Unable to open'); expect(await document(page)).toEqual(d);
});
test('resizing keeps expression, rendering and page width stable',async({page})=>{
  await type(page,'(x+1)/cos(theta)'); const d=await document(page);
  for(const width of [360,1280,420]){
    await page.setViewportSize({width,height:900}); expect(await document(page)).toEqual(d);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  }
  await page.screenshot({path:test.info().outputPath('editor.png'),fullPage:true});
});
test('host renames and missing references resolve by ID; cancellation never mutates source',async({page})=>{
  await page.goto('/examples/embedded.html');
  await page.evaluate(v=> (window as any).example.initialize(v),sampleVocabulary);
  await type(page,'mass=0 ','#first'); await page.locator('#first').getByRole('button',{name:'Submit equation',exact:true}).click();
  const saved=await page.evaluate(()=> (window as any).example.submissions[0]);
  const updated=sampleVocabulary.map(v=>({...v,symbol:v.id==='rock.mass'?'m_{stone}':v.symbol}));
  await page.evaluate(({v,d})=>(window as any).example.initialize(v,d),{v:updated,d:saved});
  await expect(page.locator('#first .me-field')).toContainText('stone');
  await type(page,'+7 ','#first'); await page.locator('#first').getByRole('button',{name:'Cancel editing',exact:true}).click();
  expect(await page.evaluate(()=>(window as any).example.submissions.length)).toBe(0);
  expect(await page.evaluate(()=>(window as any).example.cancellations)).toBe(1);
  expect(saved.expression.at(-1)).toEqual({type:'number',value:'0'});
  await page.evaluate(d=>(window as any).example.initialize([{id:'other',symbol:'m_R'}],d),saved);
  await expect(page.locator('#first .me-field')).toContainText('unresolved: rock.mass');
  expect(await page.evaluate(()=>(window as any).example.first.submit())).toBe(false);
  expect(await page.evaluate(()=>(window as any).example.first.getDocument().expression)).toEqual(saved.expression);
});
test('ambiguous symbols require explicit suggestion selection',async({page})=>{
  await page.goto('/examples/embedded.html');
  await page.evaluate(()=>(window as any).example.initialize([{id:'first-q',symbol:'q',description:'First charge'},{id:'second-q',symbol:'q',description:'Second charge'}]));
  await type(page,'q ','#first'); await expect(page.locator('#first .me-status')).toContainText('Multiple variables');
  await page.locator('#first .me-suggestions button').filter({hasText:'Second charge'}).click();
  await page.locator('#first').getByRole('button',{name:'Submit equation',exact:true}).click();
  expect(await page.evaluate(()=>(window as any).example.submissions[0].expression)).toEqual([{type:'variable',id:'second-q'}]);
});
test('repeated initialization, teardown and parallel sessions do not leak state or listeners',async({page})=>{
  await page.goto('/examples/embedded.html');
  for(let i=0;i<12;i++){
    await page.evaluate(()=>(window as any).example.initialize()); await type(page,'x=0 ','#first');
    await page.locator('#first').getByRole('button',{name:'Submit equation',exact:true}).click();
    expect(await page.evaluate(()=>(window as any).example.submissions.length)).toBe(1);
    expect(await page.evaluate(()=>(window as any).example.second.getDocument().expression)).toEqual([]);
    await type(page,'cos(y)','#second');
    expect(await page.evaluate(()=>(window as any).example.first.getDocument().expression.length)).toBe(3);
  }
  const result=await page.evaluate(()=>{
    const first=(window as any).example.first, input=document.querySelector('#first textarea')!;
    first.destroy(); first.destroy(); input.dispatchEvent(new Event('input'));
    try{first.getDocument();return 'unexpected';}catch{return document.querySelectorAll('#first .mathed-editor').length;}
  });
  expect(result).toBe(0); await expect(page.locator('#second .mathed-editor')).toHaveCount(1);
});
