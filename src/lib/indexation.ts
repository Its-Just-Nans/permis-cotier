/**
 * Les pages que Google doit garder, et seulement celles-là.
 *
 * Le site compte près de mille pages, dont la plupart se ressemblent
 * (questions, notions, leçons). Google en a exploré presque toutes et n'en a
 * indexé que deux. On concentre donc l'index sur une quinzaine de pages
 * fortes : le reste porte `noindex, follow`, ce qui laisse les liens vivre,
 * et sort du sitemap.
 *
 * Cette liste est la source unique : le layout y lit le `robots`, le sitemap
 * s'y filtre, et `scripts/verifier-indexation.mjs` en contrôle le build.
 * `robots.txt` ne ferme rien de tout ça : Google doit pouvoir lire une page
 * pour y voir le `noindex`.
 */

export const GUIDES = [
  '/guide/cotier-ou-fluvial',
  '/guide/examen-du-permis-cotier',
  '/guide/limites-du-permis-cotier',
  '/guide/ou-passer-le-permis-cotier',
  '/guide/permis-cotier-candidat-libre',
  '/guide/permis-cotier-cpf',
  '/guide/prix-du-permis-cotier',
] as const;

export const INDEXABLES: readonly string[] = [
  '/',
  '/test-permis-cotier',
  '/cours',
  '/guide',
  ...GUIDES,
  '/fiches-revision',
  '/app',
  '/a-propos',
];

/**
 * Les pages de la liste qui ne sont pas encore construites. Le garde-fou de
 * build les tolère absentes et refuse de les voir au sitemap.
 */
export const PAS_ENCORE: readonly string[] = [];

/** Un chemin tel que le sert le site : `cheminServi()` de `seo.ts`. */
export function cheminIndexable(chemin: string): boolean {
  return INDEXABLES.includes(chemin);
}
