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

**Client.** An invited, paying woman with an active coaching subscription. In the MVP she uses the client portal to submit her onboarding, manage check-ins, track her menstrual cycle, and maintain her profile and subscription. Post-MVP adds assigned training and nutritional programs, workout logging, and in-app messaging. Clients with a regular cycle and clients without an active cycle (amenorrhea, post-menopause, hormonal contraception) receive the same level of personalized coaching.

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

1. **Accounts exist only by invitation.** Nobody can sign up on her own. The coach's account is provisioned by the operator; a client's account is created from the invitation her payment triggers. Sign-in uses an email one-time code; creating an account from an invitation needs no code.
2. **Client accounts are invite-only.** A completed payment creates the client and sends her invitation. The invitation is valid for 30 days and can be used once. An expired, used, or unknown invitation link shows the same unavailable page, whichever the reason. Until the client's account exists, the coach can re-send the invitation from her client detail page; each re-send replaces the earlier link, which stops working at once, and restarts the 30 days. A re-send whose email cannot be sent is reported to the coach so she can send it again.
3. **Client portal access requires invitation, a coaching subscription that has not ended, and submitted onboarding.** A client signing in before her onboarding is submitted is held on the welcome screen or her onboarding and cannot reach the rest of the portal until she submits it. A client whose coaching subscription has ended reaches only the page of Business Rule 67.
4. **Coach portal access is restricted to the coach role.** Signed-in accounts without the required role see a clear denied-access page.
5. **Every account has exactly one role, client or coach.** There is no account without a portal.

## Coaching Sales

A **payment link** is the unique link, sent by email after an assessment call, through which the visitor chooses a coaching bundle and pays for it. Her **price tier** is regular or reduced and is resolved from the call's email: reduced when that email holds a reduced-price waitlist allocation (Business Rule 17) in any campaign, regular otherwise. Her **start choice** decides when her program starts: immediately, or after the 14-day withdrawal period. A **coaching subscription** records what she paid for: the coaching bundle, price tier, amount, start choice, and whether it has started. Every assessment call that has ended has a **sales state**: held (no working payment link), payment link sent (a working payment link, not yet paid), or paid (the call's payment created a client). Every client has one **client status**: Invited (she has paid and has no account yet), Onboarding (her account exists and her onboarding is not yet submitted), Awaiting review (her onboarding is submitted and the coach has not opened it), In review (the coach has opened it, or the client has answered a detail request), Needs details (a detail request is open), Approved (the coach has approved her answers), Cancelled (her coaching subscription is cancelled and has not ended), or Inactive (her coaching subscription has ended); once her account exists, Cancelled and Inactive take the place of her onboarding statuses. Active is reserved for when her program has started. A **detail request** is the coach's request that the client revisit named questions of her submitted onboarding, with a note on what is missing; a client has at most one open detail request at a time, and it closes when she answers it. A client's **client profile** holds what she stated at onboarding: her height, activity level, primary goal, dietary restrictions, and her own notes. Who she is (her name, email, date of birth, gender, country, and phone as she gave them when booking) belongs to her client record, and her weight stays in her dated measurement entries: her starting weight is her first entry and her current weight her latest. The client profile is created when she sends her onboarding, follows her answers when she answers a detail request, and does not exist before she sends. The coach edits it in a later story.

6. **Three coaching bundles: 1 Month, 3 Months, and 6 Months.** Longer commitments have lower per-month pricing; all bundles include the same benefits. Pricing is public, but checkout is available only through a payment link. The coach can send a payment link only for an assessment call that has ended. A payment link works for 30 days from when it is sent; a re-send replaces it and the earlier link stops working at once; a payment spends it. The platform records at most one payment per assessment call. Before paying, the visitor chooses a coaching bundle and a start choice; the start choice has no default and is required. The payment is a recurring subscription charged in euros once per bundle length (every 1, 3, or 6 months) at her price tier, and the buyer's email is fixed to the call's email. A completed payment creates the client with the call's booking profile (first name, last name, email, date of birth, gender, primary goal, country, and phone) and a coaching subscription that has not started. The payment provider's receipt is the payment record; the platform sends no receipt. A client may hold several coaching subscriptions over time, at most one that is not ended.
7. **Every coaching subscription has a 14-day withdrawal period from the payment.** Her start choice decides whether her program starts immediately or once the withdrawal period ends (Business Rule 6). While her start choice is to start after the withdrawal period and that period has not ended, she can ask the coach to start now: her start choice changes to starting immediately, and from then on she cancels under the terms of that start choice. Cancellation, refunds, renewals, and the end of her coaching subscription follow Business Rules 63–67.
8. **The coach sees each client's coaching subscription**: its coaching bundle, payment date, start choice, whether her program has started, whether she paid the reduced price, when it ends or ended once it is cancelled or has ended, and any refund due until it is refunded. She also sees each ended assessment call's sales state.

