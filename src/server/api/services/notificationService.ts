import { SplitType } from '@prisma/client';
import { isCurrencyCode } from '~/lib/currency';
import { type ExpenseFieldChange, describeExpenseChanges } from '~/lib/expenseDiff';
import { type PushMessage } from '~/types';

import { db } from '~/server/db';
import { pushNotification } from '~/server/notification';
import { getCurrencyHelpers } from '~/utils/numbers';

/** L'etat d'une depense avant edition, capture par editExpense. */
export interface ExpenseSnapshot {
  name: string;
  amount: bigint;
  currency: string;
  paidBy: number;
  expenseDate: Date;
}

const shortDate = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit' });

/*
 * La categorie est volontairement absente du diff : son libelle lisible vit
 * dans les fichiers de traduction cote client pour les categories internes, et
 * dans AppMetadata pour les personnalisees. Annoncer « diningOut → custom:a1b2 »
 * serait pire que se taire.
 */
const collectExpenseChanges = async (
  before: ExpenseSnapshot,
  after: ExpenseSnapshot,
  formatAmount: (currency: string, amount: bigint) => string,
): Promise<ExpenseFieldChange[]> => {
  const changes: ExpenseFieldChange[] = [];

  if (before.name !== after.name) {
    changes.push({ from: before.name, to: after.name });
  }

  if (before.amount !== after.amount || before.currency !== after.currency) {
    changes.push({
      from: formatAmount(before.currency, before.amount),
      to: formatAmount(after.currency, after.amount),
    });
  }

  if (before.paidBy !== after.paidBy) {
    const payers = await db.user.findMany({
      where: { id: { in: [before.paidBy, after.paidBy] } },
      select: { id: true, name: true, email: true },
    });
    const payerName = (id: number) => {
      const payer = payers.find((user) => user.id === id);
      return payer?.name ?? payer?.email ?? String(id);
    };
    changes.push({
      label: 'payé par',
      from: payerName(before.paidBy),
      to: payerName(after.paidBy),
    });
  }

  if (before.expenseDate.getTime() !== after.expenseDate.getTime()) {
    changes.push({
      label: 'date',
      from: shortDate.format(before.expenseDate),
      to: shortDate.format(after.expenseDate),
    });
  }

  return changes;
};

export const getSubscriptionEndpoint = (subscription: string) => {
  try {
    const parsed = JSON.parse(subscription) as { endpoint?: string };
    if ('string' === typeof parsed.endpoint && '' !== parsed.endpoint) {
      return parsed.endpoint;
    }
  } catch {
    return null;
  }

  return null;
};

const removeStalePushSubscriptions = async (
  subscriptions: { userId: number; endpoint: string }[],
) => {
  if (0 === subscriptions.length) {
    return;
  }

  await db.pushNotification.deleteMany({
    where: {
      OR: subscriptions.map((subscription) => ({
        userId: subscription.userId,
        endpoint: subscription.endpoint,
      })),
    },
  });
};

const isPermanentPushFailure = (statusCode: number | undefined) =>
  404 === statusCode || 410 === statusCode;

export const sendPushNotificationToUsers = async (userIds: number[], pushData: PushMessage) => {
  if (0 === userIds.length) {
    return { sentCount: 0 };
  }

  const subscriptions = await db.pushNotification.findMany({
    where: {
      userId: {
        in: userIds,
      },
    },
  });

  const pushResults = await Promise.all(
    subscriptions.map(async (s) => {
      const result = await pushNotification(s.subscription, pushData);
      return { ...result, userId: s.userId, endpoint: s.endpoint };
    }),
  );

  await removeStalePushSubscriptions(
    pushResults
      .filter((result) => !result.ok && isPermanentPushFailure(result.statusCode))
      .map((result) => ({ userId: result.userId, endpoint: result.endpoint })),
  );

  return { sentCount: pushResults.filter((result) => result.ok).length };
};

