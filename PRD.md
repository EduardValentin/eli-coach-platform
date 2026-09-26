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
- Video calling inside the product. Assessment calls and check-ins meet in an external meeting room on Google Meet; the product only links to it.

## Users

**Visitor.** A woman discovering the coach through the public site. She can browse the landing page, blog, pricing, and store, acquire store products with her email, and book a free assessment call with the coach. She cannot create an account. She can see 1-on-1 coaching bundles but cannot check out for coaching without a payment link.

**Client.** An invited, paying woman with an active coaching subscription. In the MVP she uses the client portal to complete onboarding, manage check-ins, track her menstrual cycle, and maintain her profile and subscription. Post-MVP adds assigned training and nutritional programs, workout logging, and in-app messaging. Clients with a regular cycle and clients without an active cycle (amenorrhea, post-menopause, hormonal contraception) receive the same level of personalized coaching.

**Coach.** The trainer running the business. In the MVP she uses the coach portal to manage assessment calls, onboard clients, manage check-ins, and review client profiles and cycle data. Post-MVP adds training and nutritional program creation and assignment, in-app messaging, and workout review.

## Delivery Stages

The MVP includes every requirement in this document except the capabilities explicitly marked Post-MVP. Check-ins, including client and coach scheduling, approval, rescheduling, and Google Meet links, remain in the MVP.

Post-MVP adds three capability groups:

- Training programs: exercise and plan creation, assignment, client plan delivery, workout logging, and workout history or review.
- Nutritional programs: coach nutritional-program creation and assignment, and client nutritional-program views.
- In-app messaging: coach-client conversations and chat-specific system events. Check-in notifications and check-in notes remain available in the MVP without chat.

The reference prototype defaults to MVP mode. Its Dev Toggle can switch to Post-MVP mode, which renders the complete MVP plus these three capability groups. Routes may remain directly reachable because the prototype models scope rather than production authorization.

## Product and Brand Principles

The product consistently feels premium, elegant, warm, supportive, women-focused, competent, trustworthy, clean, modern, responsive, and accessible, with one visual and interaction language across every area.

Brand voice is personal, human, empowering, supportive, and confident. It avoids generic AI-sounding phrases such as "unlock your potential", "world-class", "seamless experience", and "transformative", emoji-heavy copy, and excessive exclamation marks. Visual identity is documented in `DESIGN.md`.

## Reference Prototype

The product is modelled first in a reference prototype application before it is built in production. The prototype mocks every backend, auth, email, and payment dependency and carries a global Dev Toggle for switching between MVP and Post-MVP scope and between app states such as signed out, client, coach, bundle purchased, waiting list mode, and client needs onboarding. MVP is the default; Post-MVP is a strict superset. Those mocks and the Dev Toggle are prototype conventions, not product requirements. Production uses real authentication, persistence, and email. URLs in this document are production URLs.

---

# Business Rules

## Access and Roles

1. **Accounts exist only by invitation.** Nobody can sign up on her own. The coach's account is provisioned by the operator; client accounts are created when the coach invites a client. Sign-in uses an email one-time code.
2. **Client accounts are invite-only.** The coach onboards a client from the coach portal; the client then receives an invitation email to sign in.
3. **Client portal access requires invitation, an active subscription, and completed self-onboarding.** A client signing in before completing onboarding is sent to the onboarding wizard and cannot reach the portal until it is complete.
4. **Coach portal access is restricted to the coach role.** Signed-in accounts without the required role see a clear denied-access page.
5. **Every account has exactly one role, client or coach.** There is no account without a portal.

## Coaching Sales

A **payment link** is the unique link, sent by email after an assessment call, through which the visitor chooses a coaching bundle and pays for it. Her **price tier** is regular or reduced and is resolved from the call's email: reduced when that email holds a reduced-price waitlist allocation (Business Rule 17) in any campaign, regular otherwise. Her **start choice** decides when her program starts: immediately, or after the 14-day withdrawal period. A **coaching subscription** records what she paid for: the coaching bundle, price tier, amount, start choice, and whether it has started. Every assessment call that has ended has a **sales state**: held (no working payment link), payment link sent (a working payment link, not yet paid), or paid (the call's payment created a client).

