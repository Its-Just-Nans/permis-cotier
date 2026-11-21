// Dérivés des captures de la vitrine, pour le `srcset` de l'accueil et de /app.
//
// Les originaux `public/vitrine/<nom>.webp` font 640 px de large et
// s'affichent entre 108 et 284 px : envoyer 640 px à tout le monde gaspillait
// 86 Ko sur l'accueil (audit du 21 novembre 2026). Ce script tire de chaque
// original deux dérivés, `<nom>-320.webp` et `<nom>-480.webp`, même hauteur
// relative. L'original reste servi tel quel : son adresse ne change pas.
//
//   node scripts/vitrine-derives.mjs
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

const DOSSIER = new URL('../public/vitrine/', import.meta.url).pathname;
const LARGEURS = [320, 480];

const originaux = readdirSync(DOSSIER).filter((f) => /^[a-z]+\.webp$/.test(f));
for (const f of originaux) {
  const nom = f.replace('.webp', '');
  for (const largeur of LARGEURS) {
    const sortie = join(DOSSIER, `${nom}-${largeur}.webp`);
    const info = await sharp(join(DOSSIER, f))
      .resize({ width: largeur })
      .webp({ quality: 80, effort: 6 })
      .toFile(sortie);
    console.log(`${nom}-${largeur}.webp  ${info.width}x${info.height}  ${info.size} o`);
  }
}
