import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Silhouette } from './Morceaux';

/**
 * La silhouette de l'écran de jeu, rendue en HTML au build.
 *
 * L'îlot est en `client:only` : sans ceci, le `<astro-island>` reste vide
 * jusqu'à l'arrivée du JavaScript, et le pied de page remonte puis redescend
 * quand l'îlot se monte (CLS observé : 0,40). Le HTML vient du même composant
 * que celui que React rend à l'attente de la banque, avec quatre propositions :
 * au montage, React remplace le contenu de l'îlot par un balisage identique,
 * puis par la vraie question.
 */
export function silhouetteHtml({ examen }: { examen: boolean }): string {
  return renderToStaticMarkup(createElement(Silhouette, { propositions: 4, examen }));
}