6. **Three coaching bundles: 1 Month, 3 Months, and 6 Months.** Longer commitments have lower per-month pricing; all bundles include the same benefits. Pricing is public, but checkout is available only through a payment link. The coach can send a payment link only for an assessment call that has ended. A payment link works for 30 days from when it is sent; a re-send replaces it and the earlier link stops working at once; a payment spends it. The platform records at most one payment per assessment call. Before paying, the visitor chooses a coaching bundle and a start choice; the start choice has no default and is required. The payment is a recurring subscription charged in euros once per bundle length (every 1, 3, or 6 months) at her price tier, and the buyer's email is fixed to the call's email. A completed payment creates the client with the call's booking profile (first name, last name, email, date of birth, gender, primary goal, country, and phone) and a coaching subscription that has not started. The payment provider's receipt is the payment record; the platform sends no receipt.
7. **The 3- and 6-month plans have a 7-day cancellation window.** Within the first 7 days the client may cancel if coaching is not the right fit; afterwards the full term applies. The 1-month plan is month-to-month with no term commitment.
8. **The coach can see each client's subscription**: its term and whether it is active or expired. She also sees each ended assessment call's sales state.

## Assessment Calls

An **Assessment Call** is a free 30-minute video call between a visitor and the coach, booked from the public site without an account. It has the visitor's first name, last name, email, date of birth, gender, primary goal, country, optional phone, and optional notes, a start time, the visitor's time zone, the coach's time zone, and a join link. The **primary goal** is the visitor's own stated aim, one of Lose weight, Build muscle, Build strength, or Maintain but improve lifestyle; it is distinct from the coach-created Goal. The public site words the call simply as "call"; "Assessment Call" is the product's name for it.

9. **Every assessment call lasts 30 minutes and reserves the coach for a full hour.** Slots start on the hour, one per hour, because each call reserves the 30 minutes after it as a buffer. The visitor sees only the 30-minute call; the buffer and the 60-minute reservation are never shown to her.
10. **The coach sets her availability: the weekdays and the daily hour interval in which she takes assessment calls.** Any of the seven weekdays can be chosen, and at least one must be. Start and end are whole hours between 00:00 and 24:00 with the start before the end; slots start on the hour from the start hour, the last one an hour before the end hour (17:00 to 20:00 yields 17:00, 18:00, and 19:00). The hours are the coach's own local time and are saved together with her time zone. Until she saves for the first time, availability is Monday to Friday, 17:00 to 20:00 Europe/Bucharest. A change applies only to what is offered from then on: calls already booked stay booked, keep blocking their hour, and stay listed.
11. **A slot is offered only when it lies inside the coach's availability, starts at least two hours from now, falls within the next 30 days, and is not taken.** A slot is taken when its hour overlaps time already reserved by a booked call. A taken slot is refused identically whoever holds it, including the visitor's own earlier booking, so the answer never reveals who holds a slot. A day without an open slot cannot be selected.
12. **One email address holds at most one upcoming assessment call.** A booking for an address that already holds one is refused with a generic message that reveals nothing about the existing call: no date, time, join link, or booking reference. Past calls do not block a new booking.
13. **A booking sends two emails in the platform's shared email styling: a confirmation to the visitor and a notification to the coach.** The visitor's confirmation greets her by first name. The coach's notification carries the visitor's full name, email, phone when given, age with date of birth, gender, primary goal, and country. Each carries her notes when given, the call's date and time in the recipient's time zone with the zone named, the 30-minute duration, the join link, an add-to-calendar action for Google Calendar, and a calendar file that opens in Apple Calendar, Outlook, and Google Calendar in the recipient's local time. Nothing is written to the coach's calendar and no reminder is sent.
14. **Every assessment call meets in the coach's single meeting room.** The coach sets the meeting room's link in her settings: one absolute `https` URL, or empty while she has none. Each call has a join link, a platform link for that call that stays valid indefinitely and redirects, when opened, to the meeting room current at that moment, so a room change reaches every call, including those in emails already sent. While no meeting room is set, the join link of a known call shows a page saying the call link is not ready yet and reveals no call detail; the join link of an unknown call shows a privacy-safe not-found page. A join link keeps working in waiting list mode.
15. **Every time shown to a person is in her own local time zone, and stored times keep their zone.** On screen, the booking page, its confirmation, and the coach portal render times in the viewer's browser zone without naming it. Both emails render the time in the recipient's zone and name it. Every call records the visitor's time zone and the coach's time zone at booking, and every stored moment is an instant.

