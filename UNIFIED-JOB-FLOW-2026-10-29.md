# Unified Job Flow — implementation contract (2026-10-29)

Status: design contract and backlog. **Not yet production-deployed or end-to-end tested.**

## Core principle
- One login/user directory and **one combined technician calendar**. An employee such as Jacobus can be scheduled by either company and open both jobs in one app.
- Each job has an immutable `job_id` and `company_id` (FLAGSHIP_SOLAR or HI_SERVICE) set by the scheduler and enforced server-side.
- The two companies' operational sheets, timesheets, stock, quotations, invoices, Xero tenants and reports are strictly separate. A technician's hours are **not automatically split** across companies. Each actual timesheet entry is associated with its originating job/company only.
- A common Quote–Job List is an index, **not a shared financial ledger**. Its rows include company, client and links to permitted company-owned records.

## Job master schema
`job_id, company_id, client_id, first_name, last_name, street_address, area, email, phone, service_type, description, assigned_user_ids, scheduled_start, scheduled_end, site_visit_url, before_photo_urls, estimate_id, estimate_pdf_url, estimate_status, accepted_at, accepted_by, preferred_slot, confirmed_slot, invoice_id, invoice_url, invoice_amount, payment_status, receipt_photo_url, job_card_id, job_status, created_at, updated_at`.

## Hi Service flow
1. Scheduler creates client/job with name, surname, address, area, email, phone, job description and company=HI_SERVICE.
2. App searches **the correct Xero tenant's contacts**, offers verified match, or creates a new contact with minimum name and optional email/phone/address; record returned `ContactID` and `tenant_id`. Never create blind duplicates or leak other tenant contacts.
3. Scheduler assigns Jacobus; the job is on his combined calendar with Hi Service label and job link.
4. Technician opens job, reviews preparation notes/material needs, takes site-visit photos, records description.
5. `Prepare Cost Estimation` loads recipe (e.g. Cupboard Installation), generates cost lines and estimate PDF; attach list of materials, document and estimate status to job.
6. Shared PDF links to a secure, expiring, signed customer portal (not an interactive PDF itself): customer reviews and explicitly accepts; server logs signature, version, timestamp, IP only if lawful/necessary, and acceptance receipt. Customer requests/selects only genuinely free appointment slots. Prevent double booking and confirm booking server-side.
7. Correct-company Xero invoice created only from accepted authorised quote and correct Xero ContactID; store invoice ID, amount, URL, state. Handle API errors and idempotency.
8. Technician sees authorised invoice amount inside assigned calendar job; records paid amount/method and uploads till/terminal receipt photo. Reconcile actual payment before marking as paid.
9. Quote–Job List updates state and safe invoice/document links; authorised staff can navigate from job to relevant company records.

## Flagship Solar flow
Shared client, Xero contact, job ID, scheduler and calendar. Company-specific workflow: site visit (before photos) -> value proposal -> quote -> customer acceptance -> scheduling -> invoice -> job card -> SSEG reports where applicable.

## Timesheet controls
Separate company-specific Timesheets, approvals, audit and edits. A company is bound to each job/timesheet entry. A technician sees combined assigned jobs; admin reviews per-company entries. Corrections preserve original values, reviewer and reason. No automatic splitting of shifts.

## Migration prerequisites
- Reconcile **latest** writes from old bound Apps Script workbook and staged/new Sheets, not only snapshot counts.
- Complete explicit per-module destination mapping and tenant-safe Xero credentials.
- Implement schemas and routes in shared Apps Script, keep existing API backward compatibility, test authentication and company permission checks.
- Validate each scenario with API tests and a real authorised write/read to the destination sheets; verify old sheet unchanged, then deploy.
- Never claim cutover until authenticated end-to-end tests pass.

## Initial build slices
A. Central job ID and contacts + Xero contact lookup/create with two-tenant isolation.
B. Job list -> combined calendar -> assigned technician -> site visit photos.
C. Hi Service recipe -> PDF -> customer acceptance -> available slot selection.
D. Xero invoice -> secure view -> receipt photo -> job closure.
E. Flagship value proposal/job card integration; timesheet separation and approval migration.

## Existing code verification
Flagship `apps-script/Code.gs` already has `xeroContacts_` and `xeroCreateContact_` endpoint. This must be integrated and verified against the selected company tenant, not presumed to work for both companies. Hi Service UI lacks a confirmed dedicated Xero-contact creation integration. Production availability is not verified.
