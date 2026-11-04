# Unified Job Flow — implementation contract (2026-10-29)

Status: design contract and backlog. **Not yet production-deployed or end-to-end tested.**

## Core principle
- One login/user directory and **one combined technician calendar**. An employee such as Jacobus can be scheduled by either company and open both jobs in one app.
- Each job has an immutable `job_id` and `company_id` (FLAGSHIP_SOLAR or HI_SERVICE) set by the scheduler and enforced server-side.
- The two companies' operational sheets, timesheets, stock, quotations, invoices, Xero tenants and reports are strictly separate. A technician's hours are **not automatically split** across companies. Each actual timesheet entry is associated with its originating job/company only.
- A common Quote–Job List is an index, **not a shared financial ledger**. Its rows include company, client and links to permitted company-owned records.

## Job master schema
`job_id, company_id, client_id, first_name, last_name, street_address, area, email, phone, service_type, description, assigned_user_ids, scheduled_start, scheduled_end, site_visit_url, before_photo_urls, estimate_id, estimate_version, estimate_pdf_url, estimate_status, acceptance_token_hash, acceptance_expires_at, accepted_at, accepted_by, signature_name, signature_file_url, signature_captured_at, installation_duration_minutes, next_available_slot, preferred_slot, confirmed_slot, xero_quote_id, xero_quote_url, invoice_id, invoice_url, invoice_amount, payment_status, receipt_photo_url, job_card_id, job_status, created_at, updated_at`.

## Hi Service flow
1. Scheduler creates client/job with name, surname, address, area, email, phone, job description and company=HI_SERVICE.
2. App searches **the correct Xero tenant's contacts**, offers verified match, or creates a new contact with minimum name and optional email/phone/address; record returned `ContactID` and `tenant_id`. Never create blind duplicates or leak other tenant contacts.
3. Scheduler assigns Jacobus; the job is on his combined calendar with Hi Service label and job link.
4. Technician opens job, reviews preparation notes/material needs, takes site-visit photos, records description.
5. `Prepare Cost Estimation` loads recipe (e.g. Cupboard Installation), generates cost lines and estimate PDF; attach list of materials, document and estimate status to job.
6. The estimate PDF contains an optional, admin-editable company promotion block when the page has enough unused space. Its copy can advertise services such as solar, gas geysers and electrical work, and links to the correct company landing page. Keep the estimate, terms and acceptance action clear; do not cover or displace them.
7. The PDF's **Accept estimate** link opens a secure, expiring customer page bound to one job and one immutable estimate version. The page shows the company, job, estimate and promotion/landing-page link. The customer enters their name and signs in the signature area, then submits explicit acceptance. Store the exact estimate version, signer name, signature file/reference, timestamp and an acceptance receipt. Collect IP only if lawful and necessary. A reissued or changed estimate must be treated as a new version.
8. After the signature is recorded, the page checks availability on the selected company's installation calendar and shows the next genuinely open installation date and available slots. Availability must account for existing bookings, company, technician/team capacity and the job's estimated installation duration. The customer selects a slot; reserve it atomically and confirm it on the calendar to prevent double booking. Never reveal other customers' booking details.
9. After acceptance, create a draft quote in the correct company's Xero tenant from the accepted estimate and verified ContactID; save the Xero quote ID and link in the Quote–Job List. An authorized manager can adjust it in Xero. If the adjustment changes what the customer accepted, issue a new estimate/quote version for customer approval before treating it as accepted.
10. When the technician marks the installation complete, create the Xero invoice from the confirmed quote, save its ID/link and amount in the Quote–Job List, and make the invoice and job-card PDF available to share with the customer. Handle Xero errors and retries idempotently.

## Flagship Solar flow
Shared client, Xero contact, job ID, scheduler and calendar. Company-specific workflow: site visit (before photos) -> value proposal/estimate -> branded PDF with optional promotion -> signed customer acceptance -> show/reserve next available installation slot where online scheduling is enabled -> Xero draft quote -> technician job card -> invoice -> SSEG reports where applicable. If customer-selected booking is unavailable for a Flagship job, retain manager-controlled scheduling and show that choice on the customer page.

## Customer acceptance page and calendar rules
- A customer reaches the page from a unique, expiring link in the PDF. The link is scoped to one job and one estimate version; it cannot reveal other jobs or Xero data.
- The acceptance page presents the estimate, company identity, editable promotion content and signature field. Acceptance records the signer, exact version and timestamp and returns a receipt.
- Immediately after signing, show the next open installation date for that company's calendar, then let the customer choose one available slot. The backend rechecks and reserves the slot in one operation; a stale or already-taken slot is rejected and refreshed.
- Availability is calculated using company calendar events, working hours, crew capacity and the job's duration. Only open slots are exposed. A company/admin setting can disable customer booking for jobs that require manual scheduling, including Flagship cases where it is not suitable.
- The promotion copy, service list, call-to-action and landing-page URL are editable by an authorized manager. The PDF promotion is included only when there is enough free page space; the landing page remains reachable from the acceptance page.

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
