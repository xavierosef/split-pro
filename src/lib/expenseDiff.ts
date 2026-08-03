export interface ExpenseFieldChange {
  label?: string;
  from: string;
  to: string;
}

const MAX_SHOWN = 3;

/**
 * Une notification push est tronquee par le systeme : on ne montre que les
 * premiers changements, et un libelle uniquement quand « avant → apres » seul
 * serait ambigu (un montant ou un intitule se reconnaissent, une date non).
 */
export const describeExpenseChanges = (changes: ExpenseFieldChange[]): string => {
  const shown = changes
    .slice(0, MAX_SHOWN)
    .map((change) => `${change.label ? `${change.label} ` : ''}${change.from} → ${change.to}`);

  if (MAX_SHOWN < changes.length) {
    shown.push('…');
  }

  return shown.join(' · ');
};
