import { timingSafeEqual } from 'node:crypto';
import { SplitType } from '@prisma/client';
import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';

import { env } from '~/env';
import { DEFAULT_CATEGORY } from '~/lib/category';
import { suggestCategory } from '~/lib/categoryMemory';
import {
  MAX_CENTS,
  MIN_CENTS,
  equalSplitNets,
  formatCents,
  parseQuickExpense,
  summarizeQuickExpense,
} from '~/lib/quickExpense';
import { createExpense } from '~/server/api/services/splitService';
import { db } from '~/server/db';

/*
 * Le raccourci iOS n'a qu'un seul usage : une depense en EUR, 50/50, dans le
 * groupe "Bee & Be", payee par Xavier. Rien de tout ca n'est parametrable
 * depuis l'exterieur : l'appelant ne choisit que le montant et le libelle.
 */
const GROUP_ID = 1;
const PAYER_ID = 1;
const PARTNER_ID = 2;

const bodySchema = z.object({ text: z.string().min(1).max(200) });

const tokenMatches = (given: string, expected: string): boolean => {
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if ('POST' !== req.method) {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Ferme par defaut : sans token configure la route n'existe pas.
  const expected = env.QUICK_EXPENSE_TOKEN;
  if (!expected) {
    return res.status(503).json({ error: 'Quick expense is not configured' });
  }

  const given = req.headers.authorization?.replace(/^Bearer /, '') ?? '';
  if (!tokenMatches(given, expected)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const body = bodySchema.safeParse(req.body);
  if (!body.success) {
    return res.status(400).json({ error: 'Corps attendu : {"text": "12,50 courses"}' });
  }

  const parsed = parseQuickExpense(body.data.text);
  if (!parsed) {
    return res.status(400).json({ error: 'Il faut un montant et un libelle, ex. "12,50 courses"' });
  }

  const { cents, name } = parsed;
  if (MIN_CENTS > cents || MAX_CENTS < cents) {
    return res.status(400).json({
      error: `Montant hors bornes (${formatCents(MIN_CENTS)} à ${formatCents(MAX_CENTS)})`,
    });
  }

  try {
    const [history, partner] = await Promise.all([
      /*
       * Le meme index que celui interroge par l'UI a chaque frappe, pour que la
       * categorie devinee ici soit celle que le picker aurait proposee.
       */
      db.expense.groupBy({
        by: ['name', 'category'],
        where: { deletedAt: null, expenseParticipants: { some: { userId: PAYER_ID } } },
        _count: { _all: true },
        orderBy: { _count: { name: 'desc' } },
        take: 500,
      }),
      db.user.findUnique({ where: { id: PARTNER_ID }, select: { name: true } }),
    ]);

    const category =
      suggestCategory(
        name,
        history.map((row) => ({
          name: row.name,
          category: row.category,
          count: row._count._all,
        })),
      ) ?? DEFAULT_CATEGORY;

    const nets = equalSplitNets(cents);
    const expense = await createExpense(
      {
        groupId: GROUP_ID,
        paidBy: PAYER_ID,
        name,
        category,
        amount: cents,
        splitType: SplitType.EQUAL,
        currency: 'EUR',
        expenseDate: new Date(),
        participants: [
          { userId: PAYER_ID, amount: nets.payer },
          { userId: PARTNER_ID, amount: nets.other },
        ],
      },
      PAYER_ID,
    );

    const partnerFirstName = partner?.name?.split(' ')[0] ?? 'Sarah';
    const summary = summarizeQuickExpense(cents, name, partnerFirstName);
    console.log(`[quick-expense] ${expense.id} ${category} ${summary}`);

    return res.status(200).json({
      ok: true,
      id: expense.id,
      url: `${env.NEXTAUTH_URL.replace(/\/$/, '')}/expenses/${expense.id}`,
      summary,
    });
  } catch (error) {
    console.error('[quick-expense] failed', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
