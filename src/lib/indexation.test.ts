import { describe, it, expect } from 'vitest';
import { readdirSync } from 'node:fs';
import { INDEXABLES, GUIDES, PAS_ENCORE, cheminIndexable } from './indexation';
import { GUIDE } from './guide';

describe('liste des pages indexables', () => {
  it('tient une quinzaine de pages, sans doublon', () => {
    expect(new Set(INDEXABLES).size).toBe(INDEXABLES.length);
    expect(INDEXABLES.length).toBeGreaterThanOrEqual(12);
    expect(INDEXABLES.length).toBeLessThanOrEqual(16);
  });

  it('commence chaque chemin par une barre, sans barre finale ni extension', () => {
    for (const c of INDEXABLES) {
      expect(c.startsWith('/')).toBe(true);
      expect(c === '/' || !c.endsWith('/')).toBe(true);
      expect(c.endsWith('.html')).toBe(false);
    }
  });

  it('recouvre exactement les pages de guide du dépôt et de la table du guide', () => {
    const fichiers = readdirSync(new URL('../pages/guide/', import.meta.url))
      .filter((f) => f.endsWith('.astro') && f !== 'index.astro')
      .map((f) => `/guide/${f.replace(/\.astro$/, '')}`)
      .sort();
    expect([...GUIDES].sort()).toEqual(fichiers);
    expect([...GUIDES].sort()).toEqual(GUIDE.map((p) => `/guide/${p.slug}`).sort());
  });

  it('accepte la liste blanche et refuse le reste', () => {
    for (const c of INDEXABLES) expect(cheminIndexable(c)).toBe(true);
    for (const c of [
      '/question/balisage-0001',
      '/notion/balisage-cardinal',
      '/theme/balisage',
      '/source/decret-2007-1167',
      '/cours/balisage',
      '/cours/balisage/balisage-cardinal',
      '/fiches-revision/balisage',
      '/themes',
      '/examen',
      '/guide/inconnu',
      '/404',
    ]) {
      expect(cheminIndexable(c)).toBe(false);
    }
  });

  it('ne tolère absentes que des pages de la liste', () => {
    for (const c of PAS_ENCORE) expect(INDEXABLES).toContain(c);
  });
});
