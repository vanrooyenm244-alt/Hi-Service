# Hi Service Operations

Current build branch: `stock-count`.

## V1 scope
- Stock Count per location: Stoor, CEY 59799, CEY 67212
- Stock Overview with Total Stock
- Add/import stock items
- Transfer stock between store and vehicles / vehicle to vehicle
- Stock adjustments
- Stock received against invoice/reference
- Hi Service timesheets
- Same Google Apps Script project as Flagship, but separate Hi Service sheets

## Google Apps Script setup
Copy `google-apps-script/HiService.gs` into the existing Flagship Apps Script project.

In `doGet()`, before the final unknown-action response:
```js
var hg = hiServiceGet_(p, body); if (hg) return hg;
```

In `doPost()`, before the final unknown-action response:
```js
var hp = hiServicePost_(body); if (hp) return hp;
```

Run `setupHiService()` once. It creates:
- HiService_Stock
- HiService_Stock_Counts
- HiService_Stock_Movements
- HiService_Timesheets

Then deploy a new Apps Script version. The Hi Service app can use the same /exec URL and user accounts as Flagship.

## Invoice reading
CSV invoice lines can be loaded and reviewed now. PDF/photo automatic invoice extraction is intentionally not allowed to update stock until a document-reading/OCR service is connected and the user confirms the extracted lines.

## Durable stock counts (4 October 2026)

Counted items appear above the list. Drafts are saved per user and location, including zero counts, and survive closing/reopening. Send to Sheet uploads batches of 20 and shows confirmed progress. Unknown, invalid or unconfirmed counts remain saved for correction/retry. Count history now records Old and Movement as extra columns; existing historical rows show an unavailable movement rather than inventing one. The existing Stock Report date selector and Print/Save PDF flow retrieves the central history.

Deploy the updated `google-apps-script/HiService.gs` into the existing shared Apps Script project and deploy a new version. The frontend alone cannot add the backend count audit columns. New journal tests: 3/3 passed. Live deployment/mobile UI verification remains outstanding.
