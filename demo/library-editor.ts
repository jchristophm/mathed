import { clone, Variable } from '../src/model';
import { validateVocabulary } from '../src/vocabulary';
// Demo-only mutable library. Each apply creates a new core editor session.
export function createLibraryEditor(host: HTMLElement, initial: readonly Variable[], apply: (library: Variable[]) => void): void {
  let draft = clone([...initial]);
  host.innerHTML = '<p>Edit symbols while keeping their IDs to test renaming. Apply starts a new editor session with the current equation. Removing an entry preserves any unresolved references.</p><div class="library-rows"></div><div class="demo-tools"><button type="button" data-action="add">Add entry</button><button type="button" data-action="apply">Apply vocabulary</button><button type="button" data-action="reset">Reset vocabulary</button></div><p class="library-status" role="status"></p>';
  const rows = host.querySelector<HTMLElement>('.library-rows')!, status = host.querySelector<HTMLElement>('.library-status')!;
  function read(): Variable[] {
    return [...rows.children].map((row, i) => {
      const value = (field: string) => row.querySelector<HTMLInputElement>('[data-field="'+field+'"]')!.value.trim();
      return { ...draft[i], id: value('id'), symbol: value('symbol'), aliases: value('aliases').split(';').map(s=>s.trim()).filter(Boolean), description: value('description') };
    });
  }
  function render(): void {
    rows.replaceChildren();
    draft.forEach((v, i) => {
      const row = document.createElement('fieldset'), legend = document.createElement('legend'); legend.textContent = 'Entry ' + (i + 1); row.append(legend);
      for (const [field, label, value] of [['id','Persistent ID',v.id],['symbol','Display symbol',v.symbol],['aliases','Aliases (semicolon separated)',(v.aliases||[]).join('; ')],['description','Description',v.description||'']]) {
        const wrap = document.createElement('label'), input = document.createElement('input');
        wrap.textContent = label; input.value = value; input.dataset.field = field; input.setAttribute('aria-label',label+' '+(i+1)); wrap.append(input); row.append(wrap);
      }
      const remove = document.createElement('button'); remove.type='button'; remove.textContent='Remove entry'; remove.setAttribute('aria-label','Remove entry '+(i+1));
      remove.addEventListener('click',()=>{ draft=read(); draft.splice(i,1); render(); status.textContent='Draft changed. Apply to start a new session.'; });
      row.append(remove); rows.append(row);
    });
  }
  host.querySelector('[data-action="add"]')!.addEventListener('click',()=>{ draft=read(); draft.push({id:'',symbol:''}); render(); status.textContent='Enter a unique persistent ID and display symbol, then apply.'; });
  host.querySelector('[data-action="apply"]')!.addEventListener('click',()=>{
    try { const library=validateVocabulary(read()); apply(library); draft=clone(library); status.textContent='Applied vocabulary to a new session. Current equation preserved.'; }
    catch(error) { status.textContent='Unable to apply: '+(error as Error).message; }
  });
  host.querySelector('[data-action="reset"]')!.addEventListener('click',()=>{ const library=clone([...initial]); apply(library); draft=clone(library); render(); status.textContent='Original vocabulary restored. Current equation preserved.'; });
  render();
}
