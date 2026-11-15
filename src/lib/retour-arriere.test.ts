// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { tenirLeRetourArriere } from './retour-arriere';

/**
 * Un retour arrière dans la coquille (glisser depuis le bord, retoucher
 * l'onglet) : le routeur d'Astro échange la page puis la remet à la hauteur
 * gardée. On simule ici ce qu'il fait, dans son ordre : `astro:before-swap`
 * avec sa fonction `swap`, l'échange, le défilement, `astro:after-swap`.
 */

let image: FrameRequestCallback[] = [];
function imageSuivante() {
  const enCours = image;
  image = [];
  enCours.forEach((f) => f(0));
}

function naviguer(type: 'push' | 'traverse', etat: { scrollY?: number } | null = null) {
  history.replaceState(etat, '');
  const skipTransition = vi.fn();
  const swap = vi.fn();
  const evenement = Object.assign(new Event('astro:before-swap'), {
    navigationType: type,
    viewTransition: { skipTransition },
    swap,
  });
  document.dispatchEvent(evenement);
  evenement.swap();
  document.dispatchEvent(new Event('astro:after-swap'));
  return { skipTransition, swap };
}

beforeEach(() => {
  image = [];
  vi.stubGlobal('requestAnimationFrame', (f: FrameRequestCallback) => image.push(f));
  window.scrollTo = vi.fn() as typeof window.scrollTo;
  Object.defineProperty(window, 'scrollY', { configurable: true, value: 0 });
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 });
  document.documentElement.style.minHeight = '';
  document.body.innerHTML = '';
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('le retour arrière dans l’app', () => {
  // Un seul jeu d'écouteurs pour tout le fichier, comme dans la coquille.
  const controleur = new AbortController();
  tenirLeRetourArriere(document, window, controleur.signal);

  it('ne joue pas le fondu : le geste de retour a déjà montré la page', () => {
    const { skipTransition, swap } = naviguer('traverse', { scrollY: 0 });
    expect(skipTransition).toHaveBeenCalledTimes(1);
    expect(swap).toHaveBeenCalledTimes(1);
  });

  it('garde le fondu pour un lien suivi', () => {
    const { skipTransition } = naviguer('push');
    expect(skipTransition).not.toHaveBeenCalled();
    expect(document.documentElement.style.minHeight).toBe('');
  });

  it('tient la hauteur de la page le temps que ses îlots la remplissent', () => {
    document.body.innerHTML = '<astro-island ssr></astro-island>';
    naviguer('traverse', { scrollY: 1200 });
    // Sans cela, la page vide n'a que la hauteur de l'écran et le routeur
    // retombe en haut au lieu de reprendre à 1200.
    expect(document.documentElement.style.minHeight).toBe('2000px');

    imageSuivante();
    expect(document.documentElement.style.minHeight).toBe('2000px');

    document.querySelector('astro-island')!.removeAttribute('ssr');
    imageSuivante();
    imageSuivante();
    imageSuivante();
    expect(document.documentElement.style.minHeight).toBe('');
  });

  it('reprend la hauteur gardée une fois la page reconstruite par ses scripts', async () => {
    document.body.innerHTML = '<astro-island ssr></astro-island>';
    naviguer('traverse', { scrollY: 600 });
    // Les scripts de la page ont posé un bloc au-dessus : WebKit a compensé.
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 746 });
    await Promise.resolve();
    expect(window.scrollTo).toHaveBeenLastCalledWith(0, 600);

    Object.defineProperty(window, 'scrollY', { configurable: true, value: 700 });
    document.dispatchEvent(new Event('astro:page-load'));
    expect(window.scrollTo).toHaveBeenLastCalledWith(0, 600);

    // Un îlot rendu pousse encore : la hauteur est reprise à chaque image.
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 650 });
    document.querySelector('astro-island')!.removeAttribute('ssr');
    imageSuivante();
    expect(window.scrollTo).toHaveBeenLastCalledWith(0, 600);
    imageSuivante();
    imageSuivante();
    expect(document.documentElement.style.minHeight).toBe('');
  });

  it('laisse le doigt : un toucher arrête la reprise', () => {
    document.body.innerHTML = '<astro-island ssr></astro-island>';
    naviguer('traverse', { scrollY: 600 });
    vi.mocked(window.scrollTo).mockClear();
    window.dispatchEvent(new Event('touchstart'));
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 300 });
    document.dispatchEvent(new Event('astro:page-load'));
    imageSuivante();
    expect(window.scrollTo).not.toHaveBeenCalled();
  });

  it('ne tient rien quand la page était en haut', () => {
    naviguer('traverse', { scrollY: 0 });
    expect(document.documentElement.style.minHeight).toBe('');
  });

  it('lâche la hauteur au bout d’une seconde et demie, même si un îlot traîne', () => {
    let maintenant = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => maintenant);
    document.body.innerHTML = '<astro-island ssr></astro-island>';
    naviguer('traverse', { scrollY: 900 });
    maintenant = 1600;
    imageSuivante();
    expect(document.documentElement.style.minHeight).toBe('');
  });

  it('retoucher l’onglet ramène sa racine en haut, sec, sans hauteur tenue', () => {
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 1200 });
    window.dispatchEvent(new Event('app:depart'));
    naviguer('traverse', { scrollY: 1200 });
    expect(document.documentElement.style.minHeight).toBe('');
    expect(window.scrollTo).toHaveBeenCalledWith(0, 0);

    // Une fois seulement : le retour suivant reprend sa hauteur.
    vi.mocked(window.scrollTo).mockClear();
    naviguer('traverse', { scrollY: 300 });
    expect(window.scrollTo).not.toHaveBeenCalled();
    expect(document.documentElement.style.minHeight).toBe('1100px');
  });
});
