# Hi Service TimeTree calendar

This branch adds a read-only Calendar module to Hi Service. Bookings are made and
changed in TimeTree, then mirrored into the shared Apps Script backend. Date/time,
technician, location, calendar name and notes appear in the calendar; the original
booking opens through its TimeTree link. Job-card and stock actions are deferred.

Deploy together with the TimeTree branch in `vanrooyenm244-alt/Flagship-Solar`.
Follow that repo's `TIMETREE-SETUP.md`: add `TimeTree.gs` and `TimeTreeSync.gs`,
replace the shared `Code.gs`, retain `HiService.gs`/`Stock.gs`, configure credentials
privately, run the initial import and install the native 15-minute timer, then deploy
a new version of the existing `/exec` deployment.

Both business calendars default to both apps; personal calendars are excluded.
Existing saved explicit Hi Service grants require enabling `calendar.view` in the
Users screen. Backend permissions and Worker attendee assignment still apply.

The connector keeps raw source archives and prior revisions, never deletes an
unseen booking, and never changes stock/timesheets/manual bookings. Comments and
attachment files stay in TimeTree; their content is not copied in this phase.
Calendar responses from a previous signed-in account are discarded.

GitHub/frontend deployment alone does not activate live synchronization. The existing
Google Apps Script project needs an owner/editor session. The standalone read-only
scraper in Flagship can support an Excel exporter in the next phase.
