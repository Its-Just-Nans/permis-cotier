import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { parse } from 'yaml';
import { SELECTION, verifierSelection } from './test-gratuit';
import type { QuestionAffichable } from './affichable';

const RACINE = new URL('../../data/questions/', import.meta.url);

function charger(id: string): QuestionAffichable {
  const theme = id.replace(/-\d+$/, '');
  const d = parse(readFileSync(new URL(`${theme}/${id}.yaml`, RACINE), 'utf-8'));
  return { ...d, statut: d.statut } as unknown as QuestionAffichable;
}

describe('sélection du test gratuit', () => {
  it('compte dix questions, toutes de thèmes différents', () => {
    expect(SELECTION).toHaveLength(10);
    expect(new Set(SELECTION.map((s) => s.id.replace(/-\d+$/, ''))).size).toBe(10);
  });

  it('colle à la banque : publiées, relues, réponse inchangée, sans visuel', () => {
    for (const { id, reponses } of SELECTION) {
      const q = charger(id) as unknown as { statut: string; reponses: string[]; visuel?: unknown; meta: { relu_par: string } };
      expect(q.statut, id).toBe('publie');
      expect(q.meta.relu_par, id).toBe('alexis');
      expect(q.reponses, id).toEqual(reponses);
      expect(q.visuel, id).toBeUndefined();
    }
  });

  it('rend les questions dans l’ordre de la sélection', () => {
    const publiees = SELECTION.map((s) => charger(s.id)).reverse();
    expect(verifierSelection(publiees).map((q) => q.id)).toEqual(SELECTION.map((s) => s.id));
  });

  it('arrête le build quand une question dérive', () => {
    const publiees = SELECTION.map((s) => charger(s.id));
    expect(() => verifierSelection(publiees.slice(1))).toThrow(/n’est plus publiée/);
    const autre = publiees.map((q, i) => (i === 0 ? { ...q, reponses: ['c'] } : q));
    expect(() => verifierSelection(autre)).toThrow(/ne répond plus/);
    const visuel = publiees.map((q, i) => (i === 1 ? { ...q, visuel: { fichier: 'x', alt: 'x', credit: 'x' } } : q));
    expect(() => verifierSelection(visuel)).toThrow(/porte un visuel/);
  });
});