## Assessment Calls

An **Assessment Call** is a free 30-minute video call between a visitor and the coach, booked from the public site without an account. It has the visitor's first name, last name, email, date of birth, gender, primary goal, country, optional phone, and optional notes, a start time, the visitor's time zone, the coach's time zone, and a join link. The **primary goal** is the visitor's own stated aim, one of Lose weight, Build muscle, Build strength, or Maintain but improve lifestyle; it is distinct from the coach-created Goal. The public site words the call simply as "call"; "Assessment Call" is the product's name for it.

9. **Every assessment call lasts 30 minutes and reserves the coach for a full hour.** Slots start on the hour, one per hour, because each call reserves the 30 minutes after it as a buffer. The visitor sees only the 30-minute call; the buffer and the 60-minute reservation are never shown to her.
10. **The coach sets her availability: the weekdays and the daily hour interval in which she takes assessment calls and check-ins.** Any of the seven weekdays can be chosen, and at least one must be. Start and end are whole hours between 00:00 and 24:00 with the start before the end; slots start on the hour from the start hour, the last one an hour before the end hour (17:00 to 20:00 yields 17:00, 18:00, and 19:00). The hours are the coach's own local time and are saved together with her time zone. Until she saves for the first time, availability is Monday to Friday, 17:00 to 20:00 Europe/Bucharest. One availability serves both: a check-in is offered inside the same weekdays and hours (Business Rule 45). A change applies only to what is offered from then on: calls already booked stay booked, keep blocking their hour, and stay listed, and so do check-ins already requested or approved.
11. **A slot is offered only when it lies inside the coach's availability, starts at least two hours from now, falls within the next 30 days, and is not taken.** A slot is taken when its hour overlaps time already reserved by a booked call or by a pending or approved check-in (Business Rule 45). A taken slot is refused identically whoever holds it, including the visitor's own earlier booking, so the answer never reveals who holds a slot. A day without an open slot cannot be selected.
12. **One email address holds at most one upcoming assessment call.** A booking for an address that already holds one is refused with a generic message that reveals nothing about the existing call: no date, time, join link, or booking reference. Past calls do not block a new booking.
13. **A booking sends two emails in the platform's shared email styling: a confirmation to the visitor and a notification to the coach.** The visitor's confirmation greets her by first name. The coach's notification carries the visitor's full name, email, phone when given, age with date of birth, gender, primary goal, and country. Each carries her notes when given, the call's date and time in the recipient's time zone with the zone named, the 30-minute duration, the join link, an add-to-calendar action for Google Calendar, and a calendar file that opens in Apple Calendar, Outlook, and Google Calendar in the recipient's local time. Nothing is written to the coach's calendar and no reminder is sent.
14. **Every assessment call meets in the coach's single meeting room.** The coach sets the meeting room's link in her settings: one absolute `https` URL, or empty while she has none. Each call has a join link, a platform link for that call that stays valid indefinitely and redirects, when opened, to the meeting room current at that moment, so a room change reaches every call, including those in emails already sent. Approved check-ins meet in the same room (Business Rule 49). While no meeting room is set, the join link of a known call shows a page saying the call link is not ready yet and reveals no call detail; the join link of an unknown call shows a privacy-safe not-found page. A join link keeps working in waiting list mode.
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

