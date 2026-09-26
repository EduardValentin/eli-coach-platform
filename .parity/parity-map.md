# Parity map

Prototype app: designs/react-reference-app
Real app: apps/platform

This file lives at `.parity/parity-map.md` and is committed with the code.
It holds one row per root pair the project has ever verified, not per
session. Ids are stable and never reused: a new pair takes the next free
`C<n>` even when an earlier row was deleted. The implementer adds and edits
rows as the work progresses; the parity verifier reads this file and never
writes it.

The prototype component is the React component name the root finder resolves
at runtime, or `root:<selector>` to address the prototype side by selector.
The real app root is a CSS selector, or the value of a `data-parity-root`
attribute the real app sets on that element; a surface built under the
workflow carries that attribute, so its row uses the value. Routes are the
real app route, then the prototype route. States are comma-separated names,
each optionally followed by an action recipe file name in parentheses that
lives under `.parity/parity-actions/`, next to this map. Viewports is empty
for the full viewport set or a comma-separated `WxH` subset. Ignore is empty
or semicolon-separated
`proto:` and `real:` entries, each `hook:<data-parity value>` or
`path:<snapshot path prefix>`; only the implementer adds them, because they
change what is verified. Confidence is `obvious` for a name match, or
`confirmed` when the pairing was checked by hand or the real root carries
`data-parity-root` for that component. Source file locators belong in Notes.
Run `parity_map.py check .parity/parity-map.md` before the parity step.

