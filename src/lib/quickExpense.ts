export const MIN_CENTS = 2n;
export const MAX_CENTS = 200_000n;

const AMOUNT_SOURCE = String.raw`(\d+(?:[.,]\d{1,2})?)\s*(?:€|eur|euros?)?`;
const LEADING_AMOUNT = new RegExp(String.raw`^\s*${AMOUNT_SOURCE}`, 'i');
const ANY_AMOUNT = new RegExp(String.raw`(?<![\d.,])${AMOUNT_SOURCE}(?![\d.,])`, 'gi');

const toCents = (raw: string): bigint => {
  const [whole = '0', frac = ''] = raw.replace(',', '.').split('.');
  return BigInt(whole) * 100n + BigInt(frac.padEnd(2, '0'));
};

const capitalize = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1);

/**
 * Le montant est cherche en tete en priorite : "12,50 pour 2 personnes" doit
 * donner 12,50 et non 2. Sinon on prend le dernier nombre isole, ce qui couvre
 * la dictee ("courses 12,50") et les libelles qui comptent ("2 packs 12,50").
 */
export const parseQuickExpense = (input: string): { cents: bigint; name: string } | null => {
  const leading = LEADING_AMOUNT.exec(input);
  const match = leading ?? [...input.matchAll(ANY_AMOUNT)].at(-1);
  if (!match?.[1]) {
    return null;
  }

  const name = input.replace(match[0], ' ').replace(/\s+/g, ' ').trim();
  if (!name) {
    return null;
  }

  return { cents: toCents(match[1]), name: capitalize(name) };
};

/**
 * Nets d'une dependance 50/50 : positif pour le payeur, negatif pour l'autre.
 * ponytail: le centime impair va toujours au payeur, la ou l'app le tire au
 * sort entre les participants. Deterministe, et la somme des nets reste nulle.
 */
export const equalSplitNets = (cents: bigint): { payer: bigint; other: bigint } => {
  const half = cents / 2n;
  return { payer: half, other: -half };
};

const eur = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });

export const formatCents = (cents: bigint): string => eur.format(Number(cents) / 100);

export const summarizeQuickExpense = (
  cents: bigint,
  name: string,
  partnerName: string,
): string => {
  const { other } = equalSplitNets(cents);
  return `${formatCents(cents)} · ${name} · ${partnerName} te doit ${formatCents(-other)}`;
};