A **Check-in** has a client, a coach, a date and time, a kind (`recurring`, `ad-hoc`, or, Post-MVP, `program review`), a status (`pending`, `approved`, `passed`, or `cancelled`), who initiated it, who proposed its current time, an optional linked plan, an optional note of up to 500 characters from either party, and a reschedule count. A check-in lasts one hour and starts on the hour. A check-in is pending until the other party agrees to its time, approved once agreed, and passed once its approved time is over; whether the meeting actually took place is not tracked. A check-in that was moved keeps its earlier time and is shown as rescheduled.

42. **Recurring check-ins are auto-approved.** In the MVP, recurring check-ins are managed independently of a training program. Post-MVP, assigning a plan generates weekly check-ins for the plan's duration, linked to the plan, with a configurable frequency defaulting to one per week (default slot Wednesday 10 AM). They need no approval. Post-MVP, a program review is a mandatory check-in the client books when her program is ready; booking approves it, and she can move it to another open time but neither party can cancel it.
43. **Ad-hoc check-ins require approval from the other party.** The client asks for one from her Check-ins page; the coach schedules one from the client's record, only for a client who can answer: one who has sent her onboarding and whose coaching has not ended. Post-MVP, they can also initiate them from the messaging area or chat. Either party picks a time offered under Business Rule 45 and may add a note, which the other party sees attributed to its author. The party who did not request the check-in approves or declines it, and the party who requested it may withdraw it while it is pending. A client whose coaching has ended cannot ask for a check-in (Business Rule 67).
44. **A client has at most one pending ad-hoc request at a time.** Only an ad-hoc check-in she requested that is still pending counts; a check-in the coach requested and a new time the coach proposes for another check-in do not, and the coach's requests have no such limit. While one is pending, the client cannot submit another, and the action is disabled with an explanation of why. A pending request holds its hour (Business Rule 45).
45. **Scheduling uses coach availability.** Check-in times are offered inside the coach's saved availability (Business Rule 10): the same weekdays and hours, and the same one schedule, as assessment calls. They start on the hour from the start hour, the last one an hour before the end hour. A time is offered only when it starts at least 24 hours from now and falls within the next 30 days, and a day without an offered time cannot be selected. A pending request holds its hour: no assessment call can be booked over it and no other request can take it. An approved check-in keeps holding its hour. A declined, withdrawn, or cancelled check-in frees it. Likewise, a booked assessment call takes its hour from the times offered for check-ins. These rules apply to new check-ins and reschedules alike.
46. **Either party can propose a new time for an approved check-in.** The original slot is released and the check-in is pending again. The other party can accept the new time, decline, or counter-propose. A proposal may carry an optional note. Post-MVP, that note also appears in the chat thread.
47. **Cancellation is final.** Declining a request or a new time cancels the check-in; it never reverts to the original time. The party who sent a new request can withdraw it while it is pending. The coach can cancel any approved check-in except a program review; the client can cancel only an approved ad-hoc check-in. A pending check-in that reaches its time unanswered is cancelled automatically, without any message to either party, and so is every check-in that falls after the client's coaching ends.
48. **At most 2 reschedule rounds per check-in.** Without agreement after 2 rounds the check-in is automatically cancelled.
49. **Check-ins meet on Google Meet, in the coach's meeting room.** The client and coach portals each offer a "Join Meet" link for every approved check-in until it ends; it becomes the main action from 10 minutes before the start until the check-in ends. The join link is a platform link that opens the coach's meeting room current at that moment (Business Rule 14), and only the check-in's client and the coach can use it. While no meeting room is set, the join link says it is not ready yet. A check-in that is not approved, or whose time is over, has no join link.

## Menstrual Cycle

50. **Every female client has a menstrual cycle profile**, created during self-onboarding and visible to the coach. It records whether she currently gets a period and how regular it is, her contraception, whether she is pregnant, postpartum, or breastfeeding, and whether she is in perimenopause or menopause. When she gets a period, it records her average cycle length, or her shortest and longest cycle when it is irregular, and the day her last period started; she may say she is not sure of her cycle length or her last period start. It also records any gynecological condition a doctor has diagnosed, the symptoms that come back regularly, and whether she tracks her cycle in an app. The coach's program adapts to her cycle phases only when she gets a period, is not on the combined pill, is not pregnant, postpartum, or breastfeeding, and is not in perimenopause or menopause; otherwise it adapts to the symptoms she reports. When her contraception is one the product does not classify, the coach decides how her program adapts.
51. **Current cycle phase is derived** from the last recorded period start date and the client's average cycle length, and shown on the client dashboard and the coach's client detail page.
52. **Clients without an active cycle are fully supported.** Cycle tracking and cycle-driven adjustments are gracefully skipped or replaced with non-cycle-based coaching.

