/**
 * La liste blanche des pages indexables, vérifiée sur `dist/`.
 *
 * `src/lib/indexation.ts` dit quelles pages Google doit garder. Ici on relit
 * le build : toute page HTML hors liste porte `noindex`, toute page de la
 * liste n'en porte pas et a sa canonique, et le sitemap annonce exactement la
 * liste, ni plus ni moins. Un défaut de ce genre ne casse aucun test et ne se
 * voit pas à l'écran.
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { INDEXABLES, PAS_ENCORE } from '../src/lib/indexation.ts';

const DIST = new URL('../dist/', import.meta.url).pathname;
const SITE = process.env.SITE_URL ?? 'https://lepermiscotier.fr';
if (!existsSync(DIST)) {
  console.error('dist/ absent : lance `npm run build` d’abord.');
  process.exit(1);
}

function pagesHtml(racine) {
  const trouvees = [];
  for (const nom of readdirSync(racine)) {
    const chemin = join(racine, nom);
    if (statSync(chemin).isDirectory()) trouvees.push(...pagesHtml(chemin));
    else if (nom.endsWith('.html')) trouvees.push(chemin);
  }
  return trouvees;
}

/** `dist/guide/index.html` ou `dist/guide.html` → `/guide`. */
function cheminDe(fichier) {
  const rel = '/' + relative(DIST, fichier).replace(/\.html$/, '');
  return rel.replace(/\/index$/, '') || '/';
}

const erreurs = [];
const construites = new Map();
for (const fichier of pagesHtml(DIST)) {
  const html = readFileSync(fichier, 'utf-8');
  const robots = /name="robots" content="([^"]*)"/.exec(html)?.[1] ?? '';
  const canonique = /rel="canonical" href="([^"]*)"/.exec(html)?.[1];
  const chemin = cheminDe(fichier);
  construites.set(chemin, { robots, canonique });
}

for (const [chemin, { robots, canonique }] of construites) {
  const blanche = INDEXABLES.includes(chemin);
  const noindex = robots.includes('noindex');
  if (!blanche && !noindex) erreurs.push(`${chemin} : hors liste blanche et sans noindex`);
  if (blanche && noindex) erreurs.push(`${chemin} : dans la liste blanche mais en noindex`);
  if (blanche && !canonique) erreurs.push(`${chemin} : dans la liste blanche, sans canonique`);
  if (blanche && canonique && new URL(canonique).pathname !== chemin) {
    erreurs.push(`${chemin} : canonique vers ${new URL(canonique).pathname}`);
  }
}

for (const chemin of INDEXABLES) {
  if (!construites.has(chemin) && !PAS_ENCORE.includes(chemin)) {
    erreurs.push(`${chemin} : dans la liste blanche, absente du build`);
  }
}

// Le sitemap : exactement la liste blanche construite.
const fichiersSitemap = readdirSync(DIST).filter((f) => /^sitemap-\d+\.xml$/.test(f));
if (fichiersSitemap.length === 0) erreurs.push('sitemap-0.xml absent');
const annoncees = fichiersSitemap
  .flatMap((f) => [...readFileSync(join(DIST, f), 'utf-8').matchAll(/<loc>([^<]*)<\/loc>/g)])
  .map((m) => new URL(m[1], SITE).pathname || '/');
const attendues = INDEXABLES.filter((c) => construites.has(c));
for (const c of annoncees) if (!attendues.includes(c)) erreurs.push(`sitemap : ${c} n’est pas dans la liste blanche`);
for (const c of attendues) if (!annoncees.includes(c)) erreurs.push(`sitemap : ${c} manque`);
if (new Set(annoncees).size !== annoncees.length) erreurs.push('sitemap : adresse en double');

console.log(`${construites.size} pages construites, ${attendues.length} indexables, ${annoncees.length} au sitemap.`);
if (erreurs.length) {
  console.log(`Bloquant (${erreurs.length}) :`);
  for (const e of erreurs.slice(0, 25)) console.log(`  ✗ ${e}`);
  process.exit(1);
}
console.log('Liste blanche, noindex et sitemap concordent.');
