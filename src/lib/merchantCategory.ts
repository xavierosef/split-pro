import { type CategoryItem, DEFAULT_CATEGORY } from '~/lib/category';

/**
 * Merchant name -> expense category, server side.
 *
 * Card terminals hand out names like `CB CARREFOUR CITY 4521 PARIS 05/09`, so the
 * name is normalized (accents, payment-processor prefixes, store numbers, city and
 * date tails) before being matched against a keyword list. Everything here is pure
 * and synchronous: no network call, no model, no per-user state.
 */

/** Payment processors and acquirers that prefix the real merchant name. */
const PROCESSOR_PREFIXES = [
  'CB',
  'CARTE',
  'PAIEMENT',
  'PAIEMENT CB',
  'ACHAT CB',
  'FACTURE CARTE',
  'VIR',
  'PRLV',
  'SUMUP',
  'SQ',
  'SQUARE',
  'TPE',
  'IZ',
  'ZETTLE',
  'PAYPAL',
  'PP',
  'STRIPE',
  'SP',
  'WLT',
  'APPLE PAY',
];

const NOISE_TOKENS = new Set(['SARL', 'SAS', 'SASU', 'EURL', 'SA', 'INC', 'LLC', 'LTD', 'GMBH']);

interface CategoryRule {
  category: CategoryItem;
  /** Matched against the normalized merchant name, as whole words unless `loose`. */
  keywords: string[];
  /** Match anywhere in the string, including inside a word. Use for distinctive brands. */
  loose?: boolean;
}

/**
 * The longest matching keyword wins, so `UBER EATS` beats `UBER` and a rule can be
 * added anywhere in the list without having to reason about ordering; ties are
 * broken by declaration order. Keywords are written the way `normalizeMerchant`
 * would leave them: uppercase, accent-free, single-spaced.
 */
