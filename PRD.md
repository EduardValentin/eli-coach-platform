# Product Requirements Document

## Product Summary

Evoa is a premium, women-focused fitness and nutrition platform for a personal trainer who offers 1-on-1 online coaching, tailored workout plans, menstrual-cycle-aware nutrition guidance, educational content, and digital products. It supports public discovery and private coaching workflows. The experience feels warm, premium, elegant, and modern while staying accessible, responsive, and grounded in one design system.

This document is the source of product behavior, business rules, and vocabulary. It is decomposed into epics and user stories in Linear, which owns delivery scope and sequencing.

## Goals

- Convert visitors into booked assessment calls through a high-quality landing page.
- Support invite-only onboarding into paid 1-on-1 coaching.
- Give the coach operational tools to manage clients, create exercises, build multi-week plans, assign plans, and communicate with clients.
- Give clients a clear, supportive portal to follow their assigned plan and adjust scheduling within allowed constraints.
- Sell free and paid digital products through a digital store.
- Maintain a premium, human brand voice and consistent design system across the experience.

## Non-Goals

- Automatic training prescription. The coach stays in control of formulas, exercise prescription, and deload adjustments.
- Admin roles beyond the coach, community or social features, and advanced analytics.
- Video calling inside the product. Check-ins meet on Google Meet.

## Users

**Visitor.** A woman discovering the coach through the public site. She can browse the landing page, blog, pricing, and store, create an account, and acquire store products. She can see 1-on-1 coaching bundles but cannot check out for coaching without the unique token issued after an assessment call.

**Customer.** Any signed-in account. Every account starts as a customer and can use the Library of owned store products. A customer becomes a client only through coach onboarding.

**Client.** An invited, paying customer with an active coaching subscription. She uses the client portal to receive assigned plans, follow and log workouts, message the coach, schedule check-ins, track her menstrual cycle, and adjust her schedule within allowed limits. Clients with a regular cycle and clients without an active cycle (amenorrhea, post-menopause, hormonal contraception) receive the same level of personalized coaching.

**Coach.** The trainer running the business. She uses the coach portal to onboard clients, set calorie and macro targets per client, chat, create exercises, build and assign plans, manage check-ins, and review client workouts and cycle data.

## Product and Brand Principles

The product consistently feels premium, elegant, warm, supportive, women-focused, competent, trustworthy, clean, modern, responsive, and accessible, with one visual and interaction language across every area.

Brand voice is personal, human, empowering, supportive, and confident. It avoids generic AI-sounding phrases such as "unlock your potential", "world-class", "seamless experience", and "transformative", emoji-heavy copy, and excessive exclamation marks. Visual identity is documented in `DESIGN.md`.

## Reference Prototype

The product is modelled first in a reference prototype application before it is built in production. The prototype mocks every backend, auth, email, and payment dependency and carries a global Dev Toggle for switching between app states such as signed out, client, coach, bundle purchased, waiting list mode, and client needs onboarding. Those mocks and the Dev Toggle are prototype conventions, not product requirements. Production uses real authentication, persistence, and email. URLs in this document are production URLs.

---

# Business Rules

## Access and Roles

1. **Anyone can create an account.** Accounts are created and signed in with an email one-time code. A new account is a customer with no portal access.
2. **Client accounts are invite-only.** The coach onboards a client from the coach portal; the client then receives an invitation email to sign in.
3. **Client portal access requires invitation, an active subscription, and completed self-onboarding.** A client signing in before completing onboarding is sent to the onboarding wizard and cannot reach the portal until it is complete.
4. **Coach portal access is restricted to the coach role.** Signed-in accounts without the required role see a clear denied-access page.
5. **The Library is available to every signed-in account.**

## Coaching Sales

6. **Three coaching bundles: 1 Month, 3 Months, and 6 Months.** Longer commitments have lower per-month pricing; all bundles include the same benefits. Pricing is public, but checkout is available only through a unique token in the URL, sent by email after the assessment call.
7. **The 3- and 6-month plans have a 7-day cancellation window.** Within the first 7 days the client may cancel if coaching is not the right fit; afterwards the full term applies. The 1-month plan is month-to-month with no term commitment.
8. **The coach can see each client's subscription**: its term and whether it is active or expired.

