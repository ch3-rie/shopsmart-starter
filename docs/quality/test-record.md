# ShopSmart test record

Project: ShopSmart  
Activity: ShopSmart Quality and Deployment Guided Challenge  
Course: PDC50 – Full-Stack AI Application Development  
Testing environment: Local  
Testing dates: 8 November 2026 for the first customer journey; 9 November 2026, 00:19 (UTC+8) for the final release smoke test  
Project version: 1.0.0  
Git commit: `2570001d9fb5591ed0910b7f6bff01d4635150ff` on `main` (`Added product assistant`)  
Working tree: Quality fixes and these documents are uncommitted local changes on that commit.

Frontend: http://localhost:5173  
API: http://localhost:3000  
API base used by the frontend: `VITE_API_URL=http://localhost:3000/api`

Customer data is fictional. Names used were Juan Dela Cruz, Ana Reyes, and Luis Garcia, with `example.com` addresses. No real payment data was entered. `npm run db:seed` was not run.

The screenshots kept with this project are the 12 November release images in `docs/quality/screenshots/2026-11-12/`. Earlier screenshot files were removed after the complete document was compiled.

Authentication is not implemented. Guest, owner, and protected-route tests were not run.

## Starting catalog on 8 November 2026

Confirmed from `GET /api/products` and the database before the first checkout. Orders in the table: 0. The order sequence was already ahead, so the first new order became #2.

| ID | Product | Category | Price | Stock |
|---|---|---|---:|---:|
| 1 | Wireless Mouse | Accessories | ₱650 | 12 |
| 2 | Compact Mechanical Keyboard | Accessories | ₱1,850 | 8 |
| 3 | USB-C Study Lamp | Study | ₱900 | 10 |
| 4 | 1080p Webcam | Video | ₱1,450 | 6 |
| 5 | Laptop Stand | Study | ₱1,200 | 9 |
| 6 | USB Headset | Audio | ₱1,350 | 7 |

## A. Browse and search

### TC-01 Load the product catalog

| Field | Record |
|---|---|
| Case and starting state | Frontend and API running. Six active products. Empty cart. |
| Action and test data | Open http://localhost:5173/. |
| Expected result | The page loads six active products from the API. |
| Observed result and evidence | Six product cards rendered. Screenshot `docs/quality/screenshots/tc1-catalog.png`. On 9 November the catalog loaded again and `GET /api/products` returned HTTP 200 with 6 products. Screenshot `docs/quality/screenshots/release-verification/catalog-products.png`. |
| Decision | PASS |

### TC-02 Product card information

| Field | Record |
|---|---|
| Case and starting state | Same catalog as TC-01, stock still at the 8 November starting values. |
| Action and test data | Read each card on `/`. |
| Expected result | Name, description, category, price, and stock match the database. |
| Observed result and evidence | Labels were `12 in stock`, `Only 8 left`, `10 in stock`, `Only 6 left`, `9 in stock`, and `Only 7 left`. Prices were ₱650.00, ₱1,850.00, ₱900.00, ₱1,450.00, ₱1,200.00, and ₱1,350.00. Screenshot `tc1-catalog.png`. |
| Decision | PASS |

### TC-03 Search for an existing product

| Field | Record |
|---|---|
| Case and starting state | Catalog loaded. |
| Action and test data | Enter `keyboard` in Search products. API check: `GET /api/products?search=keyboard`. |
| Expected result | Only Compact Mechanical Keyboard is shown. Search is case-insensitive. |
| Observed result and evidence | The page showed only that keyboard at ₱1,850.00. Screenshot `tc1-search-keyboard.png`. A later API search for `KEYBOARD` also returned only that product. |
| Decision | PASS |

### TC-04 Search with no match

| Field | Record |
|---|---|
| Case and starting state | Catalog loaded. |
| Action and test data | Search `Ultra Gaming Laptop X`. |
| Expected result | No product card is shown. |
| Observed result and evidence | The page showed `No products match your filters.` Screenshot `tc1-search-none.png`. The API returned an empty product list for the same search. |
| Decision | PASS |

### TC-05 Category filter

| Field | Record |
|---|---|
| Case and starting state | Search cleared. Categories available: All, Accessories, Study, Video, Audio. |
| Action and test data | Select category Study. |
| Expected result | Only Study products remain. |
| Observed result and evidence | USB-C Study Lamp, then Laptop Stand. Recorded in the 8 November journey. |
| Decision | PASS |

### TC-06 Price sort

| Field | Record |
|---|---|
| Case and starting state | All categories visible. |
| Action and test data | Sort Price: high to low, then Price: low to high. |
| Expected result | Cards reorder by database price. |
| Observed result and evidence | High to low: 1850, 1450, 1350, 1200, 900, 650. Low to high reversed that order. Screenshot `tc1-sort-price-desc.png`. |
| Decision | PASS |

### TC-07 Open a product details page

| Field | Record |
|---|---|
| Case and starting state | 9 November. Mouse stock was 11 before the release checkout. |
| Action and test data | From the catalog, open Details for Wireless Mouse. Route `/products/1`. |
| Expected result | The page shows that product's name, description, category, price, and stock. |
| Observed result and evidence | Accessories, Wireless Mouse, the USB-receiver description, ₱650.00, and `11 unit(s) available`. Screenshot `docs/quality/screenshots/release-verification/product-details.png`. |
| Decision | PASS |

### TC-08 Missing product page

| Field | Record |
|---|---|
| Case and starting state | API running. No product 99999. |
| Action and test data | Open `/products/99999`. API: `GET /api/products/99999`. |
| Expected result | A not-found message and no product details. |
| Observed result and evidence | The page showed `Product could not be found.` and `Return to products`. The API returned `404 PRODUCT_NOT_FOUND`. |
| Decision | PASS |

### TC-09 Stale error after changing only the product id

| Field | Record |
|---|---|
| Case and starting state | `/products/99999` already showing the not-found message. Same `ProductDetailsPage` instance. |
| Action and test data | Change the address to `/products/1` without a full reload. |
| Expected result | The Wireless Mouse replaces the error. |
| Observed result and evidence | The URL became `/products/1` and the page requested `/api/products/1`, but the text stayed `Product could not be found.` |
| Decision | FAIL. Related defect F-05. |

