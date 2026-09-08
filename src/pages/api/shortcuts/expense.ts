import type { NextApiRequest, NextApiResponse } from 'next';

import {
  ShortcutError,
  addExpenseFromShortcut,
  authenticateShortcutToken,
  extractShortcutToken,
  touchShortcutToken,
} from '~/server/api/services/shortcutService';
import {
  type ShortcutErrorResponse,
  type ShortcutExpenseResponse,
  shortcutExpenseInputSchema,
} from '~/types/shortcut.types';

/**
 * Adds one expense on behalf of a shortcut token.
 *
 * This is the only thing a shortcut token can do: no session is created, no data is
 * read back, and the token carries its own target. See `docs/APPLE_PAY_SHORTCUT.md`.
 */
const handler = async (
  req: NextApiRequest,
  res: NextApiResponse<ShortcutExpenseResponse | ShortcutErrorResponse>,
) => {
  if ('POST' !== req.method) {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, code: 'METHOD_NOT_ALLOWED', error: 'Use POST' });
  }

  const rawToken = extractShortcutToken({
    authorization: req.headers.authorization,
    token:
      'string' === typeof req.headers['x-splitpro-token']
        ? req.headers['x-splitpro-token']
        : undefined,
  });

  if (!rawToken) {
    return res.status(401).json({
      ok: false,
      code: 'MISSING_TOKEN',
      error: 'Send the token as "Authorization: Bearer <token>"',
    });
  }

  try {
    const token = await authenticateShortcutToken(rawToken);
    await touchShortcutToken(token.id);

    const input = shortcutExpenseInputSchema.safeParse(req.body);

    if (!input.success) {
      const [issue] = input.error.issues;

      return res.status(400).json({
        ok: false,
        code: 'INVALID_BODY',
        error: issue ? `${issue.path.join('.') || 'body'}: ${issue.message}` : 'Invalid body',
      });
    }

    const result = await addExpenseFromShortcut(token, input.data);

    return res.status(result.duplicate || result.dryRun ? 200 : 201).json(result);
  } catch (error) {
    if (error instanceof ShortcutError) {
      return res.status(error.status).json({ ok: false, code: error.code, error: error.message });
    }

    console.error('Shortcut expense failed', error);

    return res
      .status(500)
      .json({ ok: false, code: 'INTERNAL_ERROR', error: 'Could not add the expense' });
  }
};

export default handler;