## Waiting List

9. **Waiting list mode is a deployment setting.** While enabled, coaching CTAs are hidden and the free store and all landing page content stay available. An unset value means waiting list mode, the safe pre-launch state.
10. **Every accepted submission joins one waitlist; allocation determines pricing.** A limited number of reduced-price places exist. The allocation recorded at submission decides whether the visitor receives reduced pricing on every coaching bundle or regular pricing. Joining stays open after reduced-price places run out.
11. **Public availability is qualitative, delayed, and privacy-preserving.** Public surfaces show exactly one of "Reduced-price spots available", "Limited spots", or "Reduced-price spots closed", refreshed at fixed half-hour intervals. They never expose a count, progress toward capacity, or an immediate change after a submission. Reduced prices and promotional copy appear only while availability is "available" or "limited". If availability cannot be determined, a generic outage message is shown, signup stays open, and no reduced-price claim is made.
12. **Duplicate submissions look identical to new ones.** Re-submitting a registered email keeps its existing allocation, refreshes consent and retention, and sends no additional confirmation email. The browser shows the same generic confirmation and celebration for new and duplicate submissions.
13. **Validation, bot verification, and server failures are real error outcomes.** Invalid emails stay on the form for correction, bot-failed submissions are rejected, and server failures ask the visitor to retry and offer the support email. A newly accepted regular-pricing entrant receives a confirmation email stating that joining succeeded, reduced-price places were already full, and the signup does not include reduced pricing.

## Digital Store

14. **The store is public.** Products are free or paid, and each shows which it is. Product types include e-books, workout challenges, nutrition tips and recipes, workout plans, nutrition plans, and fat loss plans. Products can be inspected before acquisition and added to a persistent cart.
15. **Logged-out acquisition requires an email, acceptance of the current Terms, and bot verification.** The Privacy Policy is a linked notice, not a choice. Marketing consent is a separate, optional, unchecked choice that never blocks delivery.
16. **Outcomes are explicit.** An invalid email, failed bot verification, failed delivery, and server failure each produce a clear message, and failures keep the visitor's selections and details for retry. If a requested product is no longer available, the whole request is rejected, the cart drops the unavailable items, and the visitor is asked to review and retry. Successful free requests confirm the resources were sent to the email, without order or price framing.
17. **One delivery email per accepted request** offers a single primary download action for all granted resources. Download access is reached from that email, lasts seven days from each request, and can be revoked. Invalid, expired, or revoked links show one privacy-safe unavailable message that does not reveal what the link pointed to, and the visitor can request the resources again.
18. **Delivery is rate-limited per email address**: at most one delivery per minute and ten in any rolling 24 hours. Addresses differing only by a sub-address tag share one allowance. A declined request explains which limit was reached, records nothing, and keeps the visitor's selections. A delivery that fails or whose outcome is unknown does not consume the allowance.
19. **Ownership follows the verified email.** A signed-in customer's Library lists every product the account owns: paid purchases and free acquisitions, including guest acquisitions linked by verified email. Linking happens when a signed-in customer opens the Store or the Library, covers every address the account has verified including sub-address variants, repeats harmlessly, never duplicates ownership, and never interrupts the visit. An acquisition already linked to an account stays with it, so a closed account's purchases never pass to a later account created with the same address.
20. **The Library grants fresh download access to each owned product individually at any time**, independent of earlier delivery emails and their seven-day windows.

## Plans and Training