### TC-10 Retest of TC-09

| Field | Record |
|---|---|
| Case and starting state | F-05 fixed so the effect clears the previous error and product when the id changes. |
| Action and test data | Open `/products/99999`, then change the address to `/products/1` without a full reload. |
| Expected result | The mouse page replaces the error. |
| Observed result and evidence | The page showed Wireless Mouse, ₱650.00, and `11 unit(s) available`. |
| Decision | PASS. Retest of TC-09. |

## B. Shopping cart

The cart is React state. A refresh is expected to clear it.

### TC-11 Add a product

| Field | Record |
|---|---|
| Case and starting state | 8 November. Empty cart. Mouse price ₱650, stock known to the cart 12. |
| Action and test data | Add Wireless Mouse twice. Open `/cart`. |
| Expected result | Quantity 2 and line total ₱1,300. |
| Observed result and evidence | Cart (2) and line total ₱1,300. |
| Decision | PASS |

### TC-12 Increase quantity

| Field | Record |
|---|---|
| Case and starting state | Cart from TC-11, quantity 2. |
| Action and test data | Set the quantity field to 3. |
| Expected result | Items 3 and total ₱1,950. |
| Observed result and evidence | Items 3 and Total ₱1,950. Screenshot `tc2-cart-qty3.png`. |
| Decision | PASS |

A later successful edit from a higher quantity down to a lower positive quantity was not recorded as its own step.

### TC-13 Stock and invalid quantities in the cart

| Field | Record |
|---|---|
| Case and starting state | Quantity 3. Stock known to that line was 12. |
| Action and test data | Enter 13, then 0, then 1.5. |
| Expected result | The quantity stays 3. The message explains the rejection. |
| Observed result and evidence | Quantity 13 showed `Only 12 unit(s) are available.` Quantity 0 and 1.5 showed `Quantity must be a whole number greater than zero.` Quantity stayed 3. |
| Decision | PASS |

### TC-14 Remove a product

| Field | Record |
|---|---|
| Case and starting state | One mouse line, quantity 3. |
| Action and test data | Choose Remove. |
| Expected result | The cart is empty and the count is 0. |
| Observed result and evidence | `Your cart is empty` and Cart (0). |
| Decision | PASS |

### TC-15 Refresh the page

| Field | Record |
|---|---|
| Case and starting state | A mouse was added again after TC-14. |
| Action and test data | Reload the browser. |
| Expected result | The cart is empty because it is not stored. |
| Observed result and evidence | Cart (0) after reload. |
| Decision | PASS |

### TC-16 Release-smoke cart retest

| Field | Record |
|---|---|
| Case and starting state | 9 November. Empty cart after refresh. Mouse stock in the database was 11. |
| Action and test data | Add the mouse. Open `/cart`. Set quantity to 2. Enter 12. Remove the line. Add the mouse again. Reload `/`. |
| Expected result | Quantity 2 totals ₱1,300. A quantity above stock is rejected. Remove empties the cart. Refresh clears a newly added line. |
| Observed result and evidence | Cart (2), ₱650 each, line and total ₱1,300. Quantity 12 stayed at 2 and showed `Only 11 unit(s) are available.` Remove showed Cart (0). After adding again and reloading, Cart (0). Screenshot `docs/quality/screenshots/release-verification/cart-qty2.png`. |
| Decision | PASS |

## C. Simulated checkout

### TC-17 Invalid customer information in the browser

| Field | Record |
|---|---|
| Case and starting state | 8 November. One mouse in the cart, total ₱650. Mouse stock 12. No order rows. |
| Action and test data | Open checkout. Submit name `J`, email `not-an-email`, and address `short`. |
| Expected result | The browser blocks the invalid email. No order is created. |
| Observed result and evidence | The browser showed `Please include an '@' in the email address`. Cart stayed at 1. |
| Decision | PASS |

### TC-18 Invalid order on the API

| Field | Record |
|---|---|
| Case and starting state | Mouse stock 12. No orders. |
| Action and test data | `POST /api/orders` with a one-character name, invalid email, short address, empty items, quantity 0, and a duplicate product id. Customer fields used the same fictional probes. |
| Expected result | HTTP 422 `INVALID_ORDER`. Stock unchanged. |
| Observed result and evidence | HTTP 422 `INVALID_ORDER`. Mouse stock stayed 12. |
| Decision | PASS |

### TC-19 Successful checkout, order #2

| Field | Record |
|---|---|
| Case and starting state | One mouse in the cart. Stock 12. |
| Action and test data | Submit Juan Dela Cruz, juan@example.com, `123 Sample Street, Angeles City`. |
| Expected result | HTTP 201, status `PENDING`, total ₱650 from the database price, stock 11, and the cart clears only after success. |
| Observed result and evidence | Confirmation showed order #2 and ₱650.00, then Cart (0). The database row is `PENDING`, total 650, product 1, quantity 1, unit price 650. Mouse stock became 11. Screenshot `tc3-order-confirmation.png`. The page states that no payment is collected. |
| Decision | PASS |

There was no order #1. The PostgreSQL identity sequence was already ahead of the empty order table.

### TC-20 Empty checkout form

| Field | Record |
|---|---|
| Case and starting state | 9 November. One mouse in the cart. Cart (1). Total ₱650. |
| Action and test data | Open `/checkout` and choose Place simulated order with every field empty. |
| Expected result | The form does not submit. The cart remains. |
| Observed result and evidence | The name field was invalid with `Please fill out this field.` Cart (1) remained. The amount due still said no payment is collected. |
| Decision | PASS |

### TC-21 Successful checkout, order #9

