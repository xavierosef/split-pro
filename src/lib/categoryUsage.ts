import { type LucideIcon } from 'lucide-react';

import { CategoryIcons } from '~/components/ui/categoryIcons';
import { SECTION_COLORS } from './categoryColors';
import { CUSTOM_ICONS } from './customCategoryIcons';

// Les indicateurs de la fenetre de creation doivent tenir compte des
// categories d'origine autant que des personnalisees : une couleur deja portee
// par "Alimentation" est prise, meme si aucune categorie custom ne l'utilise.

export const BUILTIN_COLORS = new Set(Object.values(SECTION_COLORS));

// Comparaison par reference de composant : les deux tables importent les memes
// icones depuis lucide-react, donc pas besoin de faire correspondre des noms.
const BUILTIN_ICON_COMPONENTS = new Set<LucideIcon>(
  Object.values(CategoryIcons) as LucideIcon[],
);

export const BUILTIN_ICON_NAMES = new Set(
  Object.entries(CUSTOM_ICONS)
    .filter(([, component]) => BUILTIN_ICON_COMPONENTS.has(component))
    .map(([name]) => name),
);