21. **A client has at most one active plan.** The coach must end the current plan before starting a new one. Past plans are preserved for history.
22. **Plans follow a template-instance model.** Plan Templates are reusable structures the coach creates, edits, copies, and deletes. Plan Instances are personalized plans assigned to one client and tied to one Goal. Templates are optional; a client plan can start from one or from scratch.
23. **Each plan instance is tied to a client Goal.** A Goal names the training objective (Muscle Building, Fat Loss, Strength, Recomposition, Maintenance, or Custom), has a start date, and moves from active to completed.
24. **Templates default to 4 weeks with 1 deload week.** The deload week is visually distinguished and prompts the coach to manually adjust volume and intensity. The system never auto-modifies plan variables.
25. **Plan building is iterative.** The coach may schedule 1–2 weeks at a time and add weeks incrementally to an active plan; the client's plan updates with each addition. The coach can insert a deload week at any position at any time.
26. **Existing weeks of an active plan are immutable.** Once a client has started, weeks already part of the plan cannot be deleted; only newly added weeks can be removed.
27. **Clients see only current and past weeks.** Weeks the coach has built ahead are hidden until the client reaches them.
28. **The coach sets a default schedule for each plan.** Clients may adjust it in ways that fit their needs, with limited flexibility rather than unrestricted restructuring.
29. **Workout logging records actual against prescribed.** Each set is tracked individually with actual weight and reps and compared with the prescription.
30. **Exercise swaps are coach-controlled.** Only the coach defines swap variants for an exercise assignment; during a workout a client may swap only to those variants. Swap history is recorded per workout.
31. **Rest time is coach-configured per exercise assignment, in seconds.** Clients can extend or skip the rest timer during a workout; both prescribed and actual rest are recorded.
32. **A workout is complete only when every prescribed set is logged.** Ending a workout early is an explicit action, after which the workout is recorded with only the sets logged so far.
33. **Exercise videos are raw `.mp4` uploads**, supplied through drag-and-drop or an upload button.
34. **System messages record plan and scheduling events.** Creating or updating a client's plan, and every check-in event (request, approval, reschedule, cancellation, coach-initiated check-in), sends a message in the coach–client chat thread and notifies the relevant party.

## Check-ins

A **Check-in** has a client, a coach, a date and time, a type (`ad-hoc` or `recurring`), a status (`pending`, `confirmed`, `rescheduling`, `declined`, `cancelled`, or `completed`), a source (`client-request`, `coach-request`, or `plan-schedule`), who initiated it, an optional linked plan, an optional note from either party, a reschedule count, and, while rescheduling, who proposed the new time.

35. **Recurring check-ins are auto-confirmed when a plan is assigned.** The system generates weekly check-ins for the plan's duration, linked to the plan, with a configurable frequency defaulting to one per week (default slot Wednesday 10 AM). They need no approval.
36. **Ad-hoc check-ins require approval from the other party.** Both the coach and the client can initiate them; the coach from the messaging area or a client's profile, the client from chat or the Check-ins page.
37. **A client has at most one pending ad-hoc request at a time.** While one is pending, the client cannot submit another and the action is disabled. A client can cancel her own pending request; a cancelled request can no longer be approved.
38. **Scheduling uses coach availability.** Slots are hourly from 9 AM to 4 PM, past dates are disabled, and already-booked slots are unavailable, for new check-ins and reschedules alike.
39. **Either party can propose a reschedule for a confirmed check-in.** The original slot is released and the check-in enters a rescheduling state. The other party can accept the new time, decline, or counter-propose. A proposal may carry an optional message that appears in the chat thread.
40. **Declining a reschedule cancels the check-in.** It never reverts to the original time.
41. **At most 2 reschedule rounds per check-in.** Without agreement after 2 rounds the check-in is automatically cancelled.
42. **Check-ins meet on Google Meet.** The client portal offers a "Join Meet" link for the next confirmed check-in.

## Menstrual Cycle

43. **Every client has a menstrual cycle profile**, created during self-onboarding and visible to the coach: regularity (regular or irregular), average cycle length, average period length, conditions (PCOS, Endometriosis, PMDD, Heavy periods, Amenorrhea, Fibroids), and common symptoms.
44. **Current cycle phase is derived** from the last recorded period start date and the client's average cycle length, and shown on the client dashboard and the coach's client detail page.
45. **Clients without an active cycle are fully supported.** Cycle tracking and cycle-driven adjustments are gracefully skipped or replaced with non-cycle-based coaching.

## Legal and Public Submissions