| Field | Record |
|---|---|
| Case and starting state | After TC-20. Mouse stock 11. Orders #2, #6, #7, and #8 already stored. |
| Action and test data | Fill Juan Dela Cruz, juan@example.com, and `123 Sample Street, Angeles City`. Submit. |
| Expected result | The request contains product id and quantity only. The stored total uses the database price. The cart clears after success. |
| Observed result and evidence | Request body: `{"customerName":"Juan Dela Cruz","email":"juan@example.com","address":"123 Sample Street, Angeles City","items":[{"productId":1,"quantity":1}]}`. Confirmation showed order #9, status `PENDING`, total ₱650.00, and Cart (0). Screenshot `order-confirmation.png`. The database row is `PENDING`, total 650, product 1, quantity 1, unit price 650. Mouse stock changed from 11 to 10. |
| Decision | PASS |

### TC-22 Successful checkout, order #6

| Field | Record |
|---|---|
| Case and starting state | Earlier smoke test after order #2. Lamp stock 10. |
| Action and test data | Add one USB-C Study Lamp and submit Juan Dela Cruz, juan@example.com, `123 Sample Street, Angeles City`. |
| Expected result | Total ₱900 from the database price. Lamp stock becomes 9. |
| Observed result and evidence | Order #6, `PENDING`, total 900, product 3, quantity 1, unit price 900. Lamp stock changed from 10 to 9. Screenshot `tc7-final-checkout.png`. |
| Decision | PASS |

### TC-23 Successful checkout, order #7

| Field | Record |
|---|---|
| Case and starting state | Keyboard stock 8. Cart quantity 2. |
| Action and test data | Search `keyboard`, open `/products/2`, add it, set quantity to 2, and submit Juan Dela Cruz, juan@example.com, `123 Sample Street, Angeles City`. |
| Expected result | Total ₱3,700. The payload has no client price. Stock becomes 6. |
| Observed result and evidence | Payload items were product id 2 and quantity 2 only. Confirmation showed order #7, `PENDING`, and ₱3,700.00. Cart (0) after success. Stored unit price 1850. Keyboard stock changed from 8 to 6. |
| Decision | PASS |

Opening `/checkout` with an empty cart was not recorded as its own test.

## D. Stock validation

### TC-24 Purchase within available stock

| Field | Record |
|---|---|
| Case and starting state | Covered by TC-19, TC-21, TC-22, and TC-23. |
| Action and test data | Place those fictional orders for quantities below the stock at the time. |
| Expected result | Each order is stored and stock falls by the purchased quantity. |
| Observed result and evidence | Order #2 reduced the mouse from 12 to 11. Order #6 reduced the lamp from 10 to 9. Order #7 reduced the keyboard from 8 to 6. Order #9 reduced the mouse from 11 to 10. |
| Decision | PASS |

### TC-25 Client price is ignored

| Field | Record |
|---|---|
| Case and starting state | Lamp price ₱900. |
| Action and test data | `POST /api/orders` for Luis Garcia, luis@example.com, `123 Sample Street, Angeles City`, product 3, quantity 1, and a client `price` of 1. |
| Expected result | HTTP 201. Total and unit price are 900, not 1. |
| Observed result and evidence | HTTP 201. Order #8, `PENDING`, total 900, stored unit price 900. Lamp stock changed from 9 to 8. An earlier probe with the same price behavior was restored and is not still in the table. Order #8 remains. |
| Decision | PASS |

### TC-26 Purchase of the exact remaining headset stock

| Field | Record |
|---|---|
| Case and starting state | Headset stock 7. This probe was restored after the check. |
| Action and test data | `POST /api/orders` for quantity 7. |
| Expected result | HTTP 201, total ₱9,450, stock 0. |
| Observed result and evidence | HTTP 201, quantity 7, total 9450, unit price 1350, stock 0. The probe order was then deleted and stock was restored to 7. |
| Decision | PASS |

### TC-27 Purchase above remaining stock

| Field | Record |
|---|---|
| Case and starting state | Headset stock 0 immediately after TC-26, before restoration. |
| Action and test data | `POST /api/orders` for another headset. |
| Expected result | HTTP 409 `INSUFFICIENT_STOCK`. Stock stays 0. |
| Observed result and evidence | HTTP 409, `Only 0 unit(s) of USB Headset are available.` Stock stayed 0. |
| Decision | PASS |

### TC-28 Concurrent purchase

| Field | Record |
|---|---|
| Case and starting state | Headset stock restored to 7 for this pair of requests. Probe rows were removed afterward. |
| Action and test data | Send two purchases of 7 headsets at the same time. |
| Expected result | One order succeeds. The other returns `409 STOCK_CHANGED`. Stock does not go negative. |
| Observed result and evidence | One HTTP 201, total 9450. One HTTP 409 `STOCK_CHANGED`. Stock was 0, then restored to 7 with the probe rows removed. |
| Decision | PASS |

### TC-29 Inactive product

| Field | Record |
|---|---|
| Case and starting state | Headset was marked inactive for one request, then restored to active. |
| Action and test data | `POST /api/orders` for that headset while inactive. |
| Expected result | HTTP 422 `PRODUCT_UNAVAILABLE`. No stock change from that request. |
| Observed result and evidence | HTTP 422 `PRODUCT_UNAVAILABLE`. The product was restored to active. |
| Decision | PASS |

### TC-30 Missing product on an order

| Field | Record |
|---|---|
| Case and starting state | Product 99999 does not exist. |
| Action and test data | `POST /api/orders` with product id 99999 and quantity 1. |
| Expected result | HTTP 422 `PRODUCT_UNAVAILABLE`. |
| Observed result and evidence | HTTP 422 `PRODUCT_UNAVAILABLE` during the 8 November probes and again on 9 November. |
| Decision | PASS |

### TC-31 Rejected quantity does not change stock

| Field | Record |
|---|---|
| Case and starting state | 8 November, before order #7. Keyboard stock 8. |
| Action and test data | `POST /api/orders` for Ana Reyes, ana@example.com, `123 Sample Street, Angeles City`, product 2, quantity 20, and a client `price` of 1. |
| Expected result | The order is rejected. Stock stays 8. |
| Observed result and evidence | HTTP 409 `INSUFFICIENT_STOCK`, `Only 8 unit(s) of Compact Mechanical Keyboard are available.` Stock stayed 8 until order #7 later bought 2 and left stock 6. |
| Decision | PASS |