## Waiting List

16. **Waiting list mode is an operator-controlled feature flag.** While enabled, coaching CTAs are hidden and the free store and all landing page content stay available. The persisted pre-launch default is enabled; an absent flag means normal coaching mode. If the flag cannot be read, the public site uses waiting list mode without making an availability claim.
17. **Every accepted submission joins one waitlist; allocation determines pricing.** A limited number of reduced-price places exist. The allocation recorded at submission decides whether the visitor receives reduced pricing on every coaching bundle or regular pricing. Joining stays open after reduced-price places run out. The number of reduced-price places cannot be lowered while more people hold reduced-price places than the new number allows.
18. **Public availability is qualitative, delayed, and privacy-preserving.** Public surfaces show exactly one of "Reduced-price spots available", "Limited spots", or "Reduced-price spots closed", refreshed at fixed half-hour intervals. They never expose a count, progress toward capacity, or an immediate change after a submission. Reduced prices and promotional copy appear only while availability is "available" or "limited". If availability cannot be determined, a generic outage message is shown, signup stays open, and no reduced-price claim is made.
19. **Duplicate submissions look identical to new ones.** Re-submitting a registered email keeps its existing allocation, refreshes consent and retention, and sends no additional confirmation email. The browser shows the same generic confirmation and celebration for new and duplicate submissions.
20. **Validation, bot verification, and server failures are real error outcomes.** Invalid emails stay on the form for correction, bot-failed submissions are rejected, and server failures ask the visitor to retry and offer the support email. A newly accepted regular-pricing entrant receives a confirmation email stating that joining succeeded, reduced-price places were already full, and the signup does not include reduced pricing.

## Digital Store

21. **The store is public.** Products are free or paid, and each shows which it is. Product types include e-books, workout challenges, nutrition tips and recipes, workout plans, nutrition plans, and fat loss plans. Products can be inspected before acquisition and added to a persistent cart.
22. **Acquisition requires an email, acceptance of the current Terms, and bot verification.** The Privacy Policy is a linked notice, not a choice. Marketing consent is a separate, optional, unchecked choice that never blocks delivery.
23. **Outcomes are explicit.** An invalid email, failed bot verification, failed delivery, and server failure each produce a clear message, and failures keep the visitor's selections and details for retry. If a requested product is no longer available, the whole request is rejected, the cart drops the unavailable items, and the visitor is asked to review and retry. Successful free requests confirm the resources were sent to the email, without order or price framing.
24. **One delivery email per accepted request** offers a single primary download action for all granted resources. Download access is reached from that email, lasts seven days from each request, and can be revoked. Invalid, expired, or revoked links show one privacy-safe unavailable message that does not reveal what the link pointed to, and the visitor can request the resources again.
25. **Delivery is rate-limited per email address**: at most one delivery per minute and ten in any rolling 24 hours. Addresses differing only by a sub-address tag share one allowance. A declined request explains which limit was reached, records nothing, and keeps the visitor's selections. A delivery that fails or whose outcome is unknown does not consume the allowance.
26. **Acquisitions belong to the entered email.** An acquisition is recorded against the email the visitor enters and is never linked to an account. Signed-in visitors acquire products exactly as signed-out visitors do, by entering an email.
27. **Lost access is recovered by acquiring again.** A visitor who no longer has a delivery email requests a free product again from the store, or buys a paid product again. The platform never restores access from an account.

