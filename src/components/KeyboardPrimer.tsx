import React, { useEffect, useRef } from 'react';

import { getAutoFocusTarget } from '~/lib/autoFocusPreference';

let primer: HTMLInputElement | null = null;

/**
 * WebKit n'ouvre le clavier logiciel que si focus() part d'une activation
 * utilisateur : un focus() depuis un useEffect, apres un changement de route,
 * donne le contour et le caret mais laisse le clavier ferme.
 *
 * A appeler donc dans le tap qui declenche la navigation vers /add. Le clavier
 * s'ouvre immediatement sur ce champ hors-ecran, qui vit dans le shell de _app
 * et garde donc le focus pendant la navigation client-side. La page d'arrivee
 * n'a plus qu'a deplacer le focus vers son champ : passer d'un input a un autre
 * ne referme pas un clavier deja ouvert.
 */
export const primeAddExpenseKeyboard = () => {
  const target = getAutoFocusTarget();
  if ('none' === target || !primer) {
    return;
  }

  /*
   * Amorcer avec le meme type de clavier que le champ vise, sinon iOS change de
   * disposition en cours de route.
   */
  primer.inputMode = 'amount' === target ? 'decimal' : 'text';
  primer.focus();
};

export const KeyboardPrimer: React.FC = () => {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    primer = ref.current;
    return () => {
      primer = null;
    };
  }, []);

  return (
    <input
      ref={ref}
      aria-hidden
      tabIndex={-1}
      /*
       * Ni readOnly ni disabled, iOS n'ouvrirait pas le clavier. Et pas de
       * display:none non plus : un champ non rendu n'est pas focusable.
       */
      className="pointer-events-none fixed top-0 left-0 size-px opacity-0"
    />
  );
};