const CATEGORY_RULES: CategoryRule[] = [
  // --- travel ---------------------------------------------------------------
  {
    category: 'fuel',
    keywords: [
      'TOTAL',
      'TOTALENERGIES',
      'ESSO',
      'SHELL',
      'BP',
      'AVIA',
      'ELAN',
      'STATION SERVICE',
      'CARBURANT',
      'GAS STATION',
      'PETROL',
      'FUEL',
      'ARAL',
      'REPSOL',
      'CEPSA',
      'OMV',
      'Q8',
    ],
  },
  {
    category: 'taxi',
    keywords: ['UBER', 'BOLT', 'FREENOW', 'FREE NOW', 'G7', 'TAXI', 'CABIFY', 'LYFT', 'HEETCH'],
  },
  {
    category: 'train',
    keywords: [
      'SNCF',
      'TRAINLINE',
      'OUIGO',
      'INOUI',
      'TGV',
      'THALYS',
      'EUROSTAR',
      'TRENITALIA',
      'RENFE',
      'DB BAHN',
      'BAHN',
      'RATP',
      'NAVIGO',
      'TRANSILIEN',
      'TER',
      'METRO',
      'TRAIN',
    ],
  },
  {
    category: 'bus',
    keywords: ['FLIXBUS', 'BLABLACAR', 'BLABLABUS', 'OUIBUS', 'EUROLINES', 'BUS', 'TRANSDEV'],
  },
  {
    category: 'plane',
    keywords: [
      'AIR FRANCE',
      'AIRFRANCE',
      'TRANSAVIA',
      'EASYJET',
      'RYANAIR',
      'VUELING',
      'LUFTHANSA',
      'KLM',
      'BRITISH AIRWAYS',
      'AIRLINES',
      'AIRWAYS',
      'AEROPORT',
      'AIRPORT',
      'AIR',
    ],
  },
  {
    category: 'hotel',
    keywords: [
      'HOTEL',
      'AIRBNB',
      'BOOKING COM',
      'BOOKING',
      'IBIS',
      'NOVOTEL',
      'MERCURE',
      'ACCOR',
      'MARRIOTT',
      'HILTON',
      'HOSTEL',
      'AUBERGE',
      'CAMPING',
    ],
  },
  {
    category: 'parking',
    keywords: [
      'PARKING',
      'INDIGO PARK',
      'VINCI PARK',
      'EFFIA',
      'SAEMES',
      'ZENPARK',
      'HORODATEUR',
      'PAYBYPHONE',
      'FLOWBIRD',
      'PARCMETRE',
      'PEAGE',
      'SANEF',
      'APRR',
      'VINCI AUTOROUTES',
      'TOLL',
    ],
  },
  {
    category: 'bicycle',
    keywords: ['VELIB', 'VELO', 'BICLOO', 'LIME', 'TIER', 'DOTT', 'DECATHLON VELO', 'CYCLE'],
  },
  {
    category: 'car',
    keywords: [
      'HERTZ',
      'AVIS',
      'EUROPCAR',
      'SIXT',
      'RENTACAR',
      'GETAROUND',
      'ZITY',
      'NORAUTO',
      'FEU VERT',
      'MIDAS',
      'SPEEDY',
      'CARGLASS',
      'GARAGE',
      'PEAGE AUTOROUTE',
    ],
  },

  // --- food -----------------------------------------------------------------
  {
    category: 'groceries',
    keywords: [
      'CARREFOUR',
      'MONOPRIX',
      'FRANPRIX',
      'CASINO',
      'LECLERC',
      'E LECLERC',
      'INTERMARCHE',
      'SUPER U',
      'HYPER U',
      'U EXPRESS',
      'AUCHAN',
      'LIDL',
      'ALDI',
      'PICARD',
      'GRAND FRAIS',
      'NATURALIA',
      'BIOCOOP',
      'DIA',
      'SPAR',
      'CORA',
      'MATCH',
      'G20',
      'PROXI',
      'VIVAL',
      'SUPERMARCHE',
      'SUPERMARKET',
      'EPICERIE',
      'PRIMEUR',
      'BOUCHERIE',
      'FROMAGERIE',
      'POISSONNERIE',
      'MARCHE',
      'ALBERT HEIJN',
      'JUMBO',
      'REWE',
      'EDEKA',
      'MERCADONA',
      'TESCO',
      'SAINSBURY',
      'WAITROSE',
      'ASDA',
      'GETIR',
      'FLINK',
      'GORILLAS',
      'GROCERY',
    ],
  },
  {
    category: 'diningOut',
    keywords: [
      'RESTAURANT',
      'RESTO',
      'BRASSERIE',
      'BISTRO',
      'BISTROT',
      'PIZZERIA',
      'PIZZA',
      'SUSHI',
      'BURGER',
      'MCDONALD',
      'MC DONALD',
      'MCDO',
      'KFC',
      'SUBWAY',
      'QUICK',
      'BURGER KING',
      'FIVE GUYS',
      'STARBUCKS',
      'COSTA COFFEE',
      'CAFE',
      'COFFEE',
      'BOULANGERIE',
      'PATISSERIE',
      'PAUL',
      'BRIOCHE DOREE',
      'PRET A MANGER',
      'DELIVEROO',
      'UBER EATS',
      'UBEREATS',
      'JUST EAT',
      'TAKEAWAY',
      'FOODORA',
      'TOO GOOD TO GO',
      'KEBAB',
      'TRAITEUR',
      'CANTINE',
      'SNACK',
      'CREPERIE',
      'GLACIER',
      'SALAD',
      'NOODLE',
      'RAMEN',
      'TACOS',
    ],
  },
  {
    category: 'liquor',
    keywords: [
      'NICOLAS',
      'CAVISTE',
      'CAVE A VIN',
      'V AND B',
      'BAR',
      'PUB',
      'BRASSERIE ARTISANALE',
      'BIERE',
      'BREWERY',
      'BREWDOG',
      'WINE',
      'VINS',
      'SPIRITS',
      'LIQUOR',
    ],
  },

  // --- utilities ------------------------------------------------------------
  {
    category: 'phone',
    keywords: [
      'ORANGE',
      'SFR',
      'BOUYGUES',
      'BOUYGUES TELECOM',
      'FREE MOBILE',
      'SOSH',
      'RED BY SFR',
      'PRIXTEL',
      'VODAFONE',
      'O2',
      'MOBILE',
      'TELECOM',
    ],
  },
  { category: 'internet', keywords: ['FREE', 'FREEBOX', 'LIVEBOX', 'INTERNET', 'FIBRE', 'FIBER'] },
  {
    category: 'electricity',
    keywords: [
      'EDF',
      'ENGIE',
      'ENERCOOP',
      'ELECTRICITE',
      'ELECTRICITY',
      'OCTOPUS ENERGY',
      'EKWATEUR',
      'PLANETE OUI',
    ],
  },
  { category: 'gas', keywords: ['GAZ', 'GRDF', 'GAS BILL'] },
  { category: 'water', keywords: ['VEOLIA', 'SUEZ', 'SAUR', 'EAU DE PARIS', 'EAUX', 'WATER'] },
  { category: 'trash', keywords: ['DECHETS', 'ORDURES', 'WASTE', 'RECYCLAGE'] },
  { category: 'cleaning', keywords: ['PRESSING', 'LAVERIE', 'LAUNDRY', 'NETTOYAGE', 'CLEANING'] },

  // --- home -----------------------------------------------------------------
  {
    category: 'electronics',
    keywords: [
      'FNAC',
      'DARTY',
      'BOULANGER',
      'LDLC',
      'MATERIEL NET',
      'APPLE STORE',
      'APPLE',
      'SAMSUNG',
      'MEDIA MARKT',
      'MEDIAMARKT',
      'CDISCOUNT',
      'RUE DU COMMERCE',
      'BACK MARKET',
      'BACKMARKET',
    ],
  },
  {
    category: 'furniture',
    keywords: ['IKEA', 'MAISONS DU MONDE', 'CONFORAMA', 'BUT', 'ALINEA', 'HABITAT', 'MOBILIER'],
  },
  {
    category: 'supplies',
    keywords: [
      'ACTION',
      'GIFI',
      'HEMA',
      'FLYING TIGER',
      'NORMAL',
      'BAZAR',
      'DROGUERIE',
      'QUINCAILLERIE',
    ],
  },
  {
    category: 'maintenance',
    keywords: [
      'LEROY MERLIN',
      'CASTORAMA',
      'BRICORAMA',
      'BRICO DEPOT',
      'MR BRICOLAGE',
      'WELDOM',
      'POINT P',
      'PLOMBIER',
      'ELECTRICIEN',
      'SERRURIER',
      'BRICOLAGE',
      'HARDWARE',
    ],
  },
  {
    category: 'pets',
    keywords: ['VETERINAIRE', 'VETO', 'MAXI ZOO', 'ANIMALIS', 'ZOOPLUS', 'CROQUETTES', 'PET'],
  },
  { category: 'rent', keywords: ['LOYER', 'RENT', 'AGENCE IMMOBILIERE', 'FONCIA', 'NEXITY'] },
  { category: 'mortgage', keywords: ['PRET IMMOBILIER', 'CREDIT IMMOBILIER', 'MORTGAGE'] },
  {
    category: 'services',
    keywords: ['LA POSTE', 'MONDIAL RELAY', 'CHRONOPOST', 'UPS', 'DHL', 'FEDEX', 'COLISSIMO'],
  },

  // --- life -----------------------------------------------------------------
  {
    category: 'medical',
    keywords: [
      'PHARMACIE',
      'PHARMACY',
      'APOTHEKE',
      'DOCTEUR',
      'DR',
      'MEDECIN',
      'CABINET MEDICAL',
      'DENTISTE',
      'DENTAL',
      'LABORATOIRE',
      'BIOGROUP',
      'CERBALLIANCE',
      'HOPITAL',
      'CLINIQUE',
      'KINE',
      'OPTIQUE',
      'OPTICIEN',
      'AUDIOPROTHESISTE',
      'DOCTOLIB',
      'MUTUELLE',
    ],
  },
  {
    category: 'clothing',
    keywords: [
      'ZARA',
      'H AND M',
      'HM',
      'UNIQLO',
      'KIABI',
      'PRIMARK',
      'CELIO',
      'JULES',
      'MANGO',
      'BERSHKA',
      'PULL AND BEAR',
      'GALERIES LAFAYETTE',
      'PRINTEMPS',
      'VINTED',
      'ZALANDO',
      'ASOS',
      'FOOT LOCKER',
      'COURIR',
      'NIKE',
      'ADIDAS',
      'CHAUSSURES',
      'PRET A PORTER',
    ],
  },
  {
    category: 'insurance',
    keywords: [
      'ASSURANCE',
      'AXA',
      'MAIF',
      'MACIF',
      'MAAF',
      'MATMUT',
      'GROUPAMA',
      'ALLIANZ',
      'GENERALI',
      'HARMONIE MUTUELLE',
      'INSURANCE',
    ],
  },
  { category: 'taxes', keywords: ['DGFIP', 'IMPOTS', 'TRESOR PUBLIC', 'URSSAF', 'TAX'] },
  {
    category: 'education',
    keywords: ['UNIVERSITE', 'ECOLE', 'CROUS', 'FORMATION', 'UDEMY', 'COURSERA', 'SCHOOL'],
  },
  {
    category: 'childcare',
    keywords: ['CRECHE', 'NOUNOU', 'GARDE ENFANT', 'BABYSIT', 'PERISCOLAIRE'],
  },
  {
    category: 'gifts',
    keywords: ['FLEURISTE', 'INTERFLORA', 'BERGAMOTTE', 'CADEAU', 'GIFT', 'FLOWERS'],
  },

  // --- entertainment --------------------------------------------------------
  {
    category: 'movies',
    keywords: [
      'CINEMA',
      'UGC',
      'PATHE',
      'GAUMONT',
      'MK2',
      'CGR',
      'NETFLIX',
      'DISNEY PLUS',
      'CANAL PLUS',
      'PRIME VIDEO',
      'ALLOCINE',
    ],
  },
  {
    category: 'music',
    keywords: ['SPOTIFY', 'DEEZER', 'APPLE MUSIC', 'QOBUZ', 'TIDAL', 'CONCERT', 'FNAC SPECTACLES'],
  },
  {
    category: 'games',
    keywords: [
      'STEAM',
      'PLAYSTATION',
      'XBOX',
      'NINTENDO',
      'EPIC GAMES',
      'MICROMANIA',
      'GAMING',
      'JEUX VIDEO',
    ],
  },
  {
    category: 'sports',
    keywords: [
      'DECATHLON',
      'INTERSPORT',
      'GO SPORT',
      'BASIC FIT',
      'FITNESS PARK',
      'NEONESS',
      'ON AIR',
      'PISCINE',
      'SALLE DE SPORT',
      'GYM',
      'CLUB SPORTIF',
      'STRAVA',
    ],
  },
  {
    category: 'entertainment',
    keywords: [
      'MUSEE',
      'MUSEUM',
      'THEATRE',
      'OPERA',
      'PARC ASTERIX',
      'DISNEYLAND',
      'ZOO',
      'BILLET',
    ],
  },
];

