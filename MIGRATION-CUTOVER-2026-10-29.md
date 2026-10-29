# Google Sheets migration cutover — 2026-10-29

Status: **NOT CUT OVER**. Do not archive old backend or claim production migration complete.

## Verified Google Sheets destinations (Flagship Google account)
- Hi Service Stock destination: `1NQC_6mruzvJczvR_oQyZT__ImQ3RV4NLs8Uo3eUSAh8` (audit tabs are scaffolded; source stock not cut over).
- Hi Service Timesheets destination: `1sbNYYAA2kXA7net9MEeduOGNOtk3hjyBIoJfeVbDovU` (not yet cut over).
- Hi Service source staging stock: `14LGYSmY0TNGOqfaKEe3cnujE4FVApm1tu9vSWkHWxQs`.
- Count-history staging: `1Lwdpos3Uswtf97HRCJV3PbStJoJGiceIoo5nAh6arvc`.
- Movement-history staging: `1Zqc2R3GYGX7AN-9Oz-x6edj4W1Bp4SdyYQsoH7gWGhw`.

## Required safe cutover
1. Freeze/queue writes at a chosen cutover point and take immutable backups of the **actual currently bound** Apps Script spreadsheet(s).
2. Compare IDs, timestamps, row counts, and recent updates with migration staging. Import all late writes, without overwriting historical values.
3. Adapt backend to use explicit per-module `SpreadsheetApp.openById(id)` destinations (stock, counts, movements, timesheets) while retaining common authentication and logging. Existing backend uses `getActiveSpreadsheet()` and therefore still targets the old bound workbook.
4. Deploy the revised shared Apps Script project using authorized clasp/App Script API credentials and the existing deployment ID. GitHub Pages deployment alone does not update the backend.
5. Run authenticated tests of create/read/correct: Hi Service stock count, receive, transfer, adjustment, stock report, and time entries; independently test Flagship stock and timesheets.
6. Verify each write appears **only in its intended new workbook**, and old workbook row counts stay unchanged. Verify before snapshot, physical count and variance reporting.
7. Roll back routing on failure and replay queued writes idempotently. Archive old spreadsheets only after reconciliation and sign-off.

**Safety:** No test stock quantities should be written to real inventory. Use disposable test item IDs and remove them with audited corrections. Never overwrite baseline counts without manager approval.