The order schema also rejects a quantity above 20 with HTTP 422 `INVALID_ORDER`. Quantity 99 was observed with that result during the technical inspection. Current catalog stock is 11 or less, so the cart and the API agree for the products on hand. Related note F-06. This was not treated as a failed customer journey.

## E. Product assistant

The first assistant run on 8 November used catalog rules because no provider key was in use for those calls. On 9 November a provider call was attempted and timed out. The visible answer still came from the catalog rules.

### TC-32 Broad availability question

| Field | Record |
|---|---|
| Case and starting state | Six in-stock products. |
| Action and test data | Ask `What products are available?` through `POST /api/assistant/questions`. |
| Expected result | Only catalog products, at most three, with prices and links. |
| Observed result and evidence | HTTP 200. Mouse ₱650, lamp ₱900, and stand ₱1,200, with links and sources. The same answer remained after the assistant fixes. |
| Decision | PASS |

### TC-33 Named product

| Field | Record |
|---|---|
| Case and starting state | Wireless Mouse is active and in stock. |
| Action and test data | Ask `Do you have a wireless mouse?` |
| Expected result | The mouse, its database price, and `/products/1`. |
| Observed result and evidence | HTTP 200. Wireless Mouse, ₱650, `/products/1`. |
| Decision | PASS |

### TC-34 Budget recommendation

| Field | Record |
|---|---|
| Case and starting state | Keyboard price ₱1,850. |
| Action and test data | Ask `What keyboard can I buy under ₱2,000?` |
| Expected result | Only the keyboard, at ₱1,850. |
| Observed result and evidence | HTTP 200. Compact Mechanical Keyboard, ₱1,850, within budget. Screenshot `tc5-assistant-keyboard.png`. |
| Decision | PASS |

### TC-35 Cheapest product

| Field | Record |
|---|---|
| Case and starting state | Lowest database price is the mouse at ₱650. |
| Action and test data | Ask `Which product is cheapest?` |
| Expected result | The mouse is first. No invented price. |
| Observed result and evidence | HTTP 200. Wireless Mouse at ₱650, then two more in-stock products. The route returns at most three products. |
| Decision | PASS |

### TC-36 Unknown product name

| Field | Record |
|---|---|
| Case and starting state | No Ultra Gaming Laptop X in the catalog. Laptop Stand description contains the word laptops. |
| Action and test data | Ask `Do you have an Ultra Gaming Laptop X?` |
| Expected result | No recommendation. |
| Observed result and evidence | The assistant answered `I found a ultra. Laptop Stand is currently available for ₱1,200.` and linked `/products/5`. Screenshot `tc5-assistant-unsupported-laptop.png`. |
| Decision | FAIL. Related defect D-1. |

### TC-37 Retest of TC-36

| Field | Record |
|---|---|
| Case and starting state | D-1 fixed. A product must match every required search term. |
| Action and test data | Ask the same unknown-laptop question in the API and in the browser. |
| Expected result | An honest no-match with no recommendation. |
| Observed result and evidence | `I couldn't find an in-stock product.` No recommendations or sources. Screenshot `tc5-assistant-no-match.png`. The keyboard and wireless-mouse answers still named the correct products. |
| Decision | PASS. Retest of TC-36. |

### TC-38 No-match sentence under ₱100

| Field | Record |
|---|---|
| Case and starting state | No product is priced under ₱100. |
| Action and test data | Ask `Do you have a product costing less than ₱100?` |
| Expected result | No product, and a readable sentence that keeps the ₱100 budget. |
| Observed result and evidence | Recommendations were empty, but the answer said `I couldn't find an in-stock costing within your ₱100 budget.` Screenshot `tc5-assistant-budget-wording.png`. |
| Decision | FAIL. Related defect D-2. |

### TC-39 Retest of TC-38

| Field | Record |
|---|---|
| Case and starting state | D-2 fixed with D-1. The sentence subject comes from a known product type, or the word product. |
| Action and test data | Ask the same under-₱100 question. |
| Expected result | No product. The sentence uses `product` and keeps ₱100. |
| Observed result and evidence | `I couldn't find an in-stock product within your ₱100 budget. You may want to adjust your budget or explore other categories.` Screenshot `tc5-assistant-budget-fixed.png`. |
| Decision | PASS. Retest of TC-38. |

### TC-40 Question shorter than 3 characters

| Field | Record |
|---|---|
| Case and starting state | Assistant page open. |
| Action and test data | Submit `ab`. |
| Expected result | The question is rejected. |
| Observed result and evidence | The page showed `Question must contain between 3 and 300 characters.` The API returned HTTP 422 `INVALID_QUESTION`. Screenshot `tc5-assistant-short-question.png`. |
| Decision | PASS |

### TC-41 Question longer than 300 characters

| Field | Record |
|---|---|
| Case and starting state | Assistant route limit is 300 characters. The textarea `maxLength` is 300. |
| Action and test data | `POST /api/assistant/questions` with a 301-character question. |
| Expected result | HTTP 422 `INVALID_QUESTION`. |
| Observed result and evidence | HTTP 422 `INVALID_QUESTION`. |
| Decision | PASS |

### TC-42 Rate-limit response shape

| Field | Record |
|---|---|
| Case and starting state | Limit of 20 requests per minute per client. |
| Action and test data | Send more than 20 assistant questions from one client. |
| Expected result | HTTP 429 with the API error envelope the page can read. |
| Observed result and evidence | HTTP 429 with `{ "message": "Too many requests, please try again later." }`. The page reads `error.message`, so it would have shown `Request failed with status 429.` |
| Decision | FAIL. Related defect D-4. |

### TC-43 Retest of TC-42

