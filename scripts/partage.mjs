#!/usr/bin/env node
/**
 * Dessine l'image de partage du site.
 *
 *     node scripts/partage.mjs            # écrit public/partage/
 *     node scripts/partage.mjs --verifier # échoue si le fichier livré a dérivé
 *
 * C'est la seule image que voient ceux qui n'ont pas encore ouvert le site.
 * Elle montre donc la page qu'elle ouvre, à la DA « page calme » (DESIGN.md) :
 * page blanche, l'en-tête et son filet, le titre de l'accueil, et à droite une
 * vraie question de la banque, corrigée. Le jaune franc n'y sert qu'une fois.
 *
 * Rien n'y est chiffré : voir `texte()`. La question montrée est confrontée à
 * son fichier avant d'être dessinée. Voir `VITRINE`.
 *
 * Le texte est composé en police système par librsvg, sans mesure : les
 * retours à la ligne sont écrits à la main et jugés sur le PNG produit.
 * Le rendu dépend des polices installées, d'où un `--verifier` local
 * seulement ; la CI ne garde que la vitrine (`--vitrine`).
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const RACINE = dirname(dirname(fileURLToPath(import.meta.url)));
const QUESTIONS = join(RACINE, 'data', 'questions');
const SORTIE = join(RACINE, 'public', 'partage');
const FICHIER = join(SORTIE, 'le-permis-cotier.png');

const LARGEUR = 1200;
const HAUTEUR = 630;

// Reprises telles quelles de `:root` dans src/styles/global.css (DA « page calme »).
const FOND = '#ffffff';
const TEXTE = '#37352f';
const TEXTE_DOUX = '#6b6a65';
const FILET = '#e9e9e7';
const FILET_FORT = '#8e8c86';
const ACTION = '#191918';
const SUR_ACTION = '#ffffff';
const VERT = '#3f8458';
const VERT_PALE = '#e3f0e4';
const VERT_TEXTE = '#245133';
const JAUNE = '#ffc72c';

/**
 * La police système, comme `--sans` : San Francisco sur le Mac qui dessine
 * l'image, Helvetica Neue en repli. Le rendu dépend donc des polices de la
 * machine, ce qui exclut `--verifier` de la CI (voir en bas).
 */
const SANS = "'SF Pro Display', 'SF Pro', 'System Font', 'Helvetica Neue', Helvetica, Arial, sans-serif";
/** `--rayon` et `--rayon-etiquette`, en pixels, à l'échelle de l'image. */
const RAYON = 14;
const RAYON_ETIQUETTE = 6;

/**
 * La question montrée en vitrine, comme l'accueil montre la sienne. Une
 * proposition seule ne veut rien dire, et une question sans son énoncé est
 * fausse : les deux vont ensemble ou pas du tout.
 *
 * Le texte est recopié ici parce que ses coupes sont réglées à l'œil, mais il
 * est confronté au fichier de la banque à chaque rendu. Une question retouchée,
 * dépubliée ou dont la bonne réponse change arrête le script au lieu de laisser
 * l'image mentir dans le dos de tout le monde.
 */
const VITRINE = {
  id: 'titre-conduite-0007',
  theme: 'titre-conduite',
  enonce: 'Jusqu’où l’option « côtière » permet-elle de naviguer ?',
  lettre: 'b',
  texte: 'Jusqu’à 6 milles d’un abri',
  // Les autres propositions, dans l'ordre du fichier : la carte les montre
  // toutes, comme le quiz.
  autres: { a: 'Jusqu’à 2 milles d’un abri', c: 'Jusqu’à 12 milles d’un abri' },
};

/**
 * La banque écrit ses apostrophes droites, la charte les veut courbes : le
 * dessin suit la charte, et la comparaison ignore la différence.
 */
