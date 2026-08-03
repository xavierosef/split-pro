import { z } from 'zod';

// Les categories personnalisees vivent en JSON dans AppMetadata, une table
// cle/valeur deja presente dans le schema d'upstream. Aucune migration Prisma,
// et le contenu est partage entre les comptes puisqu'il est cote serveur.
// La cle est prefixee : upstream utilise cette meme table pour sa version de
// schema, un prefixe evite toute collision future.
export const CATEGORIES_METADATA_KEY = 'xav:categories';

export const CUSTOM_PREFIX = 'custom:';

export const customCategorySchema = z.object({
  id: z.string().startsWith(CUSTOM_PREFIX).max(64),
  name: z.string().trim().min(1).max(40),
  icon: z.string().min(1).max(40),
  color: z.string().min(1).max(40),
});

export type CustomCategory = z.infer<typeof customCategorySchema>;

export const customCategoriesSchema = z.array(customCategorySchema).max(60);

export const isCustomCategory = (category?: string | null): boolean =>
  Boolean(category?.startsWith(CUSTOM_PREFIX));

// Une valeur invalide en base ne doit jamais casser l'affichage d'une liste de
// depenses : on retombe silencieusement sur les categories par defaut.
export const parseCustomCategories = (raw?: string | null): CustomCategory[] => {
  if (!raw) {
    return [];
  }
  try {
    const parsed = customCategoriesSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
};