/** Every (rule, keyword) pair, longest keyword first. Built once at module load. */
const SORTED_RULE_KEYWORDS = CATEGORY_RULES.flatMap((rule) =>
  rule.keywords.map((keyword) => ({ rule, keyword })),
).toSorted((a, b) => b.keyword.length - a.keyword.length);

/** Uppercase, accent-free, punctuation collapsed to single spaces. */
export const normalizeMerchant = (merchant: string): string =>
  merchant
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim();

/**
 * Strips what the terminal added around the merchant name: the processor prefix,
 * the store/terminal number, and the trailing date the receipt carries.
 */
const stripTerminalNoise = (normalized: string): string => {
  let result = normalized;

  // `CB CARREFOUR ...`, `PAYPAL CARREFOUR ...` - drop one leading processor token group.
  const prefix = PROCESSOR_PREFIXES.filter((p) => result.startsWith(`${p} `)).sort(
    (a, b) => b.length - a.length,
  )[0];
  if (prefix) {
    result = result.slice(prefix.length + 1);
  }

  return (
    result
      // Trailing `05 09 25`, `2025 09 05` and other receipt date tails
      .replace(/\b\d{2} \d{2}( \d{2,4})?$/, '')
      .split(' ')
      // Store and terminal numbers, legal-form suffixes
      .filter((token) => '' !== token && !NOISE_TOKENS.has(token) && !/^\d{3,}$/.test(token))
      .join(' ')
      .trim()
  );
};

