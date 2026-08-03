import { z } from 'zod';

import { createTRPCRouter, protectedProcedure } from '~/server/api/trpc';
import { db } from '~/server/db';
import {
  CATEGORIES_METADATA_KEY,
  CUSTOM_PREFIX,
  customCategorySchema,
  parseCustomCategories,
} from '~/lib/customCategories';

const readAll = async () => {
  const row = await db.appMetadata.findUnique({ where: { key: CATEGORIES_METADATA_KEY } });
  return parseCustomCategories(row?.value);
};

const writeAll = async (categories: unknown) => {
  const value = JSON.stringify(categories);
  await db.appMetadata.upsert({
    where: { key: CATEGORIES_METADATA_KEY },
    create: { key: CATEGORIES_METADATA_KEY, value },
    update: { value },
  });
};

export const categoriesRouter = createTRPCRouter({
  list: protectedProcedure.query(readAll),

  // Compte les depenses qui utilisent la categorie, pour que la suppression
  // annonce ce qu'elle va delaisser plutot que de le decouvrir apres coup.
  usage: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(({ input }) => db.expense.count({ where: { category: input.id, deletedAt: null } })),

  upsert: protectedProcedure
    .input(customCategorySchema.partial({ id: true }))
    .mutation(async ({ input }) => {
      const categories = await readAll();
      const id = input.id ?? `${CUSTOM_PREFIX}${crypto.randomUUID().slice(0, 8)}`;
      const next = categories.filter((c) => c.id !== id);
      next.push({ ...input, id });
      await writeAll(next);
      return next;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const next = (await readAll()).filter((c) => c.id !== input.id);
      await writeAll(next);
      return next;
    }),
});
