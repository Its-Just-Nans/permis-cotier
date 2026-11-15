import { defilerSec } from './defilement';

/**
 * Le retour arrière dans la coquille : glisser depuis le bord gauche, ou
 * retoucher l'onglet déjà ouvert (`EcranWeb.revenirAuDepart`). Le routeur
 * d'Astro y voit une navigation `traverse`, et quatre défauts en sortaient.
 *
 * - Le geste de WebKit montre déjà la page d'avant en la faisant glisser. Le
 *   fondu du routeur passait ensuite par-dessus : la page arrivée s'effaçait
 *   et remontait une seconde fois. On saute la transition.
 * - Le routeur remet la page à sa hauteur gardée avant que les scripts de la
 *   page ne la reconstruisent. Quand ils posent un bloc au-dessus (la reprise
 *   d'un chapitre, 145 px), WebKit compense, et on retombait plus bas que là
 *   où on était. On reprend la hauteur gardée une fois la page reconstruite.
 * - Les écrans à îlots (Accueil, Fiche, Paramètres) sont vides à l'échange :
 *   la page n'a que la hauteur de l'écran, et la hauteur gardée n'existait
 *   pas encore. On tient la hauteur le temps que les îlots la remplissent.
 * - Retoucher l'onglet ramenait la racine à sa hauteur gardée, puis la
 *   coquille la faisait glisser en haut. La coquille annonce le geste
 *   (`app:depart`) : la racine s'affiche en haut, d'un coup.
 *
 * Le doigt passe avant tout : un toucher, une molette, et on ne reprend plus
 * rien.
 */

/** Ce que le routeur passe à `astro:before-swap`, pour ce qui sert ici. */
interface AvantEchange extends Event {
  navigationType?: string;
  viewTransition?: { skipTransition?: () => void };
  swap?: () => void;
}

/** Au-delà, on lâche la hauteur même si un îlot n'est pas rendu. */
const ATTENTE_MAX = 1500;
/** Images de suite sans changement de hauteur avant de lâcher. */
const IMAGES_STABLES = 2;

export function tenirLeRetourArriere(
  doc: Document = document,
  fenetre: Window = window,
  signal?: AbortSignal,
): void {
  let auDepart = false;
  /** La hauteur à reprendre, `null` hors d'un retour arrière. */
  let cible: number | null = null;
  let tour = 0;

  const reprendre = () => {
    if (cible !== null && Math.round(fenetre.scrollY) !== cible) defilerSec(cible, doc);
  };
  const lacher = () => {
    cible = null;
  };

  fenetre.addEventListener('app:depart', () => { auDepart = true; }, { signal });
  for (const geste of ['touchstart', 'wheel', 'keydown']) {
    fenetre.addEventListener(geste, lacher, { passive: true, signal });
  }

  doc.addEventListener(
    'astro:before-swap',
    (evenement: AvantEchange) => {
      tour += 1;
      cible = null;
      doc.documentElement.style.minHeight = '';
      if (evenement.navigationType !== 'traverse') return;
      evenement.viewTransition?.skipTransition?.();
      const hauteur = auDepart ? 0 : Math.round(Number(fenetre.history.state?.scrollY ?? 0));
      if (hauteur <= 0 || !evenement.swap) return;
      cible = hauteur;
      const echanger = evenement.swap;
      evenement.swap = () => {
        echanger();
        tenirLaHauteur(hauteur, tour);
      };
    },
    { signal },
  );

  doc.addEventListener(
    'astro:after-swap',
    () => {
      if (auDepart) {
        auDepart = false;
        defilerSec(0, doc);
        return;
      }
      // Après tous les écouteurs de l'échange : ceux des écrans posent leurs
      // blocs ici, avant que l'écran ne soit peint.
      if (cible !== null) queueMicrotask(reprendre);
    },
    { signal },
  );

  doc.addEventListener('astro:page-load', reprendre, { signal });

  function tenirLaHauteur(hauteur: number, ceTour: number): void {
    const racine = doc.documentElement;
    racine.style.minHeight = `${hauteur + fenetre.innerHeight}px`;
    const debut = performance.now();
    let derniere = -1;
    let stables = 0;

    const guetter = () => {
      if (ceTour !== tour) return;
      const enAttente = doc.querySelector('astro-island[ssr]') !== null;
      const actuelle = doc.body.scrollHeight;
      stables = !enAttente && actuelle === derniere ? stables + 1 : 0;
      derniere = actuelle;
      reprendre();
      if (stables >= IMAGES_STABLES || performance.now() - debut > ATTENTE_MAX) {
        racine.style.minHeight = '';
        cible = null;
        return;
      }
      fenetre.requestAnimationFrame(guetter);
    };
    fenetre.requestAnimationFrame(guetter);
  }
}