## Plans and Training — Post-MVP

28. **A client has at most one active plan.** The coach must end the current plan before starting a new one. Past plans are preserved for history.
29. **Plans follow a template-instance model.** Plan Templates are reusable structures the coach creates, edits, copies, and deletes. Plan Instances are personalized plans assigned to one client and tied to one Goal. Templates are optional; a client plan can start from one or from scratch.
30. **Each plan instance is tied to a client Goal.** A Goal names the training objective (Muscle Building, Fat Loss, Strength, Recomposition, Maintenance, or Custom), has a start date, and moves from active to completed.
31. **Templates default to 4 weeks with 1 deload week.** The deload week is visually distinguished and prompts the coach to manually adjust volume and intensity. The system never auto-modifies plan variables.
32. **Plan building is iterative.** The coach may schedule 1–2 weeks at a time and add weeks incrementally to an active plan; the client's plan updates with each addition. The coach can insert a deload week at any position at any time.
33. **Existing weeks of an active plan are immutable.** Once a client has started, weeks already part of the plan cannot be deleted; only newly added weeks can be removed.
34. **Clients see only current and past weeks.** Weeks the coach has built ahead are hidden until the client reaches them.
35. **The coach sets a default schedule for each plan.** Clients may adjust it in ways that fit their needs, with limited flexibility rather than unrestricted restructuring.
36. **Workout logging records actual against prescribed.** Each set is tracked individually with actual weight and reps and compared with the prescription.
37. **Exercise swaps are coach-controlled.** Only the coach defines swap variants for an exercise assignment; during a workout a client may swap only to those variants. Swap history is recorded per workout.
38. **Rest time is coach-configured per exercise assignment, in seconds.** Clients can extend or skip the rest timer during a workout; both prescribed and actual rest are recorded.
39. **A workout is complete only when every prescribed set is logged.** Ending a workout early is an explicit action, after which the workout is recorded with only the sets logged so far.
40. **Exercise videos are raw `.mp4` uploads**, supplied through drag-and-drop or an upload button.
41. **System messages record plan and scheduling events Post-MVP.** Creating or updating a client's plan, and every check-in event (request, approval, reschedule, cancellation, coach-initiated check-in), sends a message in the coach–client chat thread and notifies the relevant party. In the MVP, check-in events still notify the relevant party and remain visible in the check-in flow without creating a chat entry.

## Check-ins

A **Check-in** has a client, a coach, a date and time, a type (`ad-hoc` or `recurring`), a status (`pending`, `confirmed`, `rescheduling`, `declined`, `cancelled`, or `completed`), a source (`client-request`, `coach-request`, or `plan-schedule`), who initiated it, an optional linked plan, an optional note from either party, a reschedule count, and, while rescheduling, who proposed the new time.

42. **Recurring check-ins are auto-confirmed.** In the MVP, recurring check-ins are managed independently of a training program. Post-MVP, assigning a plan generates weekly check-ins for the plan's duration, linked to the plan, with a configurable frequency defaulting to one per week (default slot Wednesday 10 AM). They need no approval.
43. **Ad-hoc check-ins require approval from the other party.** Both the coach and the client can initiate them from the client profile or Check-ins page. Post-MVP, they can also initiate them from the messaging area or chat.
44. **A client has at most one pending ad-hoc request at a time.** While one is pending, the client cannot submit another and the action is disabled. A client can cancel her own pending request; a cancelled request can no longer be approved.
45. **Scheduling uses coach availability.** Slots are hourly from 9 AM to 4 PM, past dates are disabled, and already-booked slots are unavailable, for new check-ins and reschedules alike.
46. **Either party can propose a reschedule for a confirmed check-in.** The original slot is released and the check-in enters a rescheduling state. The other party can accept the new time, decline, or counter-propose. A proposal may carry an optional note. Post-MVP, that note also appears in the chat thread.
47. **Declining a reschedule cancels the check-in.** It never reverts to the original time.
48. **At most 2 reschedule rounds per check-in.** Without agreement after 2 rounds the check-in is automatically cancelled.
49. **Check-ins meet on Google Meet.** The client portal offers a "Join Meet" link for the next confirmed check-in.

