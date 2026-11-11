# ShopSmart browser cases — 11 November 2026

Environment: local. Frontend http://localhost:5173. API http://localhost:3000.  
Customer data is fictional. One simulated order was created: order #10 for Luis Garcia.  
The screenshots from this run were later removed after they were included in the complete document.

Starting stock from `GET /api/products`: mouse 10, keyboard 6, lamp 8, webcam 6, stand 9, headset 7. All active. Health was `{ "status": "ok" }`.

No defect was reproduced, so no application code was changed and no new automated test was added.

## Browse and search

### Load the catalog

| | |
|---|---|
| Expected | Six active products load, with name, price, and stock. |
| Observed | Six cards. Wireless Mouse ₱650.00, 10 in stock. Compact Mechanical Keyboard ₱1,850.00, Only 6 left. USB-C Study Lamp ₱900.00, Only 8 left. 1080p Webcam ₱1,450.00, Only 6 left. Laptop Stand ₱1,200.00, 9 in stock. USB Headset ₱1,350.00, Only 7 left. Cart (0). Screenshot `browse-catalog.png`. |

### Search `keyboard`

| | |
|---|---|
| Expected | Only Compact Mechanical Keyboard. |
| Observed | The page showed that keyboard at ₱1,850.00, Only 6 left. Other cards were gone. Screenshot `browse-search-keyboard.png`. `GET /api/products?search=keyboard` and `?search=KEYBOARD` each returned HTTP 200 with only product 2, price 1850, stock 6. |

### Search with no match

| | |
|---|---|
| Expected | No product cards, and a message that nothing matched. |
| Observed | Search text `Ultra Gaming Laptop X`. The page showed `No products match your filters.` and no cards. Screenshot `browse-search-none.png`. `GET /api/products?search=Ultra%20Gaming%20Laptop%20X` returned HTTP 200 and `{ "products": [] }`. |

## Cart

The cart is in-memory. Refresh is expected to clear it. The mouse price used below is ₱650. Stock known to the line was 10.

| Action | Expected | Observed |
|---|---|---|
| Start | Cart (0) | Cart (0) |
| Add Wireless Mouse | Cart (1) | Cart (1). Message: `Wireless Mouse was added to your cart.` |
| Add the mouse again | Quantity 2, line and total ₱1,300 | Cart (2). Cart page: ₱650 each, line ₱1,300, Items 2, Total ₱1,300 |
| Set quantity to 3 | Items 3, line and total ₱1,950 | Cart (3), line ₱1,950, Items 3, Total ₱1,950 |
| Set quantity to 11 | Quantity stays 3. Total stays ₱1,950. Stock message | Quantity stayed 3. Items 3. Total ₱1,950. Message: `Only 10 unit(s) are available.` Screenshot `cart-qty3-overstock.png` |
| Set quantity to 1 | Items 1, total ₱650 | Cart (1), Items 1, Total ₱650 |
| Remove | Empty cart, count 0 | `Your cart is empty`. Cart (0) |
| Add the mouse, then reload `/` | Cart clears | Cart (1) before reload. Cart (0) after reload |

## Checkout

Cart before the form checks: one Wireless Mouse, Total ₱650, Cart (1). Mouse stock was still 10.

### Empty form

| | |
|---|---|
| Expected | The form does not submit. The cart stays. |
| Observed | Name, email, and address each reported `Please fill out this field.` Cart (1). Total ₱650. No request to `/api/orders`. |

### Invalid email

| | |
|---|---|
| Expected | Invalid details are refused. No order. |
| Observed | Name `J`, email `not-an-email`, address `short`. The browser showed `Please include an '@' in the email address. 'not-an-email' is missing an '@'.` Cart (1). Total ₱650. No request to `/api/orders`. Screenshot `checkout-invalid.png`. |

### Name that reaches the API

| | |
|---|---|
| Expected | The API refuses a one-character name. Stock and cart stay unchanged. |
| Observed | Name `J`, email `luis@example.com`, address `123 Sample Street, Angeles City`. The page showed `Check the customer and cart information.` Cart (1). Total ₱650. Screenshot `checkout-rejected-name.png`. The captured response was HTTP 422 `{"error":{"code":"INVALID_ORDER","message":"Check the customer and cart information.","details":{"formErrors":[],"fieldErrors":{"customerName":["Too small: expected string to have >=2 characters"]}}}}`. Mouse stock stayed 10. |

### One valid simulated order

