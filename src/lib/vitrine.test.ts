import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { captureVitrine } from './vitrine';

describe('captureVitrine', () => {
  it('garde l’original en src et ajoute les dérivés en srcset', () => {
    const c = captureVitrine('cours', '228px');
    expect(c.src).toBe('/vitrine/cours.webp');
    expect(c.srcset).toBe(
      '/vitrine/cours-320.webp 320w, /vitrine/cours-480.webp 480w, /vitrine/cours.webp 640w',
    );
    expect(c.sizes).toBe('228px');
    expect(c.width).toBe(640);
    expect(c.height).toBe(1391);
  });

  it('chaque fichier cité existe dans public/', () => {
    for (const nom of ['accueil', 'cours', 'examen', 'resultat', 'correction']) {
      const c = captureVitrine(nom, '100px');
      for (const url of c.srcset.split(', ').map((x) => x.split(' ')[0])) {
        expect(existsSync(`public${url}`), url).toBe(true);
      }
    }
  });
});