## Menstrual Cycle

50. **Every client has a menstrual cycle profile**, created during self-onboarding and visible to the coach: regularity (regular or irregular), average cycle length, average period length, conditions (PCOS, Endometriosis, PMDD, Heavy periods, Amenorrhea, Fibroids), and common symptoms.
51. **Current cycle phase is derived** from the last recorded period start date and the client's average cycle length, and shown on the client dashboard and the coach's client detail page.
52. **Clients without an active cycle are fully supported.** Cycle tracking and cycle-driven adjustments are gracefully skipped or replaced with non-cycle-based coaching.

## Legal and Public Submissions

53. **The current Privacy Policy and Terms & Conditions are dedicated public pages** at `/privacy` and `/terms`, each showing its version and effective date. Every public page ends with links to both, in normal and waiting list mode.
54. **Every public submission rejects bot-driven attempts before it affects system state.** This covers waitlist capture (hero, footer, pricing page), store acquisition for logged-out buyers, assessment call booking, and any future public submission point. The mechanism must offer accessible alternatives or require no visual or motor input, in keeping with the WCAG AA target.

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

While enabled, the navigation shows the brand logo, Home, Store, Pricing, and the free-resource cart; sign-in and portal links are hidden. The hero CTA becomes a waitlist email capture form, the About "Start my plan" CTA is hidden, and the footer CTA switches to waitlist messaging with the same capture and availability behavior as the hero and pricing page. All content sections stay visible. Email capture validates format before submission and behaves per Business Rules 16–20 and 54.

### Pricing (`/pricing`)

Shows the three coaching bundles and their pricing. Accessible in waiting list mode, where it also offers waitlist capture and shows reduced prices alongside regular prices only while reduced-price places remain open. Checkout is available only through a payment link (Business Rule 6).

### Assessment call booking (`/book`)

Visitors book a free 30-minute assessment call with the coach, reached from the hero, About, and pricing CTAs in normal mode. The page sits inside the public site layout with the navigation bar and footer. In waiting list mode those CTAs stay hidden and the page does not exist: opening `/book` by URL, or submitting a booking, gets a not-found page (404).

1. The page introduces the call, the coach, its 30-minute duration, and that it is a video call, beside a two-step form.
2. Step 1, date and time: a calendar of the next 30 days. A day is selectable only when it has at least one open slot; past days and days without open slots are disabled and announced as such. Selecting a day lists its open slots as start times per Business Rules 9–11, in the visitor's local time zone, with no zone named. If open slots cannot be loaded, the page says so instead of failing.
3. Step 2, details: first name, last name, email, date of birth, gender, primary goal, country, optional phone, and optional notes for the coach. Gender offers Female, Male, and Prefer not to say; primary goal offers its four values; country is a single choice from every country; the phone is a country calling code plus a number and is stored in international form. The date of birth must be a real date that makes the visitor at least 18 on the day she books. Invalid or missing values are explained inline and keep the chosen slot and entered values. Bot verification runs on submission before anything is stored (Business Rule 54); a rejected verification stores nothing, sends nothing, and shows a retryable message.
4. Confirmation: a successful booking is stored and confirmed on screen with the date, the time in the visitor's zone with no zone named, and the 30-minute duration, and tells the visitor the join link is on its way by email; the two emails of Business Rule 13 are sent. A refresh returns to the first step; the email is the durable record.
5. Error outcomes: a slot taken meanwhile returns the visitor to the date and time step with refreshed slots and an explanation, keeping her details; an email address that already holds an upcoming call gets the generic refusal of Business Rule 12 and stays on the details step; a server failure asks her to try again.
6. Each call's join link (`/book/:bookingId/join`) behaves per Business Rule 14.
7. Once the call has ended, the coach can email the visitor a payment link from the coach portal (Business Rule 6). The link opens the coaching bundle page: a valid link shows the three coaching bundles at her price tier; an unknown, expired, replaced, or spent link shows "a call comes first" and reveals nothing about any call. She picks a coaching bundle and a start choice, pays on the payment provider's hosted checkout, and lands on a confirmation of her payment. Cancelling checkout returns her to the coaching bundle page with her selection kept and a note that no payment was taken. In waiting list mode the coaching bundle page and the confirmation do not exist and answer with a not-found page.