## Legal and Public Submissions

53. **The current Privacy Policy and Terms & Conditions are dedicated public pages** at `/privacy` and `/terms`, each showing its version and effective date. Every public page ends with links to both, in normal and waiting list mode.
54. **Every public submission rejects bot-driven attempts before it affects system state.** This covers waitlist capture (hero, footer, pricing page), store acquisition for logged-out buyers, assessment call booking, and any future public submission point. The mechanism must offer accessible alternatives or require no visual or motor input, in keeping with the WCAG AA target.
55. **On the production site, forms accept only a person's main email address; a subaddressed address (name+tag@domain) is refused.** Test environments accept subaddresses.

## Client Resources

56. **A resource belongs to one client.** The coach gives a client a file with a title, an optional description, and tags. Only the coach and that client can see or download it.
57. **A resource is one file:** a PDF of at most 50 pages, an image, or a Word or Excel document, up to 25 MB. A file of another type or over a limit is refused with a clear message, and the coach keeps what she entered.
58. **PDFs and images can be read in the portal, page by page. Word and Excel documents are download only.** Every resource can be downloaded as the original file.
59. **Tags are one vocabulary across all of the coach's clients.** Tags that differ only in letter case are the same tag, a resource holds a tag once, and a tag exists only while a resource carries it.
60. **The coach can change a resource's title, description, and tags, or delete it.** The file itself is not replaced. Deleting asks for confirmation and removes the resource for the client at once.
61. **A resource is new for the client until she opens it.**
62. **A client's resources follow her portal access.** Once her coaching ends she can no longer reach them (Business Rule 3); the coach keeps them on the client's record.

## Coaching Subscriptions

A coaching subscription is **cancelled** when it will no longer renew and the client keeps her access until a set date; it has **ended** once her access is over, on that date or at once when a cancellation ends it immediately. A **refund due** is what the coach owes a client after her cancellation: an amount in euros, the reason it is owed, and a deadline 14 days after the cancellation. A **payment problem** is a renewal payment that failed and has not been paid since. The payment provider holds payments, renewals, refunds, and the client's card; the platform never holds card details.

63. **A client can cancel her coaching subscription herself, on terms set by her start choice and when she cancels.** When her start choice is to start after the withdrawal period and that period has not ended, her coaching subscription ends at once and she is refunded in full. In every other case she is not refunded, whether her start choice is to start immediately or the withdrawal period has ended: her coaching subscription is cancelled, and she keeps access until her payment date plus her coaching bundle's length, or, once her program has started, until the end of the bundle length she has already paid for, when it ends. A coaching subscription that is already cancelled or ended has nothing to cancel.
64. **Refunds are issued by the coach in the payment provider; the platform tells the coach what is due and records what was refunded.** A cancellation with a refund records a refund due, emails the coach its amount and deadline, and marks the client as needing a refund. The coach sees what is still due until the payment provider reports it refunded: a partial refund lowers what is due, and a full refund records the date she was refunded and clears the marker. A refund the coach issues when none is due is recorded as refunded too. The coach has no cancel or refund action in the platform.
65. **No renewal is charged before her program starts.** From her payment until her program starts, renewal is held and nobody is charged. A failed renewal payment shows the client a payment problem until a renewal is paid; the payment provider retries the payment and emails her. Until her coaching subscription ends she can update her card on the payment provider's hosted page, reached from the client portal. She sees which card is on file (brand, last four digits and expiry).
66. **Cancellations and endings decided in the payment provider are mirrored by the platform.** When the coach cancels a coaching subscription in the payment provider, or the payment provider cancels it after every retry of a failed renewal has failed, the platform applies it as soon as the provider reports it: a cancellation set for a later date makes the coaching subscription cancelled until that date, lifting that cancellation restores it, and an immediate cancellation ends it. Such an ending records no refund due.
67. **When her coaching subscription has ended, her portal access ends; her account and her history stay.** Every portal page leads her to one page saying her coaching has ended, with no action. While a refund is due, that page also tells her the coach will refund her and when to expect it.

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
5. A completed payment sends the client one invitation email; she creates her account from it in one step and lands on a welcome screen shown once.