| | |
|---|---|
| Expected | One order, status `PENDING`, total ₱650 from the database price, cart clears only after success, mouse stock becomes 9. |
| Observed | Name `Luis Garcia`, email `luis@example.com`, address `123 Sample Street, Angeles City`. HTTP 201. Confirmation: `Thank you, Luis Garcia!`, order #10, Status `PENDING`, Total ₱650.00, Cart (0). Screenshot `checkout-order-10.png`. Response body: `{"id":10,"customerName":"Luis Garcia","email":"luis@example.com","address":"123 Sample Street, Angeles City","status":"PENDING","total":650,"items":[{"id":10,"orderId":10,"productId":1,"quantity":1,"unitPrice":650}]}`. `GET /api/products/1` stock changed from 10 to 9. No second order was returned. |

## Stock

| | |
|---|---|
| Expected | A quantity above the product stock is refused. The cart total and the stored stock do not change. |
| Observed | With mouse stock 10, the cart rejected quantity 11 and stayed at quantity 3, total ₱1,950, message `Only 10 unit(s) are available.` `POST /api/orders` for Ana Reyes, `ana@example.com`, `123 Sample Street, Angeles City`, product 1, quantity 11 returned HTTP 409 `{"error":{"code":"INSUFFICIENT_STOCK","message":"Only 10 unit(s) of Wireless Mouse are available."}}`. Stock before and after that request was 10. |

## Assistant

### Keyboard under ₱2,000

| | |
|---|---|
| Expected | Compact Mechanical Keyboard at ₱1,850, with a link to that product. |
| Observed | Question: `What keyboard can I buy under ₱2,000?` Loading ended. Answer: `I found a keyboard within your ₱2,000 budget. Compact Mechanical Keyboard is currently available for ₱1,850.` Link text `Compact Mechanical Keyboard — ₱1,850`. Source link `Compact Mechanical Keyboard`. Screenshot `assistant-keyboard.png`. HTTP 200 body recommended product id 2, price 1850, category Accessories, link `/products/2`, source `{ "type": "product", "id": 2, "name": "Compact Mechanical Keyboard" }`. Opening the source went to `/products/2` and showed Accessories, Compact Mechanical Keyboard, ₱1,850.00, 6 unit(s) available. The server log for this call was `falling back to catalog rules (PROVIDER_TIMEOUT)` after 8065 ms. The visible answer still used the catalog price and the correct product. |

### No catalog match

| | |
|---|---|
| Expected | An honest no-match. The Laptop Stand is not recommended. |
| Observed | Question: `Do you have an Ultra Gaming Laptop X?` Loading ended. Answer: `I couldn't find an in-stock product. You may want to try a different product name or category.` The page also showed `No matching products are currently available.` No product link and no catalog source. Screenshot `assistant-no-match.png`. HTTP 200 body: `{"answer":"I couldn't find an in-stock product. You may want to try a different product name or category.","recommendedProducts":[],"sources":[]}`. |

## Failure

### AI provider timeout

| | |
|---|---|
| Expected | Loading ends. The page shows a catalog fallback rather than an endless spinner. |
| Observed | The keyboard question above showed `Searching…`, then the button returned to `Ask ShopSmart` and the catalog answer appeared. Server log: `[assistant] falling back to catalog rules (PROVIDER_TIMEOUT)`. Reproduction: ask `What keyboard can I buy under ₱2,000?` on `/assistant` while the provider does not answer within the server timeout. |

### API unavailable

| | |
|---|---|
| Expected | Loading ends. The catalog and the assistant each show a message instead of staying on the loading state. |
| Observed | Browser requests to `http://localhost:3000/*` were blocked, then `/` was reloaded. The loading line disappeared. The catalog showed `Failed to fetch Make sure the backend is running.` and no product cards. Screenshot `failure-api-blocked.png`. On `/assistant`, the question `What keyboard can I buy under 2000?` left the searching state and showed `ShopSmart is unavailable right now. Please try again.` Screenshot `failure-assistant-blocked.png`. After the block was removed, a reload of `/` showed Wireless Mouse again and the fetch error was gone. |

Reproduction for the blocked-API check:

1. Block browser requests to `http://localhost:3000/*`.
2. Open http://localhost:5173/ and wait until the loading line is gone.
3. Open http://localhost:5173/assistant and ask a question of at least 3 characters.
4. Remove the block and reload `/`.

## Stock after this run

Mouse stock is 9 because order #10 bought one. Keyboard 6, lamp 8, webcam 6, stand 9, headset 7. Order #10 remains `PENDING`.