46. **The current Privacy Policy and Terms & Conditions are dedicated public pages** at `/privacy` and `/terms`, each showing its version and effective date. Every public page ends with links to both, in normal and waiting list mode.
47. **Every public submission rejects bot-driven attempts before it affects system state.** This covers waitlist capture (hero, footer, pricing page), store acquisition for logged-out buyers, assessment call booking, and any future public submission point. The mechanism must offer accessible alternatives or require no visual or motor input, in keeping with the WCAG AA target.

---

# Functional Requirements

## 1. Public Site

### Landing page (`/`)

Convert visitors into assessment calls and introduce the coaching philosophy, training approach, and cycle-aware nutrition model.

1. A full-viewport hero with a background video of the coach training people, a title, subtitle, and CTA placement that guides action, and play, pause, and restart controls.
2. A sticky responsive navigation bar with brand logo and useful links. It exists only on the public site; the portals have their own sidebar navigation. When signed in with a portal role, it shows "Client Portal" or "Coach Portal" as a visually prominent CTA that stays clearly visible over both the dark hero and the light scrolled navbar.
3. An About section with text about the coach, a glowing circular avatar, a short bio, and a phone-style Instagram story widget: the handle opens her Instagram page; 4–5 story items can be tapped through with progress bars updating; a like button adds delight.
4. A platform capabilities section communicating four capabilities: personalized workouts; nutrition guidance (recipes, shopping list, daily calories and macros) presented as one combined capability; direct chat with the coach; menstrual cycle tracking.
5. A workout explanation section with obviously interactive day cards for Strength (lifting heavy and the benefits of strength for women), Recovery (active recovery and adaptation), Rest (mental and physical recovery), and Hypertrophy (muscle growth for health and physique). Clicking shows concise detail. It communicates that workouts adjust around the client's cycle and how she feels that week, and that the program teaches correct execution and form through demos and short coaching notes.
6. A cycle-aware nutrition section communicating how nutrition shifts across phases, with simple food and feel examples: Menstrual (warm, easy-to-digest food, higher iron), Follicular (lighter, fresher food, lower carb), Ovulatory (raw vegetables and fiber), Luteal (complex carbs, root vegetables, magnesium). The cycle-syncing wheel rotates with normal page scrolling in a sticky section, stops after one full 28-day cycle, and uses a sleek minimal day indicator.
7. A My Method section communicating the coach's philosophy: she teaches how a woman's body actually works; plans adjust to individual needs and to cycle phase when applicable; women without an active cycle get the same personalized approach; the coach actively reviews workouts, listens to feedback, and adjusts week by week; no restrictive diets, unsustainable routines, or forced disliked foods; nutrition adapts to the client's body.
8. A footer CTA section, a reusable shell whose content depends on mode: in normal mode it directs visitors to the store; in waiting list mode it shows waitlist messaging, an email capture form, and the current qualitative availability when known. It animates as a sliding sheet with rounded top corners overlapping the section above, slides up scroll-linked, and fades its text in once settled.

### Waiting list mode

While enabled, the navigation shows the brand logo, Home, Store, Pricing, and the free-resource cart; sign-in, portal, and Library links are hidden. The hero CTA becomes a waitlist email capture form, the About "Start my plan" CTA is hidden, and the footer CTA switches to waitlist messaging with the same capture and availability behavior as the hero and pricing page. All content sections stay visible. Email capture validates format before submission and behaves per Business Rules 9–13 and 47.

### Pricing (`/pricing`)

Shows the three coaching bundles and their pricing. Accessible in waiting list mode, where it also offers waitlist capture and shows reduced prices alongside regular prices only while reduced-price places remain open. Checkout is token-gated per Business Rule 6.

### Assessment call booking

Visitors book a 30-minute assessment call from the landing page CTA. After the call, the visitor receives an email with a unique tokenized link that opens the coaching bundle page with checkout enabled.

### Blog (`/blog`)

A publicly accessible, coach-authored content area following brand voice and the design system, with a responsive reading experience. Authoring workflow, categories, and search are not yet defined.

### Legal pages

Per Business Rule 46.

## 2. Digital Store (`/store`)

