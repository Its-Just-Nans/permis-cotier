/**
 * Les dix questions de `/test-permis-cotier`, choisies une fois pour toutes.
 *
 * Une par thème, faciles à moyennes, sans visuel, toutes relues. La page les
 * porte dans son HTML : un moteur les lit sans JavaScript. Chaque entrée garde
 * la bonne réponse attendue, et `verifierSelection` arrête le build si une
 * question est dépubliée, change de réponse ou a gagné un visuel : la page ne
 * doit pas dire autre chose que la banque.
 */
import type { QuestionAffichable } from './affichable';

export const SELECTION: readonly { id: string; reponses: readonly string[] }[] = [
  { id: 'titre-conduite-0007', reponses: ['b'] },
  { id: 'balisage-0040', reponses: ['a'] },
  { id: 'barre-route-0021', reponses: ['a'] },
  { id: 'signaux-0001', reponses: ['b'] },
  { id: 'securite-0015', reponses: ['a'] },
  { id: 'meteo-0001', reponses: ['b'] },
  { id: 'vhf-0005', reponses: ['b'] },
  { id: 'carburant-0003', reponses: ['b'] },
  { id: 'ecluses-0006', reponses: ['b'] },
  { id: 'environnement-0002', reponses: ['b'] },
];

/** Les questions de la sélection, dans l'ordre, ou une erreur qui dit laquelle a dérivé. */
export function verifierSelection(publiees: readonly QuestionAffichable[]): QuestionAffichable[] {
  const dire = (id: string, quoi: string): never => {
    throw new Error(`test-gratuit : ${id} ${quoi}. Reprendre SELECTION dans src/lib/test-gratuit.ts.`);
  };
  const themes = new Set<string>();
  return SELECTION.map(({ id, reponses }) => {
    const q = publiees.find((p) => p.id === id);
    if (!q) return dire(id, 'n’est plus publiée');
    if ([...q.reponses].sort().join() !== [...reponses].sort().join()) {
      return dire(id, `ne répond plus « ${reponses.join(', ')} » mais « ${q.reponses.join(', ')} »`);
    }
    if (q.visuel) return dire(id, 'porte un visuel');
    if (themes.has(q.theme)) return dire(id, `redouble le thème ${q.theme}`);
    themes.add(q.theme);
    return q;
  });
}
