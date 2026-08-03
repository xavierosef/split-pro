export const MIN_CENTS = 2n;
export const MAX_CENTS = 200_000n;

/* L'ordre compte : « eur » avant « euros » laisserait un « os » dans le libelle. */
const CURRENCY = String.raw`(?:€|euros?|eur)`;

/*
 * « 12 euros 50 » : la forme que produit la dictee Siri, ou les centimes
 * arrivent apres le mot « euros » au lieu d'une virgule.
 */
const SPOKEN = String.raw`(\d+)\s*${CURRENCY}\s*(\d{1,2})(?!\d)`;

/* « 12,50 », « 12.5 », « 12 », « 12 € ». */
const PLAIN = String.raw`(\d+(?:[.,]\d{1,2})?)\s*${CURRENCY}?`;

const patterns = [
  { re: new RegExp(String.raw`^\s*${SPOKEN}`, 'i'), last: false },
  { re: new RegExp(String.raw`^\s*${PLAIN}`, 'i'), last: false },
  { re: new RegExp(String.raw`(?<![\d.,])${SPOKEN}`, 'gi'), last: true },
  { re: new RegExp(String.raw`(?<![\d.,])${PLAIN}(?![\d.,])`, 'gi'), last: true },
];

const toCents = (whole: string, frac = ''): bigint =>
  BigInt(whole) * 100n + BigInt(frac.padEnd(2, '0'));

const capitalize = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1);

/**
 * Le montant est cherche en tete en priorite : "12,50 pour 2 personnes" doit
 * donner 12,50 et non 2. A defaut on prend le dernier nombre isole, ce qui
 * couvre la dictee ("courses 12 euros 50") et les libelles qui comptent
 * ("2 packs 12,50"). La forme parlee passe avant la forme ecrite, sinon
 * "12 euros 50 courses" donnerait 12 € pour "50 courses".
 */
export const parseQuickExpense = (input: string): { cents: bigint; name: string } | null => {
  const attempt = ({ re, last }: (typeof patterns)[number]) => {
    const match = last ? [...input.matchAll(re)].at(-1) : re.exec(input);
    if (!match?.[1]) {
      return null;
    }

    /* Forme ecrite : les centimes sont dans le groupe 1. Parlee : dans le 2. */
    const [whole = '0', frac] = /[.,]/.test(match[1])
      ? match[1].replace(',', '.').split('.')
      : [match[1], match[2]];

    const name = input.replace(match[0], ' ').replace(/\s+/g, ' ').trim();
    return name ? { cents: toCents(whole, frac), name: capitalize(name) } : null;
  };

  for (const pattern of patterns) {
    const parsed = attempt(pattern);
    if (parsed) {
      return parsed;
    }
  }

  return null;
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