### Client self-onboarding

6. Until her onboarding is submitted, the client portal holds her on the welcome screen or the onboarding, and the public navigation offers to finish her onboarding.
7. The onboarding has five parts: her goal and her week, safety questions, her cycle and hormonal health, food and daily life, and her measurements. A client whose gender is male or prefer not to say has four parts; the cycle part is skipped.
8. She completes the onboarding in her own time. Every change is saved to her account as she goes, and on any device she resumes where she left off. While her connection is down, her unsent changes stay on her device and she is told they are not saved yet; they are saved once her connection returns.
9. She chooses her measurement units once, in the first part, and every screen shows her weights, height, and body measurements in those units. Values are kept in metric whichever units she chooses.
10. Her health and cycle answers need her explicit consent: the safety part asks for it first, and she cannot continue without giving it.
11. The safety questions are the PAR-Q+ questions followed by a declaration, and all of them are required. A client younger than 15 or older than 69 answers none of them; the coach screens her directly. When every answer is no, she is told she is clear to continue.
12. The last part records her body measurements and her progress-photo consent. She can send her onboarding only after acknowledging the disclaimer.
13. Sending freezes her answers as her submission and records her measurements, with the weight from the first part, as her first dated measurement entry, and creates her client profile. She moves to "Sent to your coach", and the dashboard opens showing that status. When her start choice is to start after the 14-day withdrawal period, the dashboard also tells her the date the coach starts working on her program. An onboarding is sent once; a second send is refused.
14. Once her onboarding is submitted, the welcome screen and the onboarding are no longer reachable, and the public navigation offers the Client Portal.
15. The coach reads her submission from the moment it is sent. Before then she sees only the client's client status, never her unsent answers. Opening the submission starts the review.
16. From the review the coach either approves the answers or asks for more details, naming the questions to revisit and what is missing. While a detail request is open she can neither approve nor ask again.
17. Asking for more details tells the client by one email and on her dashboard. The email repeats neither the questions nor the coach's note. From her dashboard the client answers only the asked questions, and her submission returns to review with those answers updated. The loop may repeat.
18. Approval is final: it closes the review, and no detail request can follow.

## 4. Client Portal (`/client`)

### Dashboard

1. The dashboard shows where her onboarding stands. After "Sent to your coach" it reads "Your coach is reviewing your answers" once the coach opens her submission or she answers a detail request; "Your coach needs a few more details" with the coach's note and a way to answer the asked questions while a detail request is open; and "Your answers are approved" with the news that her program is being built once the coach approves. When her start choice is to start after the withdrawal period, the date the coach starts working on her program stays on every state while her answers are with the coach; while a detail request is open, the coach's note takes its place. Until that date she can ask the coach to start now from the dashboard (Business Rule 7). While a payment problem is open, the dashboard says so and offers to update her card (Business Rule 65).

### Training dashboard and plan — Post-MVP

2. The dashboard shows the client's next workout or day from the assigned plan and her current cycle phase.
3. Clients are notified when a new plan is assigned or updated.
4. The plan view offers week navigation limited to current and past weeks, day cards with Past, Current, and Upcoming status, and a way to start each training day.
5. Clients can adjust the default schedule within the allowed bounds (Business Rule 35).

### Workout Viewer and active tracking — Post-MVP

6. A distraction-free, mobile-optimized Workout Viewer shows exercises in order with number, name, equipment, primary muscles, sets, reps, RIR, coach notes, and demo video. Superset exercises appear as a visually connected group and follow an alternating set pattern (A1, B1, A2, B2) during tracking.
7. Clients log actual weight and reps per set. After a set, a rest countdown starts from the coach-configured rest time; the client can extend it by 15 seconds per press or skip it, and actual rest is recorded.
8. Clients can swap the current exercise for any coach-defined variant at any time.
9. On completion the client sees total duration, total volume (weight × reps), muscle groups worked, a per-exercise comparison of logged against prescribed values, and highlighted all-time personal records. Completing early uses an "End workout" action in the viewer's options menu (Business Rule 39).