### Blog (`/blog`)

A publicly accessible, coach-authored content area following brand voice and the design system, with a responsive reading experience. Authoring workflow, categories, and search are not yet defined.

### Legal pages

Per Business Rule 53.

## 2. Digital Store (`/store`)

1. The catalog lists published products with type and goal filters. It distinguishes an empty catalog ("nothing is available yet") from "no results match the selected filters".
2. Each product has a detail page (`/store/:slug`) for inspection before acquisition.
3. Acquisition, delivery, download access (`/store/download`), and rate limits follow Business Rules 21–27.

## 3. Accounts and Onboarding

### Account creation and sign-in

1. The coach and invited clients sign in with an email one-time code from the public site. Visitors cannot create an account.
2. A failed sign-in lands on a dedicated page explaining what happened and offering one action to try again.
3. Signed-in accounts without the required role who open a portal see a dedicated denied-access page with one action back to safety.

### Coach-side onboarding

4. A client is created when she pays for a coaching bundle, carrying the booking profile of her assessment call (Business Rule 6); the coach never creates a client by hand. From the coach portal the coach enters coach-defined calorie and macro formulas for that client.
5. Completing onboarding sends the client an invitation email to sign in.

### Client self-onboarding

6. On first sign-in without completed onboarding, the client is redirected to a multi-step wizard and cannot reach the portal until it completes.
7. Step 1, Basic information: the client reviews and corrects the name, age, and gender the coach pre-filled.
8. Step 2, Cycle information: regularity, average cycle length, average period length.
9. Step 3, Conditions and symptoms: any applicable conditions and common symptoms.
10. Step 4, Notes: optional notes for the coach.
11. On completion the menstrual cycle profile is saved and the client lands on the portal dashboard.

## 4. Client Portal (`/client`)

### Training dashboard and plan — Post-MVP

1. The dashboard shows the client's next workout or day from the assigned plan and her current cycle phase.
2. Clients are notified when a new plan is assigned or updated.
3. The plan view offers week navigation limited to current and past weeks, day cards with Past, Current, and Upcoming status, and a way to start each training day.
4. Clients can adjust the default schedule within the allowed bounds (Business Rule 35).

### Workout Viewer and active tracking — Post-MVP

5. A distraction-free, mobile-optimized Workout Viewer shows exercises in order with number, name, equipment, primary muscles, sets, reps, RIR, coach notes, and demo video. Superset exercises appear as a visually connected group and follow an alternating set pattern (A1, B1, A2, B2) during tracking.
6. Clients log actual weight and reps per set. After a set, a rest countdown starts from the coach-configured rest time; the client can extend it by 15 seconds per press or skip it, and actual rest is recorded.
7. Clients can swap the current exercise for any coach-defined variant at any time.
8. On completion the client sees total duration, total volume (weight × reps), muscle groups worked, a per-exercise comparison of logged against prescribed values, and highlighted all-time personal records. Completing early uses an "End workout" action in the viewer's options menu (Business Rule 39).

### Messaging (`/client/messages`) — Post-MVP

9. Chat with the coach shows a coach profile sidebar (photo, name, role, response-time note), message bubbles with timestamps and read receipts, and a menu with Search in chat, Mute/Unmute notifications, Archive conversation, and Delete conversation. Delete confirmation uses a styled modal dialog, never a browser-native confirm. There is no call or video button.
10. A "Schedule check-in" action submits an ad-hoc request per Business Rules 43–45 and is disabled while a request is pending.
11. An upcoming check-in banner at the top of the chat shows the next confirmed check-in's date, time, and type.
12. The sidebar has a "Next Check-in" widget with date, time, a "Join Meet" button, and a link to the Check-ins page.