| Id | Prototype component | Real app root | Routes (real → prototype) | States | Viewports | Ignore | Confidence | Notes |
|---|---|---|---|---|---|---|---|---|
| C1 | PortalPageHeader | [data-parity-root="CoachGreeting"] header | /coach → /coach | default | | | confirmed | Prototype `PortalPageHeader.tsx` rendered by `CoachDashboard.tsx`; real coach-portal home wraps `PortalPageHeader` from `@eli-coach-platform/ui/portal` (plan E3); subtitle count hooked `data-parity="today-count"` both sides. Root preflight now compares tags: this row must resolve to the `<header>` element inside `[data-parity-root="CoachGreeting"]`, not a wrapper. |
| C2 | PortalPageHeader | [data-parity-root="CoachAssessmentCallsHeader"] header | /coach/assessment-calls → /coach/assessment-calls | default | | | confirmed | Real `surfaces/coach-portal/pages/assessment-calls.tsx` (moved from `features/assessment-calls/ui/coach/assessment-calls/assessment-calls-page.tsx` in GEN-200; plan E6). Root preflight now compares tags: this row must resolve to the `<header>` inside `[data-parity-root="CoachAssessmentCallsHeader"]`, not a wrapper. |
| C3 | PortalPageHeader | [data-parity-root="CoachSettings"] header | /coach/settings → /coach/settings | default | | | confirmed | Real `features/assessment-calls/ui/coach/settings/settings-page.tsx` (plan E10). Root preflight now compares tags: this row must resolve to the `<header>` inside `[data-parity-root="CoachSettings"]`, not a wrapper. |
| C4 | UpcomingAssessmentCalls | [data-parity-root="UpcomingCallsWidget"] | /coach → /coach | default, empty, today row | | | confirmed | Prototype `UpcomingAssessmentCalls.tsx` on `PortalWidget`; real `dashboard/upcoming-calls-widget.tsx` on `PortalWidget` (plan E4). Names differ; same surface. |
| C5 | AssessmentCallsSection | [data-parity-root="AssessmentCallsSection"] | /coach/assessment-calls → /coach/assessment-calls | default all tab, past tab active, empty no calls, empty filters active, search field focus-visible, pager page 2, status select open (open-status-filter.json), status filter active, empty status filter | | | confirmed | Real `features/assessment-calls/ui/coach/assessment-calls/assessment-calls-section.tsx` (plan E7) composed by `surfaces/coach-portal/pages/assessment-calls.tsx`, whose `toolbarFilter` slot renders the Status select from `features/coaching-sales/ui/coach/sales-status-filter.tsx` (GEN-200); covers tabs, Status select, search, sort, list, pager, empty state. Hooks both sides: Select trigger `data-parity="status-filter"`, each option's count badge `data-parity="status-count-<any\|held\|payment-link-sent\|paid>"`. The open listbox is portalled outside the root, so "status select open" snapshots the root with the trigger expanded; the option badges are reached by their hooks. |
| C6 | AppointmentCard | [data-parity-root="AppointmentCard"] | /coach/assessment-calls → /coach/assessment-calls | upcoming card, today card, past card, card hover, past card link sent, past card paid | | | confirmed | Real `packages/ui/src/appointments/appointment-card.tsx` (plan Part D). Since GEN-200 an ended card carries the sales-state badge (`data-parity="sales-state"`, `features/coaching-sales/ui/coach/call-sales-state-badge.tsx`) and the payment-link action (row C12) through the section's `renderEndedCallExtras` slot; "past card" is the held state. |
| C7 | SortControl | [data-parity-root="SortControl"] | /coach/assessment-calls → /coach/assessment-calls | default, direction toggle pressed, toggle hover, trigger focus-visible | | | confirmed | Plan E8. Real root carries `data-parity-root="SortControl"`. |
| C8 | AssessmentCallSettingsSection | [data-parity-root="AssessmentCallSettingsSection"] | /coach/settings → /coach/settings | clean form save disabled, dirty form save enabled, meeting link empty warning, day chip selected and unselected, chip and input focus-visible, save hover | | | confirmed | Plan E11 on `SettingsSection`. Real root carries `data-parity-root="AssessmentCallSettingsSection"`. |
| C9 | CoachSidebar | [data-parity-root="PortalShell"] aside > div | /coach → /coach | desktop sidebar default, active link, inactive link hover, mobile top bar | | | confirmed | Prototype `CoachSidebar.tsx` inside `CoachLayout.tsx`; real `packages/ui/src/layout/portal-shell.tsx` composed by `surfaces/coach-portal/shell/layout.tsx` (plan B9, E2). Split from the former combined C9 row (sidebar surface + mobile drawer): this row is the persistent sidebar / mobile top-bar surface; the mobile drawer overlay is row C11. Prototype nav items absent from production (messages, clients, check-ins, training, nutrition) are out of scope; compare the shared items and link styling. |
| C10 | JoinCallLink | [data-parity-root="JoinCallLink"] | /coach → /coach | live join link, default join link, join link hover and focus-visible | | | confirmed | Prototype `JoinCallLink.tsx`; real `features/assessment-calls/ui/coach/join-call-link.tsx` (plan E5). Also verified on /coach/assessment-calls → /coach/assessment-calls (default join link, hover/focus-visible); a map row holds one route pair, so /coach is recorded here. |
| C11 | CoachSidebar | [role="dialog"] | /coach → /coach | mobile drawer open | | | confirmed | Split from the former combined C9 row: the mobile drawer overlay opened from CoachSidebar's mobile top bar (plan B9 link anatomy inside drawer, D2 portal scope). Real `packages/ui/src/layout/portal-shell.tsx` renders the drawer via `[role="dialog"]`. See C9 for the persistent sidebar surface. |
| C12 | CallJourneyActions | [data-parity-root="CallJourneyActions"] | /coach/assessment-calls → /coach/assessment-calls | send link action, re-send link action, action hover (hover-payment-link-action.json) | | | confirmed | Prototype `components/coach-portal/CallJourneyActions.tsx` (RowActionButton hooked `data-parity="payment-link-action"`); real `features/coaching-sales/ui/coach/payment-link-action.tsx` on `Button variant="outline" size="xs"` (GEN-200). The first ended card on the page must be in the named sales state on both sides. |
| C13 | ConfirmDialog | [data-parity-root="ConfirmDialog"] | /coach/assessment-calls → /coach/assessment-calls | send dialog open (open-send-dialog.json), re-send dialog open (open-send-dialog.json) | | | confirmed | Prototype `components/ui/confirm-dialog.tsx` on `ui/dialog.tsx`; real `packages/ui/src/overlays/confirm-dialog.tsx` (GEN-200). Portalled to `body`; confirm and cancel buttons hooked `data-parity="confirm"` / `data-parity="cancel"` both sides. The recipe opens the dialog from the first `payment-link-action`, so that card must be held (send) or link sent (re-send). |
