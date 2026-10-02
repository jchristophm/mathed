import { test,expect,Page } from '@playwright/test';
const doc=async(page:Page)=>JSON.parse(await page.locator('#json').innerText());
async function type(page:Page,text:string){await page.locator('#editor textarea').focus();await page.keyboard.type(text);}
const number=(value:string)=>({type:'number',value});
const cases=[
  [{type:'group',body:[{type:'fraction',numerator:[number('1')],denominator:[number('2')]}]},{type:'identifier',name:'m'},{type:'power',base:[{type:'identifier',name:'v'}],exponent:[number('2')]}],
  [{type:'fraction',numerator:[{type:'subscript',base:[{type:'identifier',name:'m'}],subscript:[{type:'identifier',name:'R'}]}],denominator:[{type:'power',base:[{type:'identifier',name:'v'}],exponent:[number('2')]}]}],
  [{type:'fraction',numerator:[number('1')],denominator:[]},{type:'subscript',base:[{type:'identifier',name:'x'}],subscript:[]}]
];
for(const forward of [false,true])for(const [index,expression]of cases.entries()){
  test((forward?'Delete':'Backspace')+' completely empties nested fixture '+index+' and undo/redo restores it',async({page})=>{
    const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');
    const saved={format:'mathed',version:1,status:index===2?'draft':'complete',expression};
    await page.locator('#open').setInputFiles({name:'nested.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(saved))});
    await expect(page.locator('#result')).toContainText('Opened');await page.locator('#editor textarea').focus();
    if(forward)await page.keyboard.press('Home');
    let count=0;
    while((await doc(page)).expression.length||(await doc(page)).pending){
      await page.keyboard.press(forward?'Delete':'Backspace');count++;expect(count).toBeLessThan(80);
    }
    await expect(page.locator('.me-current')).toHaveAttribute('data-path','[0]');
    for(let i=0;i<count;i++)await page.keyboard.press('Control+z');
    expect((await doc(page)).expression).toEqual(expression);
    for(let i=0;i<count;i++)await page.keyboard.press('Control+Shift+z');
    expect((await doc(page)).expression).toEqual([]);expect((await doc(page)).pending).toBeUndefined();expect(errors).toEqual([]);
  });
}
test('overlapping m variables stay buffered until chosen or explicitly committed',async({page,isMobile})=>{
  await page.goto('/');await page.locator('#mode').selectOption('controlled');await type(page,'m');
  expect((await doc(page)).expression).toEqual([]);
  await expect(page.locator('.me-suggestions button')).toHaveCount(3);
  await type(page,'_{R,2} ');expect((await doc(page)).expression).toEqual([{type:'variable',id:'demo.mass-2'}]);
  await page.locator('#new').click();await type(page,'m ');
  await expect(page.locator('.me-status')).toContainText('Multiple');
  const exact=page.locator('.me-suggestions [data-variable-id="demo.mass"]');
  if(isMobile)await exact.tap();else await exact.click();
  expect((await doc(page)).expression).toEqual([{type:'variable',id:'demo.mass'}]);
});
test('demo vocabulary add, rename, remove, apply, reset and JSON reopening',async({page})=>{
  await page.goto('/');await page.locator('#mode').selectOption('controlled');await type(page,'m_R = 0 ');
  await page.getByRole('button',{name:'Submit equation',exact:true}).click();const saved=await doc(page);
  await page.getByText('Demonstration vocabulary',{exact:true}).click();
  await page.getByRole('textbox',{name:'Display symbol 1',exact:true}).fill('m_{stone}');
  expect((await page.locator('.me-field').innerText())).not.toContain('stone');
  await page.getByRole('button',{name:'Apply vocabulary',exact:true}).click();
  await expect(page.locator('.me-field')).toContainText('stone');expect((await doc(page)).expression).toEqual(saved.expression);
  await page.locator('#open').setInputFiles({name:'old.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(saved))});
  await expect(page.locator('#result')).toContainText('Opened');await expect(page.locator('.me-field')).toContainText('stone');
  await page.getByRole('button',{name:'Add entry',exact:true}).click();
  await page.getByRole('textbox',{name:'Persistent ID 8',exact:true}).fill('test.extra');await page.getByRole('textbox',{name:'Display symbol 8',exact:true}).fill('q_2');
  await page.getByRole('button',{name:'Apply vocabulary',exact:true}).click();await expect(page.locator('.library-status')).toContainText('Applied');
  await page.locator('#new').click();await type(page,'q_2 ');expect((await doc(page)).expression).toEqual([{type:'variable',id:'test.extra'}]);
  await page.getByRole('button',{name:'Remove entry 8',exact:true}).click();await page.getByRole('button',{name:'Apply vocabulary',exact:true}).click();
  await expect(page.locator('.me-field')).toContainText('unresolved: test.extra');expect((await doc(page)).expression).toEqual([{type:'variable',id:'test.extra'}]);
  await page.getByRole('button',{name:'Reset vocabulary',exact:true}).click();await expect(page.getByRole('textbox',{name:'Display symbol 1',exact:true})).toHaveValue('m_R');
  await page.locator('#open').setInputFiles({name:'old.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(saved))});
  await expect(page.locator('#result')).toContainText('Opened');expect((await doc(page)).expression).toEqual(saved.expression);
});
test('invalid or duplicate demonstration IDs leave the active session intact',async({page})=>{
  await page.goto('/');await page.locator('#mode').selectOption('controlled');await type(page,'mass=0 ');const before=await doc(page);
  await page.getByText('Demonstration vocabulary',{exact:true}).click();
  await page.getByRole('textbox',{name:'Persistent ID 2',exact:true}).fill('rock.mass');
  await page.getByRole('button',{name:'Apply vocabulary',exact:true}).click();await expect(page.locator('.library-status')).toContainText('unique');expect(await doc(page)).toEqual(before);
});
test('compact mathematical spacing stays stable during cursor navigation and still permits touch placement',async({page,isMobile})=>{
  await page.goto('/');await type(page,'cos(theta) = ');await page.evaluate(()=>document.fonts.ready);
  const metrics=()=>page.locator('.me-field').evaluate(field=>{
    const f=field.querySelector('.me-function')!,a=f.querySelector('.me-symbol')!;
    const glyphs=[...f.querySelectorAll('.me-glyph')];const left=glyphs[0].getBoundingClientRect(),right=glyphs[1].getBoundingClientRect(),arg=a.getBoundingClientRect();
    return {width:f.getBoundingClientRect().width,leftGap:arg.left-left.right,rightGap:right.left-arg.right,positions:[...field.querySelectorAll('.me-position:not(.me-empty):not(.me-pending)')].map(p=>p.getBoundingClientRect().width)};
  });
  const before=await metrics();expect(before.leftGap).toBeLessThan(4);expect(before.rightGap).toBeLessThan(4);expect(before.positions.every(w=>w<=1.1)).toBe(true);
  await page.keyboard.press('Home');await page.keyboard.press('ArrowRight');expect(Math.abs((await metrics()).width-before.width)).toBeLessThan(1);
  const slot=page.getByRole('button',{name:'Cursor 0/argument/0',exact:true});if(isMobile)await slot.tap();else await slot.click();
  await expect(page.locator('.me-current')).toHaveAttribute('data-path','[0,"argument",0]');
  await page.screenshot({path:test.info().outputPath('spacing.png'),fullPage:true});
  const nested={format:'mathed',version:1,status:'complete',expression:[...cases[0],{type:'operator',value:'+'},{type:'subscript',base:[{type:'identifier',name:'x'}],subscript:[number('1')]}]};
  await page.locator('#open').setInputFiles({name:'spacing.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(nested))});
  await expect(page.locator('#result')).toContainText('Opened');
  const nestedMetrics=()=>page.locator('.me-field').evaluate(field=>{
    const sequence=field.querySelector('.me-sequence')!,nodes=[...sequence.children].filter(el=>el.classList.contains('me-node'));
    return {width:sequence.getBoundingClientRect().width,gap:nodes[1].getBoundingClientRect().left-nodes[0].getBoundingClientRect().right,
      operatorMargin:parseFloat(getComputedStyle(field.querySelector('.me-binary')!).marginLeft),
      scripts:[...field.querySelectorAll('.me-script')].map(el=>({size:parseFloat(getComputedStyle(el).fontSize),gap:el.getBoundingClientRect().left-el.previousElementSibling!.getBoundingClientRect().right}))};
  });
  const layout=await nestedMetrics();expect(layout.gap).toBeLessThan(4);expect(layout.operatorMargin).toBeGreaterThan(3);
  expect(layout.scripts.every(s=>s.size<23&&s.gap<4)).toBe(true);
  await page.locator('#editor textarea').focus();await page.keyboard.press('Home');
  for(let i=0;i<14;i++){await page.keyboard.press('ArrowRight');expect(Math.abs((await nestedMetrics()).width-layout.width)).toBeLessThan(1);}
  await page.getByRole('button',{name:'Submit equation',exact:true}).click();expect((await doc(page)).status).toBe('complete');
  await page.locator('#open').setInputFiles({name:'partial.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({format:'mathed',version:1,status:'draft',expression:cases[2]}))});
  await expect(page.locator('#result')).toContainText('Opened');
  const partialWidth=()=>page.locator('.me-field > .me-sequence').evaluate(el=>el.getBoundingClientRect().width);
  const initialWidth=await partialWidth();await page.locator('#editor textarea').focus();await page.keyboard.press('Home');
  for(let i=0;i<10;i++){await page.keyboard.press('ArrowRight');expect(Math.abs((await partialWidth())-initialWidth)).toBeLessThan(1);}
});