| Field | Record |
|---|---|
| Case and starting state | D-4 fixed. The limiter returns `error.code` `RATE_LIMITED`. The limit is still 20 per minute. |
| Action and test data | After an API restart, send 21 questions. |
| Expected result | Requests 1–20 succeed. Request 21 is HTTP 429 with the error envelope. |
| Observed result and evidence | Requests 1–20 returned HTTP 200. Request 21 returned HTTP 429, code `RATE_LIMITED`, message `Too many requests, please try again later.` |
| Decision | PASS. Retest of TC-42. |

### TC-44 Named out-of-stock product

| Field | Record |
|---|---|
| Case and starting state | Headset stock was set to 0 for this question, then restored to 7. |
| Action and test data | Ask for the USB Headset while its stock was 0. |
| Expected result | The headset is not recommended as available. |
| Observed result and evidence | `USB Headset is currently out of stock, so I can't recommend it.` Recommendations and sources were empty. Stock was restored to 7. |
| Decision | PASS |

### TC-45 Study recommendation under ₱1,500

| Field | Record |
|---|---|
| Case and starting state | 9 November. Lamp ₱900, stock 8. Stand ₱1,200, stock 9. Keyboard ₱1,850. |
| Action and test data | On http://localhost:5173/assistant, ask `Can you recommend a product for studying with a budget of ₱1,500?` |
| Expected result | In-stock study products at or under ₱1,500, with database prices and correct links. |
| Observed result and evidence | `I couldn't find an in-stock product within your ₱1,500 budget.` No links. The word `studying` did not match the catalog word `study`. |
| Decision | FAIL. Corrected during release verification. No separate defect number was assigned before the fix. |

### TC-46 Retest of TC-45

| Field | Record |
|---|---|
| Case and starting state | `study` and `studying` added as synonyms. API restarted. |
| Action and test data | Submit the same question again. Open the lamp link. |
| Expected result | Lamp and stand only, at ₱900 and ₱1,200. Links `/products/3` and `/products/5`. |
| Observed result and evidence | `I found 2 in-stock products within your ₱1,500 budget. USB-C Study Lamp is currently available for ₱900. Laptop Stand is currently available for ₱1,200.` Links matched those routes. `/products/3` showed the lamp at ₱900.00 and 8 units. The keyboard was not recommended. Screenshot `docs/quality/screenshots/release-verification/assistant-study.png`. The server log for this call was `falling back to catalog rules (PROVIDER_TIMEOUT)`. |
| Decision | PASS. Retest of TC-45. |

### TC-47 Live Gemini success

| Field | Record |
|---|---|
| Case and starting state | A provider key is present on the backend. Its value was not read or recorded. |
| Action and test data | Use the live provider response from TC-46. |
| Expected result | A successful model response that still passes catalog checks. |
| Observed result and evidence | The provider timed out. No successful live model text was captured. An earlier live call in this environment returned provider HTTP 503 and also used the catalog fallback. |
| Decision | BLOCKED |

### TC-48 Provider failure in automated tests

| Field | Record |
|---|---|
| Case and starting state | Backend test suite. The provider is mocked. No live credential is changed. |
| Action and test data | Run the assistant tests that cover a missing key, HTTP errors, timeout, malformed output, and rejected drafts. |
| Expected result | The catalog recommendation or a safe rejection is kept. Secrets in the thrown error are not returned. |
| Observed result and evidence | Those tests passed in the 9 November `npm run check` (32 backend tests, 0 failed). |
| Decision | PASS |

## F. Failure handling

### TC-49 API unavailable

| Field | Record |
|---|---|
| Case and starting state | Frontend still served at http://localhost:5173. Backend process stopped. |
| Action and test data | Reload `/`. |
| Expected result | Loading ends with a message that tells the user the API is down. |
| Observed result and evidence | `Failed to fetch Make sure the backend is running.` Screenshots `tc6-api-down.png` and `tc6-api-down-message.png`. |
| Decision | PASS |

### TC-50 API recovery

| Field | Record |
|---|---|
| Case and starting state | Backend stopped after TC-49. |
| Action and test data | Start the backend with `npm run dev --workspace backend`. Reload `/`. Request `GET /api/health`. |
| Expected result | Health returns `{ "status": "ok" }` and products load. |
| Observed result and evidence | Health returned `{ "status": "ok" }`. The catalog showed Wireless Mouse and Compact Mechanical Keyboard with no error. Screenshot `tc6-api-recovered.png`. |
| Decision | PASS |

### TC-51 Malformed JSON

| Field | Record |
|---|---|
| Case and starting state | API running, before the parser-error fix. |
| Action and test data | `POST /api/orders` with body `{bad`. |
| Expected result | A generic client error and a request id. No parser text. |
| Observed result and evidence | HTTP 400, code `INTERNAL_ERROR`, message `Expected property name or '}' in JSON at position 1 (line 1 column 2)`. No `X-Request-ID`. |
| Decision | FAIL. Related defect D-3. |

### TC-52 Retest of TC-51

| Field | Record |
|---|---|
| Case and starting state | D-3 fixed. Request ids are assigned before JSON parsing. |
| Action and test data | `POST /api/orders` with body `{bad`. |
| Expected result | HTTP 400 `INVALID_JSON`, a generic message, and a matching request id. |
| Observed result and evidence | HTTP 400, code `INVALID_JSON`, message `Request body must be valid JSON.` The `traceId` matched `X-Request-ID`. The parser text was absent. |
| Decision | PASS. Retest of TC-51. |

### TC-53 Unexpected server error

| Field | Record |
|---|---|
| Case and starting state | Automated test replaces product lookup with a thrown error that contains `secret-do-not-leak`. |
| Action and test data | `GET /api/products` against that stub. |
| Expected result | HTTP 500 `INTERNAL_ERROR` and a generic message. The secret text is absent. |
| Observed result and evidence | The test passed. Status 500, generic message, and the trace id matched the response header. |
| Decision | PASS |

### TC-54 Database stopped

| Field | Record |
|---|---|
| Case and starting state | PostgreSQL was running and was not stopped. |
| Action and test data | Not performed. |
| Expected result | Health and product requests fail without exposing the connection string. |
| Observed result and evidence | Not performed, so the live outage was not observed. |
| Decision | BLOCKED |