const matchesKeyword = (haystack: string, keyword: string, loose: boolean): boolean => {
  if (loose) {
    return haystack.includes(keyword);
  }

  const index = haystack.indexOf(keyword);
  if (-1 === index) {
    return false;
  }

  const before = haystack[index - 1];
  const after = haystack[index + keyword.length];

  return (undefined === before || ' ' === before) && (undefined === after || ' ' === after);
};

export interface CategorySuggestion {
  category: CategoryItem;
  /** The keyword that matched, for debugging and for the UI to explain the guess. */
  matchedKeyword: string | null;
  /** Merchant name after normalization, i.e. what the rules actually saw. */
  normalized: string;
}

/**
 * Suggests a category from a raw merchant name. Falls back to `DEFAULT_CATEGORY`
 * instead of guessing when nothing matches, so a wrong category is never silently
 * preferred over the neutral one.
 */
export const suggestCategoryFromMerchant = (merchant: string): CategorySuggestion => {
  const normalized = stripTerminalNoise(normalizeMerchant(merchant));

  if ('' === normalized) {
    return { category: DEFAULT_CATEGORY, matchedKeyword: null, normalized };
  }

  const match = SORTED_RULE_KEYWORDS.find(({ rule, keyword }) =>
    matchesKeyword(normalized, keyword, rule.loose ?? false),
  );

  return {
    category: match?.rule.category ?? DEFAULT_CATEGORY,
    matchedKeyword: match?.keyword ?? null,
    normalized,
  };
};

