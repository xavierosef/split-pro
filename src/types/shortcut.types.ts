import { z } from 'zod';

/** Shortcuts posts everything as text, so booleans arrive as `true` / `1` / `yes`. */
const looseBoolean = z
  .union([z.boolean(), z.string()])
  .optional()
  .transform((value) => {
    if ('boolean' === typeof value) {
      return value;
    }
    if (undefined === value) {
      return false;
    }
    return ['1', 'true', 'yes', 'oui'].includes(value.trim().toLowerCase());
  });

/**
 * Body of `POST /api/shortcuts/expense`.
 *
 * Kept deliberately forgiving: an iOS Shortcut builds this dictionary by hand and
 * only ever has strings to put in it.
 */
export const shortcutExpenseInputSchema = z.object({
  /** `12.34`, `12,34`, `€12.34` - parsed with the target currency's helpers. */
  amount: z.union([z.string().min(1), z.number()]),
  /** Merchant name as the Wallet transaction trigger reports it. */
  merchant: z.string().min(1).max(200),
  /** ISO 4217 code. Defaults to the group's, then the user's, default currency. */
  currency: z.string().trim().length(3).optional(),
  /** Overrides the server-side suggestion. Must be a known category key. */
  category: z.string().trim().min(1).max(50).optional(),
  /** Public id of the group to bill, when it differs from the token's default target. */
  group: z.string().trim().min(1).max(100).optional(),
  /** Transaction date. Anything `Date` can parse; defaults to now. */
  date: z.string().trim().min(1).optional(),
  /**
   * Stable key for this transaction. When absent, one is derived from the token,
   * merchant, amount, currency and minute of the transaction.
   */
  idempotencyKey: z.string().trim().min(1).max(200).optional(),
  /** Validate and report what would be created, without creating anything. */
  dryRun: looseBoolean,
  /** Bypass the "same purchase seconds ago" guard, for a genuine repeat purchase. */
  force: looseBoolean,
});

export type ShortcutExpenseInput = z.infer<typeof shortcutExpenseInputSchema>;

export interface ShortcutExpenseResponse {
  ok: true;
  /** True when this exact transaction had already been recorded. Nothing was created. */
  duplicate: boolean;
  /** True when `dryRun` was set: nothing was created. */
  dryRun: boolean;
  expenseId: string | null;
  name: string;
  amount: string;
  currency: string;
  category: string;
  categorySource: 'request' | 'suggestion' | 'fallback';
  target: { type: 'group' | 'friend'; name: string };
  /** One line, ready to be shown in a Shortcuts notification. */
  message: string;
  url: string | null;
}

export interface ShortcutErrorResponse {
  ok: false;
  error: string;
  /** Machine-readable code, so a shortcut can branch on it. */
  code: string;
}