1. The catalog lists published products with type and goal filters. It distinguishes an empty catalog ("nothing is available yet") from "no results match the selected filters".
2. Each product has a detail page (`/store/:slug`) for inspection before acquisition.
3. Acquisition, delivery, download access (`/store/download`), rate limits, and ownership linking follow Business Rules 14–20.
4. The Library is reachable from primary navigation for signed-in accounts. It lists owned products with a per-product download action, shows a clear empty state pointing back to the store when nothing is owned yet, and shows a clear, retryable message when owned products cannot be loaded or download access cannot be issued.

## 3. Accounts and Onboarding

### Account creation and sign-in

1. Visitors create an account or sign in with an email one-time code from the public site.
2. A failed sign-in lands on a dedicated page explaining what happened and offering one action to try again.
3. Signed-in accounts without the required role who open a portal see a dedicated denied-access page with one action back to safety.

### Coach-side onboarding

4. The coach creates a client from the coach portal, entering client details and coach-defined calorie and macro formulas for that client.
5. Completing onboarding sends the client an invitation email to sign in.

### Client self-onboarding

6. On first sign-in without completed onboarding, the client is redirected to a multi-step wizard and cannot reach the portal until it completes.
7. Step 1, Basic information: the client reviews and corrects the name, age, and gender the coach pre-filled.
8. Step 2, Cycle information: regularity, average cycle length, average period length.
9. Step 3, Conditions and symptoms: any applicable conditions and common symptoms.
10. Step 4, Notes: optional notes for the coach.
11. On completion the menstrual cycle profile is saved and the client lands on the portal dashboard.

## 4. Client Portal (`/client`)

### Dashboard and plan

1. The dashboard shows the client's next workout or day from the assigned plan and her current cycle phase.
2. Clients are notified when a new plan is assigned or updated.
3. The plan view offers week navigation limited to current and past weeks, day cards with Past, Current, and Upcoming status, and a way to start each training day.
4. Clients can adjust the default schedule within the allowed bounds (Business Rule 28).

### Workout Viewer and active tracking

5. A distraction-free, mobile-optimized Workout Viewer shows exercises in order with number, name, equipment, primary muscles, sets, reps, RIR, coach notes, and demo video. Superset exercises appear as a visually connected group and follow an alternating set pattern (A1, B1, A2, B2) during tracking.
6. Clients log actual weight and reps per set. After a set, a rest countdown starts from the coach-configured rest time; the client can extend it by 15 seconds per press or skip it, and actual rest is recorded.
7. Clients can swap the current exercise for any coach-defined variant at any time.
8. On completion the client sees total duration, total volume (weight × reps), muscle groups worked, a per-exercise comparison of logged against prescribed values, and highlighted all-time personal records. Completing early uses an "End workout" action in the viewer's options menu (Business Rule 32).

### Messaging (`/client/messages`)

9. Chat with the coach shows a coach profile sidebar (photo, name, role, response-time note), message bubbles with timestamps and read receipts, and a menu with Search in chat, Mute/Unmute notifications, Archive conversation, and Delete conversation. Delete confirmation uses a styled modal dialog, never a browser-native confirm. There is no call or video button.
10. A "Schedule check-in" action submits an ad-hoc request per Business Rules 36–38 and is disabled while a request is pending.
11. An upcoming check-in banner at the top of the chat shows the next confirmed check-in's date, time, and type.
12. The sidebar has a "Next Check-in" widget with date, time, a "Join Meet" button, and a link to the Check-ins page.

### Check-ins (`/client/checkins`)

