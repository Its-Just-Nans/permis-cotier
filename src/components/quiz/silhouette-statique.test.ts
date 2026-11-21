import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { Silhouette } from './Morceaux';
import { silhouetteHtml } from './silhouette-statique';

describe('silhouetteHtml', () => {
  it('rend exactement le balisage de la Silhouette React, pour que le remplacement ne bouge pas', () => {
    expect(silhouetteHtml({ examen: false })).toBe(
      renderToStaticMarkup(createElement(Silhouette, { propositions: 4, examen: false })),
    );
    expect(silhouetteHtml({ examen: true })).toBe(
      renderToStaticMarkup(createElement(Silhouette, { propositions: 4, examen: true })),
    );
  });

  it('porte quatre propositions et la marque de l’examen', () => {
    const html = silhouetteHtml({ examen: true });
    expect(html.match(/<li>/g)).toHaveLength(4);
    expect(html).toContain('jeu--examen');
    expect(silhouetteHtml({ examen: false })).not.toContain('jeu--examen');
  });
});
