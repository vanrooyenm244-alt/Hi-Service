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

## Stock category navigation

Stock Count has All, Gas, Plumbing, Aircon, Electrical, Gas appliance parts, HDPE, Gas Cages and Consumables buttons, with item counts and grouped headings. Category filtering combines with search and never clears the count draft. Water is shown as Plumbing. The category map follows STOCK list v2 / Hi-Service sorted (source ID and source descriptions in stock-category-source.json), with explicit legacy-description aliases for the existing stock list. The mapping is a 4 October snapshot; subsequent source-sheet categorisation changes require refreshing this mapping. Unknown future items retain their supplied category.

All 370 existing HiService_Stock rows were checked against the map. Category changes affect display only; quantities, codes, supplier costs and location totals stay in the existing stock backend. Eight tests pass including every source product, legacy aliases, category/search selection, no item mutation and draft recovery. Browser visual verification was unavailable because the execution environment has no installed browser binary.

## User privileges

Active Admin users can open Users and see each username with checkbox privileges for stock viewing/counting, totals, reports, item imports, transfer/receive/adjust, timesheets and cost estimation. Save privileges stores separate Hi Service grants in the shared backend. Navigation and action buttons follow the grants; mapped backend requests enforce them. Permissions refresh when the app opens; offline sessions use the last retrieved selection.

Deploy the complete updated Flagship-Solar/apps-script/Code.gs into the shared Apps Script project. It includes the permission catalog/storage/handlers and Hi Service GET/POST router calls. Keep HiService.gs in that project and deploy a new version of the current /exec URL. The checkbox screen cannot save until the shared Code.gs is deployed. No existing user rows or stock amounts were changed during development.