function memeTexte(a, b) {
  const plat = (t) => t.replace(/[’']/g, "'").replace(/\s+/g, ' ').trim();
  return plat(a).includes(plat(b));
}

/** Confronte la vitrine à la banque. Toute dérive arrête le rendu. */
function verifierVitrine() {
  const chemin = join(QUESTIONS, VITRINE.theme, `${VITRINE.id}.yaml`);
  if (!existsSync(chemin)) {
    throw new Error(`partage : ${VITRINE.id} n'est plus dans la banque. Reprendre VITRINE.`);
  }
  const brut = readFileSync(chemin, 'utf-8');
  const dire = (quoi) => {
    throw new Error(`partage : ${VITRINE.id} ${quoi}. Reprendre VITRINE dans scripts/partage.mjs.`);
  };
  if (!/^statut:\s*publie\s*$/m.test(brut)) dire('n’est plus publiée');
  if (!memeTexte(brut, VITRINE.enonce)) dire('n’a plus cet énoncé');
  for (const texte of [VITRINE.texte, ...Object.values(VITRINE.autres)]) {
    if (!memeTexte(brut, `texte: ${texte}`)) dire(`n’a plus la proposition « ${texte} »`);
  }
  const lettresFichier = [...brut.matchAll(/^ {2}- id: (\w+)$/gm)].map((m) => m[1]).join('');
  const lettresVitrine = [VITRINE.lettre, ...Object.keys(VITRINE.autres)].sort().join('');
  if (lettresFichier !== lettresVitrine) dire(`a les propositions « ${lettresFichier} »`);
  // Une seule bonne réponse, et c'est bien la lettre montrée : le contraire
  // ferait cocher une mauvaise case en vitrine.
  const reponses = (brut.match(/^reponses:\n((?:\s+- \w+\n)+)/m) ?? [])[1] ?? '';
  const lettres = [...reponses.matchAll(/- (\w+)/g)].map((m) => m[1]);
  if (lettres.length !== 1 || lettres[0] !== VITRINE.lettre) {
    dire(`ne répond plus « ${VITRINE.lettre} » et elle seule, mais « ${lettres.join(', ')} »`);
  }
}

function versionBanque() {
  return readFileSync(join(RACINE, 'data', 'VERSION'), 'utf-8').trim();
}

/**
 * Aucun nombre dans l'image. L'ancienne disait « 658 questions » et l'a dit
 * longtemps après le retrait d'une question, faute de garde en CI : une image
 * de partage reste en cache chez les réseaux des semaines durant, elle ne
 * doit rien affirmer qui bouge avec la banque.
 */
function texte(x, y, taille, contenu, remplissage, graisse = 400, espacement = 0) {
  return `<text x="${x}" y="${y}" font-family="${SANS}" font-size="${taille}"
        font-weight="${graisse}" letter-spacing="${espacement}" fill="${remplissage}">${contenu}</text>`;
}

/** Le glyphe de la marque, repris de `favicon.svg` : le voyant d'une cardinale. */
function marque(x, y, cote) {
  return `<g transform="translate(${x} ${y}) scale(${cote / 32})">
    <rect width="32" height="32" rx="7.25" fill="${ACTION}"/>
    <path d="M16 6.55 L21.82 14.55 H10.18 Z" fill="${JAUNE}"/>
    <path d="M16 26.18 L21.82 18.18 H10.18 Z" fill="${JAUNE}"/>
  </g>`;
}

/**
 * Une proposition du quiz, telle que `quiz.css` la dessine : filet fin, lettre
 * dans une étiquette. La bonne est montrée corrigée, en vert, comme après
 * « Valider » : l'image donne la réponse au lieu de cocher une case muette.
 */
function proposition(x, y, l, h, lettre, contenu, juste) {
  const e = 32; // l'étiquette de la lettre
  const ex = x + 18;
  const ey = y + (h - e) / 2;
  return `<rect x="${x}" y="${y}" width="${l}" height="${h}" rx="${RAYON - 4}"
        fill="${juste ? VERT_PALE : FOND}" stroke="${juste ? VERT : FILET}" stroke-width="${juste ? 2 : 1.5}"/>
  <rect x="${ex}" y="${ey}" width="${e}" height="${e}" rx="${RAYON_ETIQUETTE}"
        fill="${juste ? VERT : FOND}" stroke="${juste ? VERT : FILET_FORT}" stroke-width="1.5"/>
  <text x="${ex + e / 2}" y="${ey + 22}" text-anchor="middle" font-family="${SANS}" font-size="17"
        font-weight="600" fill="${juste ? SUR_ACTION : TEXTE_DOUX}">${lettre.toUpperCase()}</text>
  ${texte(ex + e + 16, y + h / 2 + 8, 22, contenu, juste ? VERT_TEXTE : TEXTE, juste ? 600 : 400)}`;
}

function composer() {
  const MG = 72; // la marge de la colonne de gauche
  // La carte de la question, à droite comme sur l'accueil.
  const c = { x: 664, y: 150, l: 464, h: 400 };
  const cx = c.x + 28;
  const propositions = Object.entries({ ...VITRINE.autres, [VITRINE.lettre]: VITRINE.texte })
    .sort(([a], [b]) => a.localeCompare(b));

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${LARGEUR}" height="${HAUTEUR}" viewBox="0 0 ${LARGEUR} ${HAUTEUR}">
  <rect width="${LARGEUR}" height="${HAUTEUR}" fill="${FOND}"/>

  <!-- L'en-tête du site : le glyphe, le nom, le filet. -->
  ${marque(MG, 40, 40)}
  ${texte(MG + 54, 69, 26, 'Permis côtier', TEXTE, 700, -0.3)}
  <line x1="0" y1="112" x2="${LARGEUR}" y2="112" stroke="${FILET}" stroke-width="1.5"/>

  <!-- Le titre de l'accueil. -->
  ${texte(MG, 222, 60, 'Le permis côtier,', TEXTE, 700, -1.5)}
  ${texte(MG, 292, 60, 'trois minutes', TEXTE, 700, -1.5)}
  ${texte(MG, 362, 60, 'à la fois.', TEXTE, 700, -1.5)}

  <!-- La promesse, en texte doux. -->
  ${texte(MG, 430, 25, 'Des leçons courtes écrites depuis les textes,', TEXTE_DOUX)}
  ${texte(MG, 464, 25, 'des questions qui citent leur article,', TEXTE_DOUX)}
  ${texte(MG, 498, 25, 'l’examen blanc au format du jour J.', TEXTE_DOUX)}
  ${texte(MG, 550, 25, 'Gratuit, sans compte, sans publicité.', TEXTE, 600)}

  <!-- Une vraie question de la banque, corrigée. -->
  <rect x="${c.x}" y="${c.y}" width="${c.l}" height="${c.h}" rx="${RAYON}" fill="${FOND}"
        stroke="${FILET}" stroke-width="1.5"/>
  ${texte(cx, c.y + 56, 25, 'Jusqu’où l’option « côtière »', TEXTE, 700, -0.3)}
  ${texte(cx, c.y + 88, 25, 'permet-elle de naviguer ?', TEXTE, 700, -0.3)}
  ${propositions
    .map(([lettre, contenu], i) =>
      proposition(cx, c.y + 124 + i * 82, c.l - 56, 66, lettre, contenu, lettre === VITRINE.lettre),
    )
    .join('\n  ')}

  <!-- Le jaune franc, une seule fois, comme sur le bouton principal de l'app. -->
  <rect x="0" y="${HAUTEUR - 8}" width="${LARGEUR}" height="8" fill="${JAUNE}"/>
</svg>`;
}

verifierVitrine();
if (process.argv.includes('--vitrine')) {
  console.log(`partage : la vitrine ${VITRINE.id} tient.`);
  process.exit(0);
}
const svg = composer();
// Rendu au double, puis réduit : le texte y gagne, la rastérisation ne
// disposant d'aucun hinting. `density` 144 vaut deux fois les 72 ppp que
// librsvg prend par défaut pour un pixel d'SVG.
const png = await sharp(Buffer.from(svg), { density: 144 })
  .resize(LARGEUR, HAUTEUR)
  .png({ compressionLevel: 9 })
  .toBuffer();

if (process.argv.includes('--verifier')) {
  if (!existsSync(FICHIER) || !readFileSync(FICHIER).equals(png)) {
    console.error('partage : l’image livrée ne correspond plus au script. Lancer `npm run partage`.');
    process.exit(1);
  }
  console.log('partage : l’image livrée est à jour.');
} else {
  mkdirSync(SORTIE, { recursive: true });
  writeFileSync(FICHIER, png);
  console.log(
    `partage : ${FICHIER.replace(RACINE + '/', '')} — ${LARGEUR}×${HAUTEUR}, ` +
      `vitrine ${VITRINE.id} vérifiée, banque ${versionBanque()}.`,
  );
}
