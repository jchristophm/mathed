import { clone, Variable } from './model';
export function validateVocabulary(input: readonly Variable[] = []): Variable[] {
  const ids = new Set<string>();
  const vocabulary = clone([...input]);
  for (const v of vocabulary) {
    if (!v || typeof v.id !== 'string' || !v.id || v.id.length > 1024 || ids.has(v.id)) throw new Error('Vocabulary IDs must be nonempty and unique');
    ids.add(v.id);
    if (typeof v.symbol !== 'string' || !v.symbol || v.symbol.length > 1024) throw new Error('Variable symbol is required');
    if (v.aliases && (!Array.isArray(v.aliases) || v.aliases.some(a => typeof a !== 'string' || !a || a.length > 1024))) throw new Error('Invalid variable aliases');
    for (const key of ['description', 'quantity', 'object', 'units'] as const) if (v[key] !== undefined && typeof v[key] !== 'string') throw new Error('Invalid variable metadata');
  }
  return vocabulary;
}
export const normalize = (s: string) => s.replace(/[{}\\\s]/g, '').toLocaleLowerCase();
export function names(v: Variable): string[] { return [v.symbol, v.symbol.replace(/[{}\\_,\s]/g, ''), ...(v.aliases || [])]; }
export function matches(vocabulary: readonly Variable[], input: string, exact = false): Variable[] {
  const q = normalize(input);
  return q ? vocabulary.filter(v => names(v).some(n => exact ? normalize(n) === q : normalize(n).startsWith(q))) : [];
}