### TC-55 Health check when the database query throws

| Field | Record |
|---|---|
| Case and starting state | F-01 fixed. The automated test replaces the health query with an error that contains a connection string. |
| Action and test data | `GET /api/health` in that test. |
| Expected result | HTTP 503 `{ "status": "unavailable" }` with no connection text. |
| Observed result and evidence | The test passed in the 9 November `npm run check`. The log line was `database health check failed`. |
| Decision | PASS |

### TC-56 Health while the database is up

| Field | Record |
|---|---|
| Case and starting state | 9 November. API and PostgreSQL running. |
| Action and test data | `GET http://localhost:3000/api/health`. |
| Expected result | HTTP 200 `{ "status": "ok" }`. |
| Observed result and evidence | HTTP 200 and `{ "status": "ok" }`. Screenshot `docs/quality/screenshots/release-verification/health.png`. The page is the browser JSON view; the body was read separately. |
| Decision | PASS |

### TC-57 Invalid product ids

| Field | Record |
|---|---|
| Case and starting state | API running. |
| Action and test data | `GET /api/products/0` and `GET /api/products/abc`. |
| Expected result | HTTP 400 `INVALID_PRODUCT_ID`. |
| Observed result and evidence | Both returned HTTP 400 `INVALID_PRODUCT_ID`. |
| Decision | PASS |

### TC-58 Unknown API route

| Field | Record |
|---|---|
| Case and starting state | API running. |
| Action and test data | `GET /api/unknown`. |
| Expected result | HTTP 404 `ROUTE_NOT_FOUND` and a request id. |
| Observed result and evidence | HTTP 404 `ROUTE_NOT_FOUND` with `X-Request-ID`. |
| Decision | PASS |

### TC-59 Unknown frontend route

| Field | Record |
|---|---|
| Case and starting state | Frontend running. |
| Action and test data | Open `/missing-page`. |
| Expected result | A not-found page with a way back to the catalog. |
| Observed result and evidence | `Page not found` and a return link. Screenshot `tc-not-found.png`. |
| Decision | PASS |

### TC-60 Local CORS

| Field | Record |
|---|---|
| Case and starting state | `FRONTEND_URL` is http://localhost:5173. |
| Action and test data | Request the API with Origin `http://localhost:5173`. |
| Expected result | That origin is allowed. A wildcard is not used. |
| Observed result and evidence | `Access-Control-Allow-Origin: http://localhost:5173`. Automated tests also reject a missing production origin and `*`. |
| Decision | PASS |

## Consolidated results

| Test ID | Test Case | Expected Result | Observed Result | Decision | Related Defect |
|---|---|---|---|---|---|
| TC-01 | Load catalog | Six products load | Six cards; API returned 6 | PASS | |
| TC-02 | Card information | Fields match the database | Prices and stock labels matched | PASS | |
| TC-03 | Search keyboard | One keyboard | One keyboard at ₱1,850 | PASS | |
| TC-04 | Search with no match | Empty result | `No products match your filters.` | PASS | |
| TC-05 | Study category | Lamp and stand | Lamp, then stand | PASS | |
| TC-06 | Price sort | Price order | 1850 down to 650, then the reverse | PASS | |
| TC-07 | Product details | Mouse page matches stock 11 | ₱650.00 and 11 units | PASS | |
| TC-08 | Missing product | Not-found message | Page and API 404 | PASS | |
| TC-09 | Stale product error | New product replaces the error | Error stayed on screen | FAIL | F-05 |
| TC-10 | Retest TC-09 | Mouse replaces the error | Mouse page shown | PASS | F-05 |
| TC-11 | Add to cart | Quantity 2 totals ₱1,300 | Cart (2), ₱1,300 | PASS | |
| TC-12 | Increase quantity | Quantity 3 totals ₱1,950 | Items 3, ₱1,950 | PASS | |
| TC-13 | Invalid cart quantity | Quantity stays 3 | Stock and non-integer values rejected | PASS | |
| TC-14 | Remove item | Empty cart | Cart (0) | PASS | |
| TC-15 | Refresh | Cart clears | Cart (0) | PASS | |
| TC-16 | Release cart retest | Totals, stock cap, remove, refresh | ₱1,300, rejection, then Cart (0) | PASS | |
| TC-17 | Invalid browser checkout | No order | Browser blocked the email | PASS | |
| TC-18 | Invalid API order | HTTP 422, stock unchanged | `INVALID_ORDER`, stock 12 | PASS | |
| TC-19 | Order #2 | ₱650, stock 11 | `PENDING`, unit price 650 | PASS | |
| TC-20 | Empty checkout form | Form does not submit | `Please fill out this field.` | PASS | |
| TC-21 | Order #9 | Database price, cart clears after success | #9, ₱650.00, stock 10 | PASS | |
| TC-22 | Order #6 | Lamp total ₱900 | #6, stock 9 | PASS | |
| TC-23 | Order #7 | Two keyboards, ₱3,700 | #7, stock 6, no client price | PASS | |
| TC-24 | Stock deduction | Stock falls by the quantity sold | Orders #2, #6, #7, and #9 matched | PASS | |
| TC-25 | Client price | Total stays ₱900 | Order #8 total 900 | PASS | |
| TC-26 | Exact headset stock | Total ₱9,450, stock 0 | HTTP 201, then restored | PASS | |
| TC-27 | Above zero stock | HTTP 409, stock stays 0 | `Only 0 unit(s)` | PASS | |
| TC-28 | Concurrent purchase | No negative stock | One 201 and one `STOCK_CHANGED` | PASS | |
| TC-29 | Inactive product | HTTP 422 | `PRODUCT_UNAVAILABLE`, then restored | PASS | |
| TC-30 | Missing order product | HTTP 422 | `PRODUCT_UNAVAILABLE` | PASS | |
| TC-31 | Rejected over-stock order | Stock unchanged | HTTP 409 while keyboard stock was 8 | PASS | |
| TC-32 | Available products | At most three catalog products | Mouse, lamp, stand | PASS | |
| TC-33 | Named mouse | Mouse at ₱650 | `/products/1` | PASS | |
| TC-34 | Keyboard budget | Keyboard at ₱1,850 | Within ₱2,000 | PASS | |
| TC-35 | Cheapest | Mouse first | ₱650 first | PASS | |
| TC-36 | Unknown laptop | No recommendation | Laptop Stand was recommended | FAIL | D-1 |
| TC-37 | Retest TC-36 | Honest no-match | No recommendation | PASS | D-1 |
| TC-38 | Under ₱100 wording | Readable no-match | Sentence used `costing` | FAIL | D-2 |
| TC-39 | Retest TC-38 | Sentence uses `product` | ₱100 budget kept | PASS | D-2 |
| TC-40 | Short question | Rejected | Page message and HTTP 422 | PASS | |
| TC-41 | Long question | HTTP 422 | `INVALID_QUESTION` | PASS | |
| TC-42 | Rate-limit body | Error envelope | Body was `{ "message": ... }` | FAIL | D-4 |
| TC-43 | Retest TC-42 | 20 succeed, 21 is 429 | `RATE_LIMITED` envelope | PASS | D-4 |
| TC-44 | Out-of-stock headset | Not recommended as available | Out-of-stock sentence, then stock restored | PASS | |
| TC-45 | Study budget | Lamp and stand under ₱1,500 | No product found | FAIL | Study-term match |
| TC-46 | Retest TC-45 | Lamp ₱900 and stand ₱1,200 | Correct links; provider timed out | PASS | Study-term match |
| TC-47 | Live Gemini success | A valid live model answer | Timeout and an earlier HTTP 503 | BLOCKED | |
| TC-48 | Mocked provider failure | Safe fallback | Automated tests passed | PASS | |
| TC-49 | API down | Useful error | `Failed to fetch` message | PASS | |
| TC-50 | API recovery | Products return | Health `ok` and catalog loaded | PASS | |
| TC-51 | Malformed JSON | Generic 400 and request id | Parser text and no request id | FAIL | D-3 |
| TC-52 | Retest TC-51 | `INVALID_JSON` | Matching request id | PASS | D-3 |
| TC-53 | Unexpected 500 | Generic message | Secret text absent | PASS | |
| TC-54 | Database stopped | Safe failure | Not performed | BLOCKED | |
| TC-55 | Health query failure | HTTP 503, no connection text | Automated test passed | PASS | F-01 |
| TC-56 | Health while database is up | `{ "status": "ok" }` | HTTP 200 | PASS | |
| TC-57 | Invalid product id | HTTP 400 | `INVALID_PRODUCT_ID` | PASS | |
| TC-58 | Unknown API route | HTTP 404 | `ROUTE_NOT_FOUND` | PASS | |
| TC-59 | Unknown page | Not-found page | `Page not found` | PASS | |
| TC-60 | CORS | Local origin only | `http://localhost:5173` | PASS | |