### Check-ins (`/client/checkins`)

13. Organized into Upcoming (confirmed check-ins with Join Meet and the option to propose a new time), Requests (coach-proposed check-ins the client can approve, reschedule, or decline; the client's own pending request, which she can cancel), and Past (completed, declined, and cancelled).
14. New ad-hoc requests can be made from this page under the one-pending limit. The page is reachable from portal navigation and from the Next Check-in widget. Post-MVP, actions here and in chat stay in sync.

### Menstrual cycle tracking (`/client/cycle`)

15. Clients log period entries by date with flow intensity (spotting, light, medium, heavy), symptoms (cramps, bloating, headache, fatigue, mood swings, back pain, breast tenderness, nausea, acne, insomnia), and optional notes.
16. A cycle calendar shows logged period days and the current phase.

### Settings (`/client/settings`)

17. Clients choose units for body weight and training loads (kilograms or pounds) and height (centimetres or feet and inches). The choice applies everywhere a weight or height appears, including profile, dashboard, live logging, and the completion summary, and persists across sessions.

## 5. Coach Portal (`/coach`)

### Dashboard

1. Opens to a greeting stating how many assessment calls the coach still has today (calls dated today that have not ended) and an "Upcoming calls" widget listing her next three calls that have not ended, soonest first, each with the visitor's name, the call's date and time, a Today badge when it is today, and its join link, plus a link to the full assessment calls list. With no upcoming call the widget says so and still links to the list.
2. Managed clients, pending check-ins, and important client information. The "Pending Check-ins" card reads from the check-in system, its subtitle reflects the actual pending count, and its "Review" action opens the Schedule page.

### Assessment calls (`/coach/assessment-calls`)

3. Reached from the sidebar "Assessment calls" entry. Lists every assessment call with the visitor's full name, her email as a mail link, her phone as a tel link when given, her age with date of birth, gender, primary goal, and country, the call's date and time, her notes when she left any, a Today badge when the call is today, and its join link while the call has not ended. A call is upcoming until it ends and past afterwards; upcoming and past calls are visually distinct, upcoming calls list soonest first, past calls list most recent first, and past calls carry no join link. A filter offers All (the default), Upcoming, Today, and Past. A Status filter narrows the list to one sales state (held, payment link sent, or paid) or shows all of them (the default), and each option shows how many calls it matches under the current filter and search. The coach sorts the list by scheduled date, booking date, name, or email, with a direction toggle: dates start soonest or newest first and text starts A to Z, and reversing the scheduled date reverses the whole listing order. A search box narrows the list by the visitor's first name, last name, or email. The list shows ten calls per page with page controls and a "Showing a–b of n" line; the active filters, sort, search, and page survive a reload and a return from another page, and the page resets to the first when a filter, the sort, or the search changes. Each filter has its own empty state: no upcoming calls, no calls today, no past calls, no calls yet, no matches for a search, and no calls in the chosen sales state. A call booked on `/book` appears on the next load, and a call that has ended moves from Upcoming to Past without any action. Each ended call shows its sales state (Business Rule 8). A held call offers to send a payment link and a call whose payment link was sent offers to re-send it; either asks the coach to confirm, then emails the payment link to the call's email (Business Rule 6), and an email that cannot be sent is reported so she can send it again. A paid call has no sales action.

### Clients (`/coach/clients`)

4. A client list and a client detail page. The detail page shows the client's subscription term and status, current cycle phase, cycle regularity, average cycle and period length, conditions, and notes, and links to the client's read-only period log. Post-MVP it also shows assigned training and nutritional programs and links to completed workout history.

### Messaging (`/coach/messages`) — Post-MVP

5. A conversation list with client avatar (photo or initial), online status, unread count, and last message preview. Each conversation has a menu with Pin/Unpin, Mute/Unmute, Flag for follow-up, Archive, and Delete; delete confirmation uses a styled modal with a warning icon. There is no call or video button. The coach can navigate from a conversation directly to that client's profile.
6. Send and attach actions are visually centered and polished. Notification UI adapts to available space and never renders outside the viewport.
7. An upcoming check-in banner at the top of the active chat shows the next confirmed check-in for that client. The coach can initiate an ad-hoc check-in from here.
8. Pending requests and reschedule proposals appear as action cards in the message stream with client name, requested date and time, optional note, and Accept and Decline buttons. Acting updates the check-in immediately and fires a notification.

### Workout review and history — Post-MVP

9. Completed workouts are grouped by subscription, then plan, then week. The coach can filter by date range, session duration, session volume, and muscle groups trained (a session matches when at least one exercise trains a selected group; multiple groups may be selected). For the current selection the coach sees session count, total volume, average volume per session, and average duration.
10. Each workout review shows logged against prescribed weight and reps per set, rest taken against prescribed, swaps made, compliance percentage, duration, and volume. Volumes use the coach's unit setting.

### Schedule (`/coach/checkins`)

11. Reached from the sidebar "Schedule" link, which carries a badge with the pending count. Three tabs: Pending (all ad-hoc requests and reschedule proposals across clients, each card showing client, type, date, time, note, and who initiated it, with Accept and Decline and an empty state), Upcoming (confirmed recurring and ad-hoc check-ins sorted by date with a type badge and Confirmed status), and Past (completed, declined, cancelled, with status and any client notes).

### Settings (`/coach/settings`)

12. Reached from the sidebar "Settings" entry. An "Assessment calls" section holds the coach's availability (weekdays, start hour, end hour) and the meeting room link per Business Rules 10 and 14, showing the defaults until she has saved once. Saving with no weekday, a start at or after the end, or an invalid link is refused with an inline explanation that keeps the entered values; a valid save confirms with a toast and is live at once for the next visitor; a server failure shows an error toast and keeps the entered values. While the meeting room link is empty, the section warns that visitors cannot join calls until a link is set.
13. The coach chooses units for weight and height. The choice applies across her views, including workout-history volumes and the session-volume filter.

## 6. Exercises and Plans (`/coach/training`) — Post-MVP

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

15. Assigning a plan notifies the client, generates its recurring check-ins (Business Rule 42), and posts a system message (Business Rule 41).

## 7. Notifications

1. A notification bell in both portals' sidebar headers. Notifications are role-aware. In the MVP, check-in notifications link to the appropriate Check-ins page. Post-MVP, message and program notifications link to routes such as `/client/messages` and `/coach/messages?client=id`.
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
- Real payment processing for paid store products
- Per-call meeting room generation through a video provider. Every assessment call shares the coach's single meeting room (Business Rule 14); check-ins have no meeting room set up yet
- Rich analytics and reporting; advanced search across clients
- Plan version history or changelog
- Per-client configurable check-in frequency (default weekly today)
- Reminders and calendar writes for assessment calls and check-ins. The add-to-calendar action and calendar file in the booking emails (Business Rule 13) are in scope; writing to the coach's calendar is not
- Visitor rescheduling or cancellation of an assessment call, and coach actions on a booked call (cancel, reschedule, mark as done, edit notes)
- Per-day hour intervals, blackout dates, and vacations in the coach's availability
- Video calling

# Open Questions

1. What exact limits apply when clients adjust their plan schedule?
2. What notification channels exist beyond in-app?
3. What product metadata does the store need beyond type, goal, and price?
4. What happens to a plan's recurring check-ins when the plan is ended: are they cancelled automatically or kept?
5. Should the system track plan version history when the coach adds weeks to an active plan?
6. The Post-MVP prototype includes a nutrition module (recipe builder, per-client nutrition plans, client nutrition view) that this document does not yet specify.
7. Check-in scheduling (Business Rule 45) still uses fixed 9 AM to 4 PM hours, while assessment calls use the coach-configured availability of Business Rule 10. Do check-ins adopt that availability when they are built?
8. Business Rule 12 treats a call as upcoming until it starts, while the coach portal treats it as upcoming until it ends. May a visitor whose call is in progress book another one?