### Messaging (`/client/messages`) — Post-MVP

10. Chat with the coach shows a coach profile sidebar (photo, name, role, response-time note), message bubbles with timestamps and read receipts, and a menu with Search in chat, Mute/Unmute notifications, Archive conversation, and Delete conversation. Delete confirmation uses a styled modal dialog, never a browser-native confirm. There is no call or video button.
11. A "Schedule check-in" action submits an ad-hoc request per Business Rules 43–45 and is disabled while a request is pending.
12. An upcoming check-in banner at the top of the chat shows the next approved check-in's date, time, and kind.
13. The sidebar has a "Next Check-in" widget with date, time, a "Join Meet" button, and a link to the Check-ins page.

### Check-ins (`/client/checkins`)

14. Organized into Upcoming (approved check-ins with Join Meet, the option to propose a new time, and cancellation where Business Rule 47 allows it), Requests (check-ins awaiting her answer first, which she can approve, reschedule, or decline; then those waiting for the coach: her own pending request, which she can withdraw, and new times she proposed), and Past (passed and cancelled). On both portals, a check-in shows its kind unless it is recurring, who requested an ad-hoc check-in or proposed a pending new time, and who wrote its note. Each tab can be narrowed by kind, and Requests also by whose answer is awaited, each option showing how many check-ins it matches; Requests lists the check-ins awaiting the viewer's answer first, and the client's Requests tab shows how many await her answer. Every tab sorts by check-in date with a direction toggle (Upcoming and Requests start soonest first, Past newest first), shows ten check-ins per page with page controls and a "Showing a–b of n" line, keeps its tab, filters, sort, and page across a reload, and offers to clear the filters when they hide every check-in.
15. New ad-hoc requests can be made from this page: she picks an open time (Business Rule 45) and may add a note (Business Rule 43), under the one-pending limit (Business Rule 44). The page is reachable from portal navigation and from the Next Check-in widget. Post-MVP, actions here and in chat stay in sync.

### Menstrual cycle tracking (`/client/cycle`)

16. Clients log period entries by date with flow intensity (spotting, light, medium, heavy), symptoms (cramps, bloating, headache, fatigue, mood swings, back pain, breast tenderness, nausea, acne, insomnia), and optional notes.
17. A cycle calendar shows logged period days and the current phase.

### Settings (`/client/settings`)

18. Clients choose units for body weight and training loads (kilograms or pounds) and height (centimetres or feet and inches). The choice applies everywhere a weight or height appears, including profile, dashboard, live logging, and the completion summary, and persists across sessions.
19. Her coaching subscription: her coaching bundle and what she pays, when it renews or, once cancelled, when it ends, the cancellation open to her with its terms (Business Rule 63), and her payment method, which she updates on the payment provider's hosted page (Business Rule 65). Cancelling asks her to confirm and lets her keep her coaching instead. A payment problem is shown here too.

### Resources (`/client/resources`)

20. Reached from portal navigation, which marks the entry while she has resources she has not opened. Her resources show newest first, each with its first page or a file cover, its file type, title, and tags, and a "New" marker until she opens it (Business Rule 61).
21. She narrows them by tag and by a search on the title; the tags offered are those on her own resources. The page has its own empty states for no resources yet and for no matches.
22. Opening a resource shows its pages when it can be read in the portal (Business Rule 58), with its description, tags, file type, size, and the date it was added, and a download action.

## 5. Coach Portal (`/coach`)

### Dashboard

1. Opens to a greeting stating how many assessment calls the coach still has today (calls dated today that have not ended) and an "Upcoming calls" widget listing her next three calls that have not ended, soonest first, each with the visitor's name, the call's date and time, a Today badge when it is today, and its join link, plus a link to the full assessment calls list. With no upcoming call the widget says so and still links to the list.
2. Managed clients, pending check-ins, and important client information. The "Pending Check-ins" card lists the check-ins awaiting the coach's answer, the subtitle states how many there are, and each "Review" action opens that check-in on the coach's Check-ins page.