## Test summary

| Result | Count |
|---|---:|
| Test cases | 60 |
| Passed | 52 |
| Failed, original result preserved | 6 |
| Blocked | 2 |

The six failed results are TC-09, TC-36, TC-38, TC-42, TC-45, and TC-51. Each has a later passing retest: TC-10, TC-37, TC-39, TC-43, TC-46, and TC-52.

Defects identified from these tests: D-1, D-2, D-3, D-4, F-05, and the study-word match found in TC-45.

Defects fixed and verified by retest: D-1, D-2, D-3, D-4, F-05, and the study-word match.

Defects still unresolved: F-07, the missing database check that stock cannot be negative. Checkout still prevents a negative stock. F-06, the quantity ceiling of 20, remains the written order rule and did not fail a current catalog purchase.

Inspection items F-01, F-02, F-03, F-04, and F-08 were also corrected and checked. They are recorded in `docs/quality/fix-and-verification-report.md`.

## Important findings

The largest customer-facing defects were unsupported assistant answers. An unknown laptop was matched to the Laptop Stand, and a no-match sentence used the leftover word `costing`. Both were corrected and retested. A later release question failed for the same class of matching problem: `studying` did not match `study`. That retest passed after the synonym was added.

Malformed JSON originally returned parser text and no request id. The rate-limit body did not use the API error envelope. Both were corrected and retested.

The customer journey that remains is the local catalog, in-memory cart, simulated checkout, and catalog-grounded assistant. A successful live Gemini response was not captured. PostgreSQL was not stopped, so a live database outage was not observed. The health failure path was verified by an automated stub.

## Testing conclusion

The recorded local customer journey works for browsing, search, the in-memory cart, fictional checkout, stock rejection, and catalog-grounded assistant answers. The original failed cases were retested and passed. The application is not claimed to be free of every defect: F-07 remains, a live model success was blocked, and a stopped database was not tested.

## Final records after the 9 November smoke test

These rows were present after TC-21. No order was deleted during that smoke test.

| Order | Status | Total | Item |
|---|---|---:|---|
| 2 | PENDING | 650 | Wireless Mouse × 1 at 650 |
| 6 | PENDING | 900 | USB-C Study Lamp × 1 at 900 |
| 7 | PENDING | 3700 | Compact Mechanical Keyboard × 2 at 1850 |
| 8 | PENDING | 900 | USB-C Study Lamp × 1 at 900 |
| 9 | PENDING | 650 | Wireless Mouse × 1 at 650 |

Final stock: mouse 10, keyboard 6, lamp 8, webcam 6, stand 9, headset 7. All six products remained active.

## Release smoke test, 12 November 2026

Recorded from the local release candidate. Frontend http://localhost:5173. API http://localhost:3000. `npm run dev` was already running. `npm run db:seed` was not run.

Starting catalog, confirmed with `GET http://localhost:3000/api/products` before checkout:

| ID | Product | Price | Stock |
| --- | --- | ---: | ---: |
| 1 | Wireless Mouse | ₱650.00 | 7 |
| 2 | Compact Mechanical Keyboard | ₱1,850.00 | 6 |
| 3 | USB-C Study Lamp | ₱900.00 | 8 |
| 4 | 1080p Webcam | ₱1,450.00 | 6 |
| 5 | Laptop Stand | ₱1,200.00 | 9 |
| 6 | USB Headset | ₱1,350.00 | 7 |