13. Organized into Upcoming (confirmed check-ins with Join Meet and the option to propose a new time), Requests (coach-proposed check-ins the client can approve, reschedule, or decline; the client's own pending request, which she can cancel), and Past (completed, declined, and cancelled).
14. New ad-hoc requests can be made from this page under the one-pending limit. Actions here and in chat stay in sync. The page is reachable from portal navigation and from the Next Check-in widget.

### Menstrual cycle tracking (`/client/cycle`)

15. Clients log period entries by date with flow intensity (spotting, light, medium, heavy), symptoms (cramps, bloating, headache, fatigue, mood swings, back pain, breast tenderness, nausea, acne, insomnia), and optional notes.
16. A cycle calendar shows logged period days and the current phase.

### Settings (`/client/settings`)

17. Clients choose units for body weight and training loads (kilograms or pounds) and height (centimetres or feet and inches). The choice applies everywhere a weight or height appears, including profile, dashboard, live logging, and the completion summary, and persists across sessions.

## 5. Coach Portal (`/coach`)

### Dashboard

1. Shows managed clients, pending check-ins, important client information, and upcoming assessment calls. The "Pending Check-ins" card reads from the check-in system, its subtitle reflects the actual pending count, and its "Review" action opens the Schedule page.

### Clients (`/coach/clients`)

2. A client list and a client detail page. The detail page shows the client's subscription term and status, current cycle phase, cycle regularity, average cycle and period length, conditions, and notes, and links to the client's read-only period log and completed workout history.

### Messaging (`/coach/messages`)

3. A conversation list with client avatar (photo or initial), online status, unread count, and last message preview. Each conversation has a menu with Pin/Unpin, Mute/Unmute, Flag for follow-up, Archive, and Delete; delete confirmation uses a styled modal with a warning icon. There is no call or video button. The coach can navigate from a conversation directly to that client's profile.
4. Send and attach actions are visually centered and polished. Notification UI adapts to available space and never renders outside the viewport.
5. An upcoming check-in banner at the top of the active chat shows the next confirmed check-in for that client. The coach can initiate an ad-hoc check-in from here.
6. Pending requests and reschedule proposals appear as action cards in the message stream with client name, requested date and time, optional note, and Accept and Decline buttons. Acting updates the check-in immediately and fires a notification.

### Workout review and history

7. Completed workouts are grouped by subscription, then plan, then week. The coach can filter by date range, session duration, session volume, and muscle groups trained (a session matches when at least one exercise trains a selected group; multiple groups may be selected). For the current selection the coach sees session count, total volume, average volume per session, and average duration.
8. Each workout review shows logged against prescribed weight and reps per set, rest taken against prescribed, swaps made, compliance percentage, duration, and volume. Volumes use the coach's unit setting.

### Schedule (`/coach/checkins`)

9. Reached from the sidebar "Schedule" link, which carries a badge with the pending count. Three tabs: Pending (all ad-hoc requests and reschedule proposals across clients, each card showing client, type, date, time, note, and who initiated it, with Accept and Decline and an empty state), Upcoming (confirmed recurring and ad-hoc check-ins sorted by date with a type badge and Confirmed status), and Past (completed, declined, cancelled, with status and any client notes).

### Settings (`/coach/settings`)

10. The coach chooses units for weight and height. The choice applies across her views, including workout-history volumes and the session-volume filter.

## 6. Exercises and Plans (`/coach/training`)

### Data model

**Exercise**: name, description, equipment used, difficulty, primary muscles, secondary muscles, demo video (`.mp4`), and tags such as Strength, Hypertrophy, Recovery. Tags are multi-valued (a back squat is both Strength and Hypertrophy) and distinct from a client's Goal. An exercise needs no equipment when it lists nothing or only Bodyweight.

**Goal**: client, name (e.g. "Strength & Recomp Block"), type (Muscle Building, Fat Loss, Strength, Recomposition, Maintenance, Custom), start date, status (active or completed).

**Plan Template**: reusable structure of weeks, days, and exercises; default 4 weeks with 1 deload week; not assigned to any client; can be saved as draft.

**Plan Instance**: a client's plan, linked to a Goal; weeks (from a template or from scratch); current week number; status (active or completed); start date and optional end date; weeks added incrementally.

**Plan Day**: day type Rest, Recovery, Strength, Hypertrophy, or Lighter (yoga, pilates, mobility, flexibility). Rest days contain no exercises.

**Exercise Assignment**: sets, reps, RIR, superset grouping, rest time in seconds, optional swap variants, coaching notes.

### Exercise Library

1. The coach creates exercises with `.mp4` upload by drag-and-drop or button, and reuses them across plans.
2. The library supports search and filters for Strength, Hypertrophy, and Recovery tags and for no-equipment exercises. Tag filters combine as "any of"; the no-equipment filter narrows when applied and places no constraint otherwise (no equipment-only view, since its complement is the whole library). Filters combine with search and with each other as "all of".

### Plan Builder

3. A dedicated full-screen page, not a modal, with two contexts: a Template Builder for reusable templates and a Client Plan Builder for a specific client's plan. Save actions and pre-populated names make clear which is being saved.
4. Defaults to 4 weeks. The coach adds and removes weeks, copies one week's contents to a single week or all weeks through a discoverable control, swaps two weeks, and inserts a deload week at any position. The deload week is visually distinguished and prompts manual volume and intensity adjustment.
5. The day type selector visually distinguishes day types. The coach can see at a glance how many exercises each day has, which training days are still empty, and the overall structure of weeks and day types without scrolling through every week.
6. Exercises are added from the library by drag-and-drop into a day, reordered within a day, and grouped into a superset by dragging one onto another with an obvious visual result. A quick-add "+" button and a structured non-drag alternative exist for accessibility. Exercise rows carry numbered order indicators, a comfortable drag area, never overflow, and clearly name the exercise.
7. Per assignment, the coach sets sets, reps, RIR, rest time, swap variants from the library, and an expandable coaching note.
8. The coach can save as draft and continue later, name the plan on save, preview the full structure before saving, and share a plan with one or more clients.
9. The Client Plan Builder can optionally load a template with a preview of each day's exercises, sets, reps, and RIR before committing. When editing an active plan, the coach sees which weeks already existed and which are new in this session.
10. The builder uses all available space on large displays; on small screens the library and structure are available on demand without cluttering the editing area.

### Training Hub

11. Active plan cards show client name, week progress, deload indicators, goal, training frequency, and start date, and are clearly distinguished from completed plans. Clicking a card opens the client plan builder; a context menu offers "Go to Client" and "Delete Plan".
12. Creating a client plan starts by selecting a client; a template may then be loaded inside the builder.
13. The Templates tab shows template cards with edit, start a plan from template, copy, and delete.
14. Deleting a plan or template requires explicit confirmation in a styled dialog.

### Assignment

15. Assigning a plan notifies the client, generates its recurring check-ins (Business Rule 35), and posts a system message (Business Rule 34).

## 7. Notifications

1. A notification bell in both portals' sidebar headers. Notifications are role-aware: client notifications link to client routes such as `/client/messages`; coach notifications link to coach routes such as `/coach/messages?client=id` and `/coach/checkins`.
2. Toasts carry a "View" action that navigates without losing app state. Clicking a notification marks it read and navigates.
3. Types: new message; check-in requested (by client or coach); check-in approved; reschedule proposed; check-in cancelled (by decline or auto-cancel). The requesting party is notified on approval; both parties on cancellation.

## 8. Shared Requirements

1. One consistent visual language across all pages and portals; cards, modals, forms, and navigation feel familiar throughout. The design system in code is the source of truth for visual decisions.
2. WCAG AA: 4.5:1 contrast for normal text, 3:1 for large text, controls, and meaningful graphics. Complex interactions, especially plan building, have accessible alternatives. All animations respect reduced motion.
3. Works on mobile, tablet, and desktop; layouts adapt without breakage, and content never clips, overflows, or becomes unreadable.
4. No dropdown for two or fewer options.

---

# Deferred

- Full blog CMS, authoring workflow, categories, and search
- Real payment processing for coaching bundles and paid store products
- Real Google Meet integration for check-ins
- Rich analytics and reporting; advanced search across clients
- Plan version history or changelog
- Per-client configurable check-in frequency (default weekly today)
- Check-in reminders and calendar integrations
- Video calling

# Open Questions

1. What exact limits apply when clients adjust their plan schedule?
2. What notification channels exist beyond in-app?
3. What product metadata does the store need beyond type, goal, and price?
4. What happens to a plan's recurring check-ins when the plan is ended: are they cancelled automatically or kept?
5. Should the system track plan version history when the coach adds weeks to an active plan?
6. The prototype includes a nutrition module (recipe builder, per-client nutrition plans, client nutrition view) that this document does not yet specify.