### Assessment calls (`/coach/assessment-calls`)

3. Reached from the sidebar "Assessment calls" entry. Lists every assessment call with the visitor's full name, her email as a mail link, her phone as a tel link when given, her age with date of birth, gender, primary goal, and country, the call's date and time, her notes when she left any, a Today badge when the call is today, and its join link while the call has not ended. A call is upcoming until it ends and past afterwards; upcoming and past calls are visually distinct, upcoming calls list soonest first, past calls list most recent first, and past calls carry no join link. A filter offers All (the default), Upcoming, Today, and Past. A Status filter narrows the list to one sales state (held, payment link sent, or paid) or shows all of them (the default), and each option shows how many calls it matches under the current filter and search. The coach sorts the list by scheduled date, booking date, name, or email, with a direction toggle: dates start soonest or newest first and text starts A to Z, and reversing the scheduled date reverses the whole listing order. A search box narrows the list by the visitor's first name, last name, or email. The list shows ten calls per page with page controls and a "Showing a–b of n" line; the active filters, sort, search, and page survive a reload and a return from another page, and the page resets to the first when a filter, the sort, or the search changes. Each filter has its own empty state: no upcoming calls, no calls today, no past calls, no calls yet, no matches for a search, and no calls in the chosen sales state. A call booked on `/book` appears on the next load, and a call that has ended moves from Upcoming to Past without any action. Each ended call shows its sales state (Business Rule 8). A held call offers to send a payment link and a call whose payment link was sent offers to re-send it; either asks the coach to confirm, then emails the payment link to the call's email (Business Rule 6), and an email that cannot be sent is reported so she can send it again. A paid call links, in place of a sales action, to the client detail page of the client its payment created.

### Clients (`/coach/clients`)

4. Reached from the sidebar "Clients" entry. Lists every client from the moment she pays, with her name and email, client status, coaching bundle, and join date (her payment date). A Status filter narrows the list to one of three groups, Onboarding (Invited through Approved), Active, and Inactive (Cancelled and Inactive), or shows all of them (the default), and each option shows how many clients it matches under the current search. A search box narrows the list by name or email. The coach sorts the list by name, client status, coaching bundle, or join date; join date newest first is the default. The active filter, sort, and search survive a reload. The list has its own empty states for no clients yet and for no matches. A client with a refund due carries a Needs refund marker in the list and on her client detail page until it is refunded (Business Rule 64). Each client has a client detail page showing her age, gender, country, and phone from her client record, and her height, starting and current weight, activity level, primary goal, dietary restrictions, and her notes once she sends her onboarding; her invitation's state with a re-send until her account exists (Business Rule 2); her coaching subscription (coaching bundle, payment date, start choice, program start, renewal, whether she paid the reduced price, when it ends or ended, and any refund due with its reason and deadline, then the date she was refunded); her client status and, once her onboarding is submitted, her answers with the safety and cycle signals that need the coach's attention and the review actions; her first measurements; and, last and closed until the coach opens it, her assessment call as she booked it (its date and time, her name, email, date of birth, gender, country, and phone, the primary goal she booked with, and the notes she left when booking). Post-MVP it also shows assigned training and nutritional programs and links to completed workout history.

### Messaging (`/coach/messages`) — Post-MVP

5. A conversation list with client avatar (photo or initial), online status, unread count, and last message preview. Each conversation has a menu with Pin/Unpin, Mute/Unmute, Flag for follow-up, Archive, and Delete; delete confirmation uses a styled modal with a warning icon. There is no call or video button. The coach can navigate from a conversation directly to that client's profile.
6. Send and attach actions are visually centered and polished. Notification UI adapts to available space and never renders outside the viewport.
7. An upcoming check-in banner at the top of the active chat shows the next approved check-in for that client. The coach can initiate an ad-hoc check-in from here.
8. Pending requests and reschedule proposals appear as action cards in the message stream with client name, requested date and time, optional note, and Accept and Decline buttons. Acting updates the check-in immediately and fires a notification.

### Workout review and history — Post-MVP

