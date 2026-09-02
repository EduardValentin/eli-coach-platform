# Draft — Manage Client Check-ins from the Coach Portal

**Status:** drafted, pending approval — not published to Linear. Two open decisions: (1) completion rule — recommended: a confirmed check-in counts as completed once its scheduled time passes (derived, no manual action); (2) PRD §7 rule 5 "auto-cancel after 2 rounds" — recommended: satisfied by preventing a third round plus decline-cancels, no time-based cancellation at MVP.
**Intended relations on publish:** parent GEN-175 (coach portal epic) · blocked by GEN-178 (coach portal shell), GEN-180 (browse clients — detail-page entry point), GEN-187 (client plan builder — recurring generation hooks plan creation) · related GEN-181 (coach dashboard). Also add a reminder to link the client-side check-in story (GEN-177) back to this one.

---

## User Story
As the coach, I want to review, approve, reschedule, and initiate client check-ins in one place, so that every client has a confirmed time to meet and nothing waiting on me slips through.

## Acceptance Criteria
- [ ] The coach navigation's "Schedule" link shows a badge with the pending count and opens the Check-ins page with Pending (count badge), Upcoming, and Past tabs, each with its own empty state (PRD §7 reqs 13–14; §5 Schedule/Check-ins page). Non-COACH users cannot access the page or its APIs.
- [ ] Each check-in card shows the client (avatar or initial, name), type (ad-hoc or recurring), date and time, the note or latest reschedule message, "linked to training plan" for recurring ones, and reschedule state — who proposed it, the previous time struck through while rescheduling, and the rounds used.
- [ ] On Pending, items the client proposed offer Approve (new request) or Accept (reschedule proposal), Reschedule while under the round limit, and Decline; items the coach proposed show an awaiting-response state. Approve/Accept confirms the check-in at the shown time, Decline cancels it, and the page reflects changes immediately (PRD §7 rules 3–6).
- [ ] From a client's detail page, Schedule Check-in opens a date/time picker with an optional note and creates a pending ad-hoc check-in awaiting the client (PRD §7 req 11).
- [ ] The picker — for initiating and rescheduling — disables past dates, offers hourly slots from 9 AM to 4 PM, and marks slots already holding a confirmed check-in as unavailable (PRD §7 rule 9, req 2).
- [ ] Proposing a reschedule moves the check-in to rescheduling, releases the original slot, records the proposer and optional note, and counts a round; a check-in allows at most 2 rounds — the action is unavailable and rejected beyond that — and declining a proposal cancels the check-in (PRD §7 rules 4–6).
- [ ] Creating a client's training plan generates 4 weekly auto-confirmed check-ins linked to that plan (default Wednesday 10 AM; weekly frequency fixed at MVP) (PRD §7 rule 2, reqs 21–23).
- [ ] Upcoming lists confirmed future check-ins chronologically; Past lists completed, declined, and cancelled ones with status labels.
- [ ] The dashboard's Pending Check-ins card and subtitle count show live data, and its Review action opens this page (PRD §7 req 15).
- [ ] Each request, approval, reschedule proposal, and cancellation records a notification for the other party (PRD §7 reqs 16–19); the coach's notification bell and the client-facing delivery arrive with their own stories.
- [ ] The visual design copies the prototype — layout, components, and interaction patterns match the reference screens listed in Source Context.

## Technical Notes
- Route `/coach/checkins`; register the "Schedule" link with its pending badge in the shell's navigation registry from GEN-178.
- Check-in records per the PRD §7 data model (type, status, source, initiator, proposer, reschedule count, previous slot, note/message, optional plan link); coach-role-authorized endpoints. The same state machine and slot rules will serve the client-side operations later.
- Availability = confirmed check-ins per date and hourly slot.
- Recurring generation hooks plan-instance creation from GEN-187, server-side and idempotent per plan.
- Record notifications in notification data only; no chat system messages (messaging is out of MVP).
- Reuse the prototype's calendar-plus-slot-list picker pattern with the optional message field.

## Source Context
- Prototype: `designs/react-reference-app/src/app/pages/coach-portal/CoachCheckins.tsx` (tabs, cards, actions, reschedule dialog), `components/DateTimePicker.tsx` (slot rules), `context/CheckinContext.tsx` (data model, state transitions, availability), `pages/coach-portal/ClientDetails.tsx` (Schedule Check-in dialog), `components/coach-portal/CoachSidebar.tsx` (Schedule badge), `pages/coach-portal/CoachDashboard.tsx` (pending card).
- PRD: §7 Check-in Scheduling System — data model, business rules 1–6 and 9, reqs 11–23; §5 Schedule/Check-ins page; Flows 12–13.
- Production: `apps/platform/src/routes.ts`, `apps/platform/src/surfaces/coach-portal/`.

## Out of Scope
- The client side: requests, responses to coach proposals, client reschedules, Join Meet, banner/widget, and the client Check-ins page (client portal epic).
- Every chat-embedded check-in experience — action cards in conversations, in-chat approve/decline, initiating from the messaging area, messages appearing in chat threads (messaging is out of MVP).
- The coach notification bell (notifications story); configurable check-in frequency (Later); Google Meet links (client-facing, mocked at MVP).
- Assessment-call bookings (sales & booking epic) — availability considers confirmed check-ins only.
