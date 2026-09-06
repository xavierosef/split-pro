# Adding an expense from an iPhone shortcut

SplitPro can accept one expense at a time from an external automation — typically an
iOS Shortcut fired by the Wallet **Transaction** trigger right after an Apple Pay
payment. The automation sends the amount and the merchant, the server picks the
category and the split, and the expense lands in the group or with the friend the
token points at.

Everything is set up from **Account → iPhone shortcut** (`/shortcuts`).

## What the token can do

A shortcut token is a revocable credential that can do exactly one thing: `POST` one
expense to the target chosen when it was created. It is not a session, it cannot read
any data back, and it cannot touch any other group or friend.

- The raw token is shown once, at creation, and stored only as a SHA-256 hash.
- Revoking it from the app takes effect immediately; expenses already added stay.
- Expenses added through a token are listed on the same screen, so an unexpected one
  is easy to spot.

## Endpoint

```
POST /api/shortcuts/expense
Authorization: Bearer <token>
Content-Type: application/json
```

| Field            | Required | Notes                                                                     |
| ---------------- | -------- | ------------------------------------------------------------------------- |
| `amount`         | yes      | `"12.34"`, `"12,34"`, `"1 234,56"` or `12.34`. Sign ignored (see below).  |
| `merchant`       | yes      | Merchant name as Wallet reports it. Used for the title and the category.  |
| `currency`       | no       | ISO 4217. Defaults to the user's default currency.                        |
| `category`       | no       | Overrides the server-side suggestion. Must be a known category key.       |
| `group`          | no       | Public id of a group, when it differs from the token's target.            |
| `date`           | no       | Transaction date. Anything `Date` can parse. Defaults to now.             |
| `idempotencyKey` | no       | Stable key for the transaction. Derived from the transaction when absent. |
| `dryRun`         | no       | `"true"` validates and reports without creating anything.                 |
| `force`          | no       | `"true"` bypasses the "same purchase seconds ago" guard.                  |

Response (`201`, or `200` for a duplicate or a dry run):

```json
{
  "ok": true,
  "duplicate": false,
  "dryRun": false,
  "expenseId": "0f0a…",
  "name": "Carrefour City Paris",
  "amount": "€12.34",
  "currency": "EUR",
  "category": "groceries",
  "categorySource": "suggestion",
  "target": { "type": "group", "name": "Flat" },
  "message": "Added: Carrefour City Paris · €12.34 → Flat",
  "url": "https://…/expenses/0f0a…"
}
```

Amounts are read whatever the phone's locale did to them: the separator closest to
the end is the decimal one, unless it is followed by three digits the currency has no
room for (`1.234` is one thousand two hundred in a two-decimal currency). The sign is
dropped, because some cards report purchases as negative and a refund cannot be told
apart from a purchase — a refund posted this way becomes an expense.

`message` is meant to be shown as-is in a Shortcuts notification. Errors come back as
`{ "ok": false, "code": "...", "error": "..." }` with codes such as `INVALID_TOKEN`,
`INVALID_AMOUNT`, `INVALID_CATEGORY`, `GROUP_NOT_FOUND`, `GROUP_ARCHIVED`, `NO_TARGET`.

## Category suggestion

The category is decided server-side, in `src/lib/merchantCategory.ts`: the merchant
name is normalized (accents, payment-processor prefixes such as `CB` or `SUMUP`, store
numbers, receipt date tails) and matched against a keyword list, longest keyword first.
When nothing matches, the expense gets the neutral `general` category rather than a
guess. The shortcut sends only what Wallet gave it — it never decides the category.

To add a merchant, add its keyword to the matching rule in `CATEGORY_RULES` and a case
to `src/tests/merchantCategory.test.ts`.

## Not adding the same expense twice

Every accepted expense is recorded in `ShortcutExpense` with an idempotency key, unique
per user. Two layers protect against a shortcut that runs twice:

1. **The key.** Either the `idempotencyKey` the shortcut sent, or one derived from the
   token, merchant, amount, currency and the _minute_ of the transaction. A replay of
   the same transaction lands on the same key and gets the original expense back, with
   `"duplicate": true`.
2. **The recent-purchase guard.** The same merchant and amount within two minutes is
   treated as a duplicate too, which covers a double fire straddling a minute boundary.
   A genuine second identical purchase can be sent with `"force": "true"`.

The Wallet trigger does not expose a transaction id, which is why the key is derived
from the transaction's own fields.

## Building the shortcut

1. **Shortcuts → Automation → New → Transaction.** Pick the card, and leave
   _Run immediately_ **off** so iOS asks before running.
2. **Get contents of** `https://<your-splitpro>/api/shortcuts/expense`, method `POST`.
3. Header: `Authorization` = `Bearer <token>`.
4. Request body: `JSON`, with `amount`, `merchant` and — when the trigger exposes it —
   `date`, filled from the trigger's variables.
5. **Show notification** with the `message` field of the response.

### Check the trigger before building the rest

What the Transaction trigger actually exposes depends on the card. Apple Card and
Apple Cash fill Amount and Merchant reliably; a French bank card added to Wallet may
fill one, both, or neither.

Test it in half a minute, before wiring anything up: create the automation on the
Transaction trigger, add a single **Show notification** action, put the trigger's
Amount and Merchant variables in the text, save, and make any small payment with that
card. The notification tells you what you actually get.

### Fallback when the trigger gives nothing

Use the same request from a plain shortcut instead of an automation: add **Ask for
input** (Number) for the amount and **Ask for input** (Text) for the merchant, then the
same _Get contents of_ action. Run it from the home screen, the widget or the share
sheet. The endpoint does not care where the values came from.