/** `05/09`, `2025-09-05`, `05.09.25` and friends. */
const DATE_LIKE = /^\d{1,4}[/.-]\d{1,4}([/.-]\d{2,4})?$/;

const isNoiseToken = (token: string): boolean => {
  const normalized = normalizeMerchant(token);

  return (
    '' === normalized ||
    NOISE_TOKENS.has(normalized) ||
    /^\d{3,}$/.test(normalized) ||
    DATE_LIKE.test(token)
  );
};

/**
 * Short all-caps tokens are usually acronyms the terminal did not shout (`SNCF`,
 * `EDF`, `KFC`), so they are left alone; anything longer, or with a vowel, reads
 * better title-cased.
 */
const titleCaseToken = (token: string): string => {
  if (4 >= token.length && !/[AEIOUY]/.test(token)) {
    return token;
  }

  return `${token[0]}${token.slice(1).toLowerCase()}`;
};

/**
 * Turns `CB CARREFOUR CITY 4521 PARIS 05/09` into `Carrefour City Paris`, so the
 * expense reads like something a human typed.
 *
 * A merchant name that already has mixed case (Apple Card hands out clean ones)
 * is kept as-is apart from the noise tokens: re-casing `McDonald's` would only
 * make it worse. Falls back to the raw name when the cleanup leaves nothing.
 */
export const cleanMerchantName = (merchant: string): string => {
  const trimmed = merchant
    .trim()
    // Space-separated receipt date tail: `... PARIS 05 09`, `... 05 09 25`
    .replace(/\s\d{2}\s\d{2}(\s\d{2,4})?$/, '')
    .trim();
  const tokens = trimmed.split(/\s+/).filter((token) => '' !== token);

  // `CB CARREFOUR ...`, `SUMUP BOULANGERIE ...` - drop one leading processor group.
  const normalized = normalizeMerchant(trimmed);
  const prefix = PROCESSOR_PREFIXES.filter((candidate) =>
    normalized.startsWith(`${candidate} `),
  ).toSorted((a, b) => b.length - a.length)[0];

  const withoutPrefix = prefix ? tokens.slice(prefix.split(' ').length) : tokens;

  const kept = withoutPrefix
    .map((token) => token.replace(/^[*#-]+/, ''))
    .filter((token) => !isNoiseToken(token));

  if (0 === kept.length) {
    return trimmed;
  }

  const isShouted = trimmed === trimmed.toUpperCase();

  return kept.map((token) => (isShouted ? titleCaseToken(token) : token)).join(' ');
};