export async function sendExpensePushNotification(
  expenseId: string,
  before?: ExpenseSnapshot,
) {
  const expense = await db.expense.findUnique({
    where: {
      id: expenseId,
    },
    select: {
      paidBy: true,
      amount: true,
      currency: true,
      addedBy: true,
      name: true,
      deletedBy: true,
      splitType: true,
      expenseDate: true,
      deletedByUser: {
        select: {
          name: true,
          email: true,
        },
      },
      expenseParticipants: {
        select: {
          userId: true,
          amount: true,
        },
      },
      paidByUser: {
        select: {
          name: true,
          email: true,
        },
      },
      addedByUser: {
        select: {
          name: true,
          email: true,
        },
      },
      updatedByUser: {
        select: {
          name: true,
          email: true,
        },
      },
      conversionTo: {
        select: {
          currency: true,
          amount: true,
        },
      },
    },
  });

  if (!expense) {
    return;
  }

  const participants = expense.deletedBy
    ? expense.expenseParticipants.filter(
        ({ userId, amount }) => userId !== expense.deletedBy && 0n !== amount,
      )
    : expense.expenseParticipants.filter(
        ({ userId, amount }) => userId !== expense.addedBy && 0n !== amount,
      );

  /*
   * Les messages sont en francais en dur : l'instance ne sert que deux comptes
   * francophones, et localiser proprement demanderait de connaitre la langue du
   * destinataire cote serveur, la ou next-i18next ne vit que cote client.
   */
  const getUserDisplayName = (user: { name: string | null; email: string | null } | null) =>
    user?.name ?? user?.email ?? '';

  const formatAmount = (currency: string, amount: bigint) => {
    const { toUIString } = getCurrencyHelpers({
      currency: isCurrencyCode(currency) ? currency : 'USD',
    });
    return toUIString(amount);
  };

  const changes = before ? await collectExpenseChanges(before, expense, formatAmount) : [];

  const getNotificationContent = (): { title: string; message: string } => {
    const payer = getUserDisplayName(expense.paidByUser);
    const adder = getUserDisplayName(expense.addedByUser);
    const amount = formatAmount(expense.currency, expense.amount);

    // Deleted expense
    if (expense.deletedBy) {
      return {
        title: getUserDisplayName(expense.deletedByUser),
        message: `a supprimé ${expense.name}`,
      };
    }

    // Updated expense
    if (expense.updatedByUser) {
      return {
        title: getUserDisplayName(expense.updatedByUser),
        message: changes.length
          ? `a modifié ${expense.name} : ${describeExpenseChanges(changes)}`
          : `a modifié ${expense.name} · ${amount}`,
      };
    }

    // Currency conversion
    if (expense.splitType === SplitType.CURRENCY_CONVERSION && expense.conversionTo) {
      const toAmount = formatAmount(expense.conversionTo.currency, expense.conversionTo.amount);
      return {
        title: adder,
        message: `${payer} a converti ${amount} → ${toAmount}`,
      };
    }

    // Settlement
    if (expense.splitType === SplitType.SETTLEMENT) {
      return {
        title: adder,
        message: `${payer} a remboursé ${amount}`,
      };
    }

    // Regular expense
    return {
      title: adder,
      // Le titre porte deja le nom : ne le repeter que si le payeur differe.
      message:
        payer === adder
          ? `a payé ${amount} pour ${expense.name}`
          : `${payer} a payé ${amount} pour ${expense.name}`,
    };
  };

  const pushData = {
    ...getNotificationContent(),
    data: {
      url: `/expenses/${expenseId}`,
    },
  };

  await sendPushNotificationToUsers(
    participants.map((p) => p.userId),
    pushData,
  );
}

export async function sendGroupSimplifyDebtsToggleNotification(
  groupId: number,
  togglerUserId: number,
  newState: boolean,
) {
  try {
    const group = await db.group.findUnique({
      where: {
        id: groupId,
      },
      select: {
        name: true,
        groupUsers: {
          select: {
            userId: true,
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!group) {
      return;
    }

    const togglerUser = await db.user.findUnique({
      where: {
        id: togglerUserId,
      },
      select: {
        name: true,
        email: true,
      },
    });

    if (!togglerUser) {
      return;
    }

    // Filter out the toggler from recipients
    const recipients = group.groupUsers.filter((gu) => gu.userId !== togglerUserId);

    if (recipients.length === 0) {
      return;
    }

    const getUserDisplayName = (user: { name: string | null; email: string | null } | null) =>
      user?.name ?? user?.email ?? '';

    const togglerName = getUserDisplayName(togglerUser);
    const stateText = newState ? 'activé' : 'désactivé';

    const pushData = {
      title: togglerName,
      message: `a ${stateText} la simplification des dettes pour ${group.name}`,
      data: {
        url: `/groups/${groupId}`,
      },
    };

    await sendPushNotificationToUsers(
      recipients.map((r) => r.userId),
      pushData,
    );
  } catch (error) {
    console.error('Error sending group simplify debts toggle notifications', error);
  }
}

export async function checkRecurrenceNotifications() {
  try {
    const recurrences = await db.expenseRecurrence.findMany({
      where: {
        NOT: {
          notified: true,
        },
      },
      include: {
        expense: {
          select: { id: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    await Promise.all(
      recurrences
        .filter((r) => r.expense[0])
        .map(async (r) => {
          await sendExpensePushNotification(r.expense[0]!.id);
          await db.expenseRecurrence.update({
            where: {
              id: r.id,
            },
            data: {
              notified: true,
            },
          });
        }),
    );
  } catch (e) {
    console.error('Error sending recurrence notifications', e);
  } finally {
    setTimeout(checkRecurrenceNotifications, 1000 * 60); // Check every minute
  }
}
