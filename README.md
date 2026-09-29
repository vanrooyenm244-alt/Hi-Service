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