Orders already present, all `PENDING`: #2 total 650, #6 total 900, #7 total 3700, #8 total 900, #9 total 650, #10 total 650, #11 total 1300. The cart in the browser was empty. Screenshots are in `docs/quality/screenshots/2026-11-12/`.

### TC-61 API health

| Field | Record |
| --- | --- |
| Case and starting state | API already running on port 3000. PostgreSQL database `shopsmart` is reachable. No browser click is required. |
| Action and test data | From `C:\ShopSmart-Starter`, request `GET http://localhost:3000/api/health`. |
| Expected result | HTTP 200 and `{ "status": "ok" }`. The body does not include a connection string. The response allows the local frontend origin. |
| Observed result and evidence | HTTP 200, body `{"status":"ok"}`, `X-Request-ID: cbf7ed2d-c0af-4e85-b1bf-34a6c6a54ecb`, `Access-Control-Allow-Origin: http://localhost:5173`. |
| Decision | PASS |

### TC-62 Load the current catalog

| Field | Record |
| --- | --- |
| Case and starting state | Frontend and API running. Cart (0). Stock is the table above. |
| Action and test data | Open http://localhost:5173/. Wait until the six product cards replace the loading state. Compare the cards with `GET http://localhost:3000/api/products`. |
| Expected result | The page shows the same six active products, with the prices and stock in the starting table. |
| Observed result and evidence | The page showed Wireless Mouse ₱650.00, Only 7 left; Compact Mechanical Keyboard ₱1,850.00, Only 6 left; USB-C Study Lamp ₱900.00, Only 8 left; 1080p Webcam ₱1,450.00, Only 6 left; Laptop Stand ₱1,200.00, 9 in stock; USB Headset ₱1,350.00, Only 7 left. Categories were All, Accessories, Study, Video, and Audio. `GET /api/products` returned HTTP 200 and the same six rows. Screenshot `release-home.png`. |
| Decision | PASS |

### TC-63 Cart quantity and total

| Field | Record |
| --- | --- |
| Case and starting state | Home page loaded. Cart (0). Wireless Mouse is ₱650.00 with 7 units available. |
| Action and test data | On http://localhost:5173/, click **Add to cart** on the Wireless Mouse card. Click **Cart (1)** in the header. On http://localhost:5173/cart, change **Quantity** from 1 to 2. |
| Expected result | The header becomes Cart (2). The line shows ₱650 each and ₱1,300. Order summary shows Items 2 and Total ₱1,300. |
| Observed result and evidence | After the add, the header was Cart (1). After quantity 2, the header was Cart (2). The cart page showed Wireless Mouse, ₱650 each, quantity 2, line ₱1,300, Items 2, Total ₱1,300. Screenshot `release-cart.png`. |
| Decision | PASS |

### TC-64 Simulated checkout with two mice

| Field | Record |
| --- | --- |
| Case and starting state | Cart contains one line: Wireless Mouse, quantity 2, total ₱1,300. Mouse stock is still 7. Orders #2 and #6 through #11 already exist. |
| Action and test data | On http://localhost:5173/cart, click **Proceed to checkout**. On http://localhost:5173/checkout, enter Full name `Carmen Flores`, Email address `carmen@example.com`, and Delivery address `88 Sample Street, Angeles City`. Confirm Amount due is ₱1,300. Click **Place simulated order**. Do not run `npm run db:seed`. |
| Expected result | One new order is stored as `PENDING` with total 1300 and unit price 650 from the database. The cart becomes Cart (0) only after success. Mouse stock becomes 5. The earlier orders and the other five stock values stay unchanged. No payment is collected. |
| Observed result and evidence | The button changed to **Submitting order…**, then the page showed `Thank you, Carmen Flores!`, order **#12**, Status `PENDING`, Total ₱1,300.00, and Cart (0). The form text was `No actual payment will be collected.` The API log was `POST /api/orders 201`. The stored order is product 1, quantity 2, unit price 650, total 1300. Mouse stock changed from 7 to 5. Keyboard stayed 6, lamp 8, webcam 6, stand 9, and headset 7. Orders #2, #6, #7, #8, #9, #10, and #11 remained `PENDING` with totals 650, 900, 3700, 900, 650, 650, and 1300. Screenshots `release-checkout.png` and `release-order.png`. |
| Decision | PASS |

### TC-65 Assistant recommendation when the provider fails

| Field | Record |
| --- | --- |
| Case and starting state | Cart (0) after order #12. Compact Mechanical Keyboard is still active at ₱1,850.00 with 6 units. The provider key is set on the API and is not entered in the browser. |
| Action and test data | Click **AI Assistant** in the header, or open http://localhost:5173/assistant. In **Your question**, enter `Which keyboard is below ₱2,000?`. Click **Ask ShopSmart**. When the answer appears, click **Compact Mechanical Keyboard — ₱1,850**. |
| Expected result | The answer names the Compact Mechanical Keyboard at ₱1,850 and links to that product. The product page shows ₱1,850.00 and 6 units. If Gemini fails, the page still shows that catalog answer and does not show a provider key. |
| Observed result and evidence | The button showed **Searching…**, then returned to **Ask ShopSmart**. The answer was `I found a keyboard within your ₱2,000 budget. Compact Mechanical Keyboard is currently available for ₱1,850.` The catalog source was Compact Mechanical Keyboard. The API log was `[assistant] falling back to catalog rules (PROVIDER_ERROR 503)` and `POST /api/assistant/questions 200` after 4408 ms. The link opened http://localhost:5173/products/2, which showed Accessories, Compact Mechanical Keyboard, ₱1,850.00, and 6 unit(s) available. No key appeared on the page. Screenshots `release-assistant.png` and `release-keyboard.png`. A successful live Gemini reply was still not captured, so TC-47 remains blocked. |
| Decision | PASS |