9. Completed workouts are grouped by subscription, then plan, then week. The coach can filter by date range, session duration, session volume, and muscle groups trained (a session matches when at least one exercise trains a selected group; multiple groups may be selected). For the current selection the coach sees session count, total volume, average volume per session, and average duration.
10. Each workout review shows logged against prescribed weight and reps per set, rest taken against prescribed, swaps made, compliance percentage, duration, and volume. Volumes use the coach's unit setting.

### Check-ins (`/coach/checkins`)

11. Reached from the sidebar "Check-ins" link, whose badge counts the check-ins awaiting the coach's answer, and opens on Requests. Three tabs, as on the client's page: Upcoming (approved check-ins sorted by date, each offering Join Meet (Business Rule 49), a new time, and cancellation per Business Rule 47), Requests (every pending check-in across clients, those awaiting the coach's answer first, each with approve or accept, reschedule, and decline, then those waiting for clients, where she can withdraw a request she sent), and Past (passed and cancelled). Each tab has an empty state. Filtering, sorting, and paging work as on the client's Check-ins page, and the coach can also search by client name.

### Settings (`/coach/settings`)

12. Reached from the sidebar "Settings" entry. A "Calls and check-ins" section holds the coach's availability (weekdays, start hour, end hour), which serves assessment calls and check-ins alike, and the meeting room link per Business Rules 10, 14, and 49, showing the defaults until she has saved once. Saving with no weekday, a start at or after the end, or an invalid link is refused with an inline explanation that keeps the entered values; a valid save confirms with a toast and is live at once for the next visitor or client; a server failure shows an error toast and keeps the entered values. While the meeting room link is empty, the section warns that visitors and clients cannot join calls or check-ins until a link is set.
13. The coach chooses units for weight and height. The choice applies across her views, including workout-history volumes and the session-volume filter.

### Client resources (`/coach/clients/:id/resources`)

14. Reached from the client detail page. Lists that client's resources as the client sees them, with the same tag filter and title search, and a sort by date added (newest first by default) or title.
15. The coach adds a resource by choosing a file, with the title prefilled from the file name. While she types a tag, existing tags are suggested (Business Rule 59). A failed upload keeps her entries for retry.
16. From a resource she opens the same view the client sees, edits its details, or deletes it (Business Rule 60).

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
3. Types: new message; check-in requested (by client or coach); check-in approved; reschedule proposed; check-in cancelled (by decline, withdrawal, or cancellation). The requesting party is notified on approval and on decline; the other party is notified when a request is withdrawn; both parties on cancellation of an approved check-in. A request that reaches its time unanswered is cancelled without any notification. In the MVP, each request, approval, decline, and withdrawal is emailed to the party that did not act, with the check-in's date and time in the recipient's time zone; an approval email carries the check-in's join link and a calendar invite.

## 8. Shared Requirements

1. One consistent visual language across all pages and portals; cards, modals, forms, and navigation feel familiar throughout. The design system in code is the source of truth for visual decisions.
2. WCAG AA: 4.5:1 contrast for normal text, 3:1 for large text, controls, and meaningful graphics. Complex interactions, especially plan building, have accessible alternatives. All animations respect reduced motion.
3. Works on mobile, tablet, and desktop; layouts adapt without breakage, and content never clips, overflows, or becomes unreadable.
4. No dropdown for two or fewer options.

---

# Deferred

- Full blog CMS, authoring workflow, categories, and search
- Real payment processing for paid store products
- Per-call meeting room generation through a video provider. Every assessment call and check-in shares the coach's single meeting room (Business Rules 14 and 49)
- Rich analytics and reporting; advanced search across clients
- Plan version history or changelog
- Per-client configurable check-in frequency (default weekly today)
- Mandatory end-of-block review check-ins, introduced with training programs
- Reminders and calendar writes for assessment calls and check-ins. The add-to-calendar action and calendar file in the booking emails (Business Rule 13) and the calendar invite in the check-in approval email (Notifications item 3) are in scope; writing to the coach's calendar is not
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
7. Business Rule 12 treats a call as upcoming until it starts, while the coach portal treats it as upcoming until it ends. May a visitor whose call is in progress book another one?
