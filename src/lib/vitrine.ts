/**
 * Les captures de l'app montrées sur le site (`public/vitrine/`).
 *
 * L'original fait 640 px de large ; il s'affiche entre 108 et 284 px. Deux
 * dérivés, 320 et 480 px, sont tirés de lui par `scripts/vitrine-derives.mjs`,
 * et le navigateur choisit selon `sizes` et la densité de l'écran. `src` reste
 * l'original : même adresse qu'avant, pour qui ne lit pas `srcset`.
 */
const LARGEUR = 640;
const HAUTEUR = 1391;
const DERIVES = [320, 480] as const;

export function captureVitrine(nom: string, sizes: string) {
  const srcset = [...DERIVES.map((l) => `/vitrine/${nom}-${l}.webp ${l}w`), `/vitrine/${nom}.webp ${LARGEUR}w`].join(', ');
  return { src: `/vitrine/${nom}.webp`, srcset, sizes, width: LARGEUR, height: HAUTEUR };
}
