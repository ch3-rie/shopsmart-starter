# ShopSmart fix and verification — 11 November 2026

The baseline `npm run check` had already passed. This pass fixed one customer-facing assistant defect. No existing test expectation was weakened or removed.

## Defect

The assistant matched a search word inside a longer catalog word. `key` matched `keyboard`, and `set` matched `headset`.

### Reproduction

| | |
|---|---|
| Starting state | Six active products. No product is named "key". Compact Mechanical Keyboard is in stock at ₱1,850. |
| Action | `POST /api/assistant/questions` with `{"question":"Do you have a key?"}` |
| Actual result | HTTP 200. `I found a product. Compact Mechanical Keyboard is currently available for ₱1,850.` Recommended product id 2, link `/products/2`. |
| Expected result | An honest no-match. The keyboard is not recommended. |

The same matcher answered `Show me a set` with the USB Headset, because `set` occurs inside `headset`.

## Fix

`termMatches` in `backend/src/services/assistant.js` now compares whole words. A plural is still accepted (`laptop` matches `laptops`, `keyboard` matches `keyboards`). Synonyms such as `headphones` and `headset` are unchanged.

## Verification

The new test `a short search word is not matched inside a longer catalog word` failed before the fix. The assertion received `I found a product. Compact Mechanical Keyboard is currently available for ₱1,850.`

After the fix, `node --test test/assistant.test.js` passed 23 tests, including that one and the existing keyboard, headphone, study, and unknown-laptop tests.

Live API after the server restarted: `Do you have a key?` returned `I couldn't find an in-stock product. You may want to try a different product name or category.` Recommendations and sources were empty.

Browser at http://localhost:5173/assistant showed the same no-match and `No matching products are currently available.` The assistant page showed that no-match text. The screenshot was later removed after it was included in the complete document.

The supported question `What keyboard can I buy under ₱2,000?` still answered that the Compact Mechanical Keyboard is available for ₱1,850, with the link to that product. The server log was `falling back to catalog rules (PROVIDER_TIMEOUT)`. Loading ended on the catalog answer.

`npm run check` from `C:\ShopSmart-Starter` exited 0. Frontend lint passed. Backend lint passed. Frontend tests: 4 passed. Backend tests: 33 passed, 0 failed. Frontend production build passed.

## Defect not finished

`Do you have a gaming laptop?` still recommends the Laptop Stand at ₱1,200.

| | |
|---|---|
| Why it remains | `gaming` is an optional claim word, and `laptop` is a whole word in the product name. The existing test `supported catalog wording can remain in a validated answer` requires `Recommend an affordable gaming mouse.` to keep the Wireless Mouse even though the description does not say `gaming`. Requiring every claim word would make that test fail. The test was not changed. |
| Impact | A question for a gaming laptop can show the Laptop Stand. The answer uses the stand's catalog price and name. It does not invent a laptop. |
| Temporary limitation | Read the product name on the assistant link. The stand is the only catalog row whose name contains `laptop`. |
| Blocks checkout or totals | No |
