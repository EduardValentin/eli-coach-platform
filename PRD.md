Absolutely — I pulled the requirements from your attached chat history and turned them into a cleaner PRD you can use as the basis for user stories. I normalized a few things that became clearer later in the conversation, especially that the system uses **Plans** rather than treating the whole 4-week block as a “workout,” that clients can have **at most one active plan**, that the app uses a **global Dev Toggle** to mock app states and backend conditions, and that the product includes a landing page, coach portal, client portal, blog, and digital store. 

# Product Requirements Document

## Product Name

Women’s Fitness Coaching Platform

## Document Purpose

Define the product scope, users, business rules, functional requirements, UX expectations, and success criteria for a women-focused online coaching platform that combines marketing, coaching operations, training plans, client experience, and digital product sales. This PRD is intended to be decomposed into epics, features, and user stories. 

## Product Summary

This product is a premium, women-focused fitness and nutrition platform for a personal trainer who offers 1-on-1 online coaching, tailored workout plans, menstrual-cycle-aware nutrition guidance, educational content, and digital products. The platform needs to support both public-facing discovery and private coaching workflows. The experience should feel warm, premium, elegant, and modern, while remaining accessible, responsive, and grounded in a reusable design system. 

## Product Goals

The product should:

* Convert visitors into booked assessment calls through a high-quality landing page.
* Support invite-only onboarding into paid 1-on-1 coaching.
* Give the coach operational tools to manage clients, create exercises, build multi-week plans, assign plans, and communicate with clients.
* Give clients a clear, supportive portal to follow their assigned plan and adjust scheduling within allowed constraints.
* Sell free and paid digital products through a digital store.
* Maintain a premium, human brand voice and consistent design system across the experience. 

## Non-Goals

For the current product definition:

* Real third-party/backend integrations are not required; behavior is mocked.
* Real payment processing is not required yet.
* Real email delivery is mocked.
* Advanced analytics, admin roles beyond the coach, and community/social features are not in scope unless added later.
* Automatic training prescription logic is not required; the coach remains in control of formulas, exercise prescription, and deload adjustments. 

## Core User Types

### 1. Visitor / Prospect

A woman discovering the coach through the public site. She can browse the landing page, blog, and digital store. She can view 1-on-1 bundles, but cannot check out for coaching unless she has a unique token after an assessment. 

### 2. Client

An invited paying customer with an active subscription. She can access the client portal, receive assigned plans, view her next workout/day, receive notifications, and adjust the default workout schedule within allowed limits. The program supports both clients with a regular menstrual cycle and clients who do not currently have an active menstrual cycle (e.g., amenorrhea, post-menopause, hormonal contraception); both groups receive the same level of personalized coaching support. 

### 3. Coach

The trainer running the business. She can access the coach portal, onboard clients, calculate calorie/macro targets per client, manage chats, jump from chat to profile, create exercises, build plans, save drafts, assign plans, and manage upcoming work. 

## Product Principles

The product should consistently feel:

* Premium and elegant
* Warm, supportive, and women-focused
* Competent and trustworthy
* Clean, modern, and pleasant to use
* Responsive and accessible
* Consistent in visual language and interaction patterns across all areas of the product

## Brand and Content Principles

Brand voice must feel personal, human, empowering, supportive, and confident. It should avoid generic AI-sounding phrases such as “unlock your potential,” “world-class,” “seamless experience,” and “transformative.” Emoji-heavy copy and excessive exclamation marks should be avoided. Brand colors and design tokens are documented separately in the design system documentation.

---

# Scope Overview

## Public Experience

* Landing page
* Blog
* Digital store
* Coaching bundles visibility
* Assessment call conversion flow
* Legal pages (Privacy Policy, Terms & Conditions)

## Private Experience

* Client portal
* Coach portal
* Messaging/chat
* Client onboarding (coach-side and client self-onboarding)
* Plan and exercise management
* Menstrual cycle tracking

## Shared Platform Utilities

* Global Dev Toggle to simulate roles and states
* Responsive navigation
* Notification UI
* Mocked cart/session/auth/payment/backend behaviors

---

# Business Rules

1. **Client accounts are invite-only.**
   The coach onboards a client from the coach portal, which records her details and sends her an invitation. She becomes an account holder when she follows that invitation and signs in.

2. **Client portal access requires both invitation and active subscription.**
   Only invited clients with an active subscription may access the client portal. 

3. **Coach portal access is restricted to the coach role only.** 

4. **1-on-1 coaching checkout is token-gated.**
   Three coaching bundles are offered — 1 Month, 3 Months, and 6 Months — with lower per-month pricing for longer commitments. All bundles include the same benefits. Bundle pricing is visible on the pricing page, but checkout is unavailable unless the user has a unique token in the URL, received after the assessment call. 

4a. **The 3- and 6-month plans have a 7-day cancellation window, after which the full plan commitment applies.**
   On the 3-month and 6-month plans, a client may cancel within the first 7 days if coaching is not the right fit; after the first 7 days the client is committed to the full plan term. The 1-month plan is month-to-month and is not subject to this term commitment.

5. **Digital store is public, but purchase/download capture requires email at minimum for logged-out users.** 

6. **Clients may have at most one active plan at a time.** 

7. **Plan templates default to 4 weeks and include 1 deload week by default.**
   The deload week should be visually distinguished and the coach should be prompted to manually adjust volume/intensity. The system should not auto-modify plan variables. When starting a client plan, the coach may start with fewer weeks and add more incrementally.

8. **The coach sets a default schedule for a plan.**
   Clients may adjust the schedule only in ways that fit their needs, implying limited flexibility rather than unrestricted restructuring. 

9. **Exercise videos are uploaded as raw `.mp4` files.**
   The creation flow should support drag-and-drop upload and a standard upload button. 

10. **The app should be fully operable in mocked/dev mode.**
    A floating Dev Toggle must support state switching such as authenticated user, client, coach, bundle purchased, waiting list mode, and similar scenarios.

11. **Clients may have at most one pending ad-hoc check-in request at a time.**
    A new request cannot be submitted while one is pending coach approval.

12. **Recurring check-ins are auto-confirmed when a plan is assigned.**
    The system generates weekly check-ins (configurable) for the duration of the plan. These do not require coach approval.

13. **Check-in scheduling is bidirectional.**
    Both the coach and the client can propose, reschedule, accept, or decline check-ins. Ad-hoc check-ins require approval from the other party.

14. **The coach can initiate ad-hoc check-ins.**
    The coach can schedule a check-in with a client from the messaging area or from a client's profile page. Coach-initiated check-ins follow the same approval flow as client-initiated ones.

15. **Either party can propose a reschedule for a confirmed check-in.**
    When a reschedule is proposed, the original time slot is released and the check-in enters a "rescheduling" state. The other party can accept the new time, decline (which cancels the check-in entirely), or counter-propose a different time.

16. **Maximum 2 reschedule rounds per check-in.**
    After 2 reschedule rounds without agreement, the check-in is automatically cancelled.

17. **Declining a reschedule cancels the check-in.**
    If the receiving party declines a reschedule proposal rather than counter-proposing, the check-in is cancelled entirely — it does not revert to the original time.

18. **A reschedule proposal may include an optional message.**
    The message appears in the coach-client chat thread.

19. **Waiting list mode is controlled by the deployment environment setting `WAITLIST_MODE`. Coaching CTAs are hidden while the free store and content remain available.**
    The navigation bar shows the brand logo, Home, Store, Pricing, and the free-resource cart (auth and portal links are suppressed). The hero CTA switches to a waitlist email capture form. The About section "Start my plan" CTA is hidden. The footer CTA switches to waitlist-focused messaging. The free store and all landing page content sections (About, Platform, Workout Explanation, Cycle-aware Nutrition, My Method / Coaching Method) remain fully visible in both modes. The setting is applied while prerendering the deployment artifact so the landing page build does not require a database connection; an unset value defaults to waiting list mode.

20. **Every accepted public submission joins the same waitlist; exact allocation determines pricing.**
    The waitlist offers a limited number of reduced-price places. Every accepted submission joins the waitlist. The allocation recorded for that submission determines whether the visitor receives reduced pricing on every coaching bundle or joins at regular pricing. Joining remains open after all reduced-price places have been allocated. The pricing page is accessible in waitlist mode and shows reduced prices alongside regular prices only while reduced-price places remain open.

21. **Public waitlist availability is qualitative, delayed, and privacy-preserving.**
    Public surfaces show one of three labels — "Reduced-price spots available", "Limited spots", or "Reduced-price spots closed" — based on availability that updates at fixed half-hour intervals. They never expose an exact count, progress toward capacity, or an immediate availability change after a successful submission. If availability cannot be determined, a generic outage message is shown, ordinary waitlist signup remains open, and reduced-price claims are not shown.

21a. **Duplicate submissions receive the same generic browser success without changing their allocation.**
    Submitting an email that is already on the waitlist preserves its existing reduced- or regular-pricing allocation, refreshes its consent and retention period, and sends no additional confirmation email. The browser does not reveal whether an email was already registered: every successful new or duplicate submission receives the same generic confirmation and celebration.

21b. **Validation, bot verification, and server failures remain real error outcomes.**
    Invalid email addresses remain on the form for correction. Submissions that fail bot verification are rejected. Server failures ask the visitor to retry and provide the support email as a fallback. A newly accepted regular-pricing entrant receives a confirmation email stating that joining succeeded, reduced-price places were already full, and the signup does not include reduced pricing.

22. **Plans follow a template-instance architecture.**
    Plan Templates are reusable program structures the coach creates. Plan Instances are personalized copies assigned to a specific client and goal. Templates are optional — the coach can build a client plan from scratch or start from a template.

23. **Plan building is iterative, not one-shot.**
    The coach does not need to build the entire plan upfront. She can schedule 1–2 weeks at a time, and the client's active plan gets updated with new additions. The coach has full flexibility to decide how many weeks to schedule at once.

24. **Existing weeks in an active plan are immutable.**
    Once a plan is active and the client has started, the coach cannot delete weeks that were already part of the plan. Only newly added weeks can be removed. This protects the client's progress history.

25. **The coach can insert a deload week at any time.**
    If the coach and client agree (verbally or via messaging), the coach can add a deload week to the current plan at any point.

26. **The coach can end a plan and start a new one.**
    A plan does not have a hard end date. The coach can explicitly end the current plan (and its associated goal) and start a fresh plan with the same client.

27. **Each plan instance is tied to a client goal.**
    Goals define the training objective (e.g., Muscle Building, Fat Loss, Strength, Recomposition). A plan instance must be associated with a goal. Goals have their own lifecycle (active → completed).

28. **System messages are generated for plan and scheduling events.**
    When a coach creates or updates a client's plan, or when check-in scheduling events occur (reschedules, coach-initiated check-ins, cancellations), the system automatically sends a message in the coach-client chat thread and creates a notification for the relevant party.

29. **Workout logging records actual performance against prescribed values.**
    Each set in a workout is tracked individually with actual weight and reps. The system compares logged values to what the coach prescribed.

30. **Exercise swap variants are coach-controlled.**
    Only the coach can define which alternative exercises are available as swap variants. Clients may only swap to coach-defined variants during a workout.

31. **Rest time per exercise is coach-configured.**
    The coach sets a rest time in seconds for each exercise assignment. Clients can extend or skip the rest timer during a workout, but the prescribed and actual rest times are both recorded.

32. **Client self-onboarding is required before portal access.**
    When a client signs in for the first time after receiving an invitation and has not completed onboarding, the system redirects them to a multi-step onboarding wizard. The client cannot access the portal until onboarding is complete. This flow is controlled by a `needsOnboarding` flag in the Dev Toggle.

33. **Each client has a menstrual cycle profile.**
    The menstrual cycle profile stores cycle regularity (regular or irregular), average cycle length, average period length, conditions, and common symptoms. The profile is created during client self-onboarding and can be viewed by the coach.

34. **The current Privacy Policy and Terms & Conditions are dedicated public pages.**
    Each document shows its version and effective date. Every public page ends with links to both documents, in both normal and waiting list modes.

35. **Every public-facing submission must reject bot-driven attempts before they affect system state.**
    Any submission accessible to anonymous visitors — waitlist email capture (hero, footer, pricing page), digital store email capture and checkout for logged-out buyers, assessment call booking, and any future public submission point (contact, lead capture, comments) — must employ a bot detection mechanism. Bot-driven submissions must be rejected before they can consume waitlist spots, generate fake leads, place fake orders, or pollute downstream data. The specific detection mechanism is implementation-defined, but it must offer accessible alternatives or rely on approaches that do not require visual or motor input from the visitor, in keeping with the platform's WCAG AA accessibility target.

36. **A client's record exists before her account does.**
    The coach fills in a client's profile, measurements, goal and nutrition targets when she invites her, which is before that client has ever signed in. Holding the client role is what makes an email already a client; a visitor who has merely signed up to the site can still be invited to become one.

37. **An email that already belongs to a client cannot be onboarded again.**
    Onboarding an existing client is refused and nothing is saved. Email matching ignores letter case, and the casing the coach typed is kept on the record.

38. **A client has one pending invitation at a time.**
    Onboarding someone who has been invited but has not yet become a client updates her recorded details and replaces the pending invitation: the earlier link stops working, and the coach is told it has been replaced. This is the recovery when a client abandons the link partway. An invitation link is valid for 30 days and leads straight into client self-onboarding.

39. **A failed invitation email never discards the client's record.**
    When the invitation cannot be delivered, the profile, goal, targets and invitation are kept and the coach is told the record was saved but the email did not send, so she can send it again. Re-submitting the same details re-issues the link rather than creating a second client.

40. **The coach records a metabolic sex; the client records her gender.**
    The calorie calculation is defined for female and male only, so the coach chooses between those two when onboarding. The client sets her own gender during self-onboarding, and doing so does not change the figures already calculated for her.

---

# Functional Requirements

## 1. Landing Page

### Objective

Convert visitors into assessment calls and introduce the coaching philosophy, training approach, and cycle-aware nutrition model in a premium and memorable way. 

### Functional Requirements

1. A full-viewport hero section with a background video of the coach training people.
2. Hero content must include title, subtitle, and CTA placement that visually guides action.
3. Video controls must include play, pause, and restart.
4. A sticky responsive navigation bar must include brand/logo and useful links. This navigation bar exists only on the public site — it is not shared with the coach or client portals, which have their own sidebar navigation.
5. When authenticated, the public navbar must show "Client Portal" or "Coach Portal" as a visually prominent CTA that remains clearly visible against both the dark hero background and the light scrolled navbar.
6. An About section must include:

   * Text content about the coach
   * Glowing circular avatar
   * Short bio
   * Phone-style Instagram story widget
7. The Instagram story widget must allow:

   * Clicking the Instagram handle to open her Instagram page
   * Tapping/clicking through 4–5 story items
   * Updating top progress/story segment bars
   * Tapping a like button for delight
8. A platform capabilities section must communicate the four core app capabilities a visitor can expect:

   * Personalized workouts
   * Nutrition guidance (recipes, shopping list, daily calories, daily macros) presented as a single combined nutrition capability
   * Direct chat with the coach
   * Menstrual cycle tracking
9. A workout explanation section must:

   * Make day cards obviously interactive
   * Show concise explanatory detail when clicked
   * Include content for Strength, Recovery, Rest, and Hypertrophy days
   * Communicate that workouts adjust around the client's menstrual cycle and how she is feeling that week
   * Communicate that the program teaches correct exercise execution and form through demos and short coaching notes
10. A cycle-aware nutrition section must communicate, at a high level, how nutrition needs shift across menstrual cycle phases, using simple food and feel examples per phase:

    * Menstrual: warm, easy-to-digest food and higher iron
    * Follicular: lighter, fresher food
    * Ovulatory: raw vegetables and fiber
    * Luteal: complex carbs and root vegetables
11. A My Method / coaching method section must communicate the coach's philosophy, the audience the program supports, and the active coaching model:

    * The coach teaches clients how a woman's body actually works
    * Plans adjust to the client's individual needs and to her cycle phase when applicable
    * The program supports women who do not currently have an active menstrual cycle with the same personalized coaching approach
    * The coach actively reviews workouts, listens to client feedback, and adjusts the plan week by week
    * No restrictive diets or unsustainable routines
    * No forcing foods the client dislikes
    * Nutrition adapts to the client's body needs
12. The landing page must end with a footer CTA section. The footer is a reusable shell whose content changes based on mode:
    * In normal mode, it directs visitors to the digital store for free and paid products.
    * In waiting list mode, it shows waitlist-focused messaging, an email capture form, and the current qualitative availability when known.
13. The footer CTA section must animate as a sliding sheet:
    * Rounded top-left and top-right corners to visually overlap the section above
    * Sheet slides up as the user scrolls (scroll-linked, not a one-shot animation)
    * Text content fades in after the sheet settles into position
    * Creates a dramatic visual grab to capture attention
14. The cycle-syncing wheel must rotate based on normal page scrolling:
    * The wheel rotates as the user scrolls down the page
    * After one full 28-day cycle, the wheel stops and normal scrolling resumes
    * The day indicator should be a sleek, minimal design (not a plain triangle)
    * The section uses sticky positioning to keep the wheel visible while scrolling through it

### Waiting List Mode

The landing page must support a **waiting list mode** controlled by the deployment environment setting `WAITLIST_MODE`. When `WAITLIST_MODE` is enabled:

1. The navigation bar shows the brand logo, Home, Store, Pricing, and the free-resource cart. Auth/sign-in, portal, and Library links are hidden.
2. The hero CTA changes from "Start" to a waiting list email capture form.
3. The "About" section CTA ("Start my plan") is hidden.
4. All content sections (About, Platform, Workout Explanation, Cycle-aware Nutrition, My Method / Coaching Method) remain fully visible in both modes. Only navigation links and specific CTAs change between modes.
5. The footer CTA section changes messaging to waiting list focus and includes the same email capture and qualitative availability behavior as the hero and pricing page.
6. Known availability uses exactly one of these labels: "Reduced-price spots available", "Limited spots", or "Reduced-price spots closed". Availability updates at fixed half-hour intervals, never displays an exact count or progress, and does not update immediately after a submission. When availability cannot be determined, a generic outage message is shown and the surrounding copy makes no reduced-price claim.
7. Every accepted submission joins the same waitlist. Exact allocation determines reduced versus regular pricing, and signup remains open when reduced-price places are closed or availability is unknown. Reduced waitlist prices and promotional copy appear only while availability is "Reduced-price spots available" or "Limited spots".
8. Email capture must validate format before submission and reject bot-driven submissions before they can create waitlist entries. Validation, bot-verification, and server failures remain visible error outcomes.
9. Every successful new or duplicate browser submission shows the same generic confirmation and celebration. Duplicate submissions preserve their existing pricing allocation, refresh consent and retention, and send no additional confirmation email.
10. A newly accepted regular-pricing entrant receives a confirmation email that explicitly states the visitor joined successfully, reduced-price places were already full, and the signup does not include reduced pricing.
11. If the deployment setting is undefined, the system defaults to waiting list mode as the safe pre-launch state.

### Content Requirements for Day Types

* Strength: emphasizes lifting heavy weights and the benefits of strength for women
* Recovery: emphasizes active recovery and muscle recovery/adaptation
* Rest: emphasizes mental and physical recovery
* Hypertrophy: emphasizes muscle growth for health and physique goals 

### Content Requirements for Cycle Phases

* Luteal: complex carbs, root vegetables, magnesium
* Ovulatory: lighter foods, raw vegetables, fiber
* Follicular: fresh foods, lower carb
* Menstrual: higher iron, warm and easy-to-digest foods 

---

## 2. Blog

### Objective

Give the coach a public-facing content area to publish ideas, education, and thought leadership.

### Functional Requirements

1. Publicly accessible blog section.
2. Coach-authored content.
3. Content should follow brand voice and design system.
4. Responsive reading experience.

### Notes

The chat history names the blog as a core app area, but does not define authoring workflows, CMS requirements, categories, or search. Those can become follow-up stories rather than hard MVP requirements. 

---

## 3. Digital Store

### Objective

Sell and distribute free and paid digital products.

### Functional Requirements

1. Publicly accessible digital storefront.
2. Products can be free or paid.
3. Product types may include:

   * e-books
   * free workout challenges
   * free nutrition tips/recipes
   * paid workout plans
   * paid nutrition plans
   * fat loss plans
4. Users must be able to inspect/view a product before purchase or download.
5. Products must clearly show whether they are free or paid.
6. Store must support add-to-cart behavior.
7. Logged-out buyers must provide at least an email to buy something. The submission must reject bot-driven attempts to prevent fake orders and automated farming of free products.
8. The catalog supports an empty state: when no products are published, the store communicates that nothing is available yet, distinct from "no results match the selected filters."
9. Logged-out acquisition requires acceptance of the current Terms. The Privacy Policy is presented as a linked notice rather than a required choice, and marketing consent is a separate optional, unchecked choice that never blocks delivery of requested resources.
10. Acquisition outcomes are explicit to the visitor: an invalid email, a failed bot verification, a failed delivery, and a server failure each produce a clear message, and failures preserve the visitor's selections and details for retry. If a requested product is no longer available, the whole request is rejected, the cart is updated to drop unavailable items, and the visitor is asked to review the updated selection and retry.
11. Successful free requests confirm that the resources were sent to the provided email without order or price framing.
12. Each accepted request produces one transactional delivery email offering a single primary download action for all granted resources.
13. Download access is provided through a download page reached from the delivery email. Access stays available for seven days after each request and can be revoked. Invalid, expired, or revoked links show one privacy-safe unavailable message that does not reveal what the link pointed to, and the visitor can request the resources again from the store.
14. Delivery is limited per email address: at most one delivery per minute, and ten in any rolling 24-hour period. Addresses differing only by a sub-address tag share one allowance, because they reach the same inbox. A declined request explains which limit was reached, records nothing, and keeps the visitor's selections and details for retry. A delivery that fails, or whose outcome is unknown, does not consume the allowance.
15. Signed-in customers have a personal Library listing every product their account owns. Ownership covers paid purchases and free acquisitions, including prior guest acquisitions linked to the account by verified email.
15b. Prior guest acquisitions become an account's own when a signed-in customer opens the Store or the Library. Every acquisition made with an address that account has verified is linked, including addresses differing only by a sub-address tag, because they reach the same inbox. Linking repeats harmlessly, never duplicates ownership, and never interrupts the visit it happens during. An acquisition already linked to an account stays with that account, so a closed account's purchases and downloads never pass to a later account created with the same address.
16. The Library is available only to signed-in customers; any account role can open it.
17. From the Library, a customer can obtain fresh download access to each owned product individually at any time, without purchasing or requesting it again. Library access does not depend on earlier delivery emails or their seven-day windows.
18. An account that owns no products yet sees a clear empty Library that points back to the store.
19. Library outcomes are explicit: when owned products cannot be loaded or download access cannot be issued, the customer sees a clear message and can retry.

### UX Requirements

* Clear product differentiation between free and paid
* Clean free-resource request and delivery flow
* Consistent visual language with rest of platform
* Library reachable from primary navigation for signed-in customers

---

## 4. Client Portal

### Objective

Help clients follow their assigned coaching plan and stay connected to the coach.

### Functional Requirements

1. Client portal access only for invited users with active subscriptions.
2. Clients are notified when a new workout plan has been assigned.
3. Clients can see what their next workout/day is based on the coach’s assigned plan.
4. Clients can adjust the default schedule within allowed bounds.
5. Client experience should align with the coaching method, including cycle-aware training/nutrition context where relevant.
5b. The client dashboard displays the client's current menstrual cycle phase, calculated from the last recorded period start date and average cycle length.
6. A dedicated **Workout Viewer** provides a distraction-free, mobile-optimized workout display that prioritizes the exercise information the client needs during training.
7. The Workout Viewer shows exercises in order with: exercise number, name, equipment, primary muscles, sets/reps/RIR, coach notes, and exercise demo video.
8. Exercises grouped in a superset are displayed as a visually connected group.
9. Clients can navigate within their current and past weeks of the assigned plan and start any day's workout in those weeks. Future weeks the coach has built ahead are not visible to the client until the client reaches them.
10. The client's plan view shows week navigation limited to the current and past weeks, day cards with status indicators (Past/Current/Upcoming), and a way to start each training day.
11. **Active Workout Tracker:** The Workout Viewer supports live workout logging. Clients record actual weight and reps for each individual set during a workout.
12. After completing a set, a rest countdown timer starts automatically based on the coach-configured rest time for that exercise. Clients can extend the timer (+15 seconds per press) or skip it. Actual rest time taken is recorded.
13. Coaches can define swap variant exercises for any exercise in a plan. During a workout, the client can substitute the current exercise with any coach-defined variant at any time. Swap history is tracked per workout.
14. Superset exercises follow an alternating set pattern (e.g., A1, B1, A2, B2) during active workout tracking.
15. When a workout is completed, the client sees a completion summary showing: total workout duration, total volume (weight multiplied by reps), muscle groups worked, and a per-exercise breakdown comparing logged values against prescribed values. All-time personal records are highlighted when matched or exceeded.
15b. A workout can be marked complete only after every prescribed set has been logged. To finish before all sets are logged, the client uses an "End workout" action in the Workout Viewer's options menu; the workout is then recorded with only the sets logged so far.

### Messaging (Client Side)

1. Client chat with the coach must include:
   * Coach profile sidebar with photo, name, role, and response-time note
   * Real-time-style message bubbles with timestamps and read receipts
   * 3-dots menu with: Search in chat, Mute/Unmute notifications, Archive conversation, Delete conversation
   * Delete confirmation uses a styled modal dialog (not browser native confirm)
   * No call/video button in the header (video calls are not supported yet)
2. A "Schedule check-in" action must be available in the chat:
   * Client selects a date (no past dates) and a time slot (9 AM - 4 PM, hourly); already-booked slots are unavailable
   * Submits an ad-hoc check-in request to the coach
   * Maximum 1 pending ad-hoc check-in request at a time per client
   * When a pending request exists, the action is disabled
3. An upcoming check-in banner must appear at the top of the chat:
   * Shows the next confirmed check-in date, time, and type (e.g., "Weekly")
4. The client sidebar must include a "Next Check-in" widget:
   * Shows the date and time of the next confirmed check-in
   * Includes a "Join Meet" button linking to Google Meet (mocked URL)
   * Links to the dedicated Check-ins page

### Check-ins (Client Side)

1. Clients have a dedicated Check-ins page, separate from the chat (the in-chat check-in actions remain available). It is organized into Upcoming, Requests, and Past.
2. **Upcoming** lists confirmed check-ins with a Join Meet link and the option to propose a new time (reschedule, within the existing reschedule limit).
3. **Requests** lists check-ins awaiting a decision:
   * For check-ins the coach proposed, the client can approve, reschedule, or decline.
   * For the client's own pending request, the client can cancel it; a cancelled request can no longer be approved by the coach.
4. **Past** lists completed, declined, and cancelled check-ins.
5. Clients can request a new ad-hoc check-in from this page, subject to the existing limit of one pending ad-hoc request at a time.
6. Actions taken on this page and in the chat stay in sync.
7. The page is reachable from the client portal navigation and from the "Next Check-in" widget.

### Settings (Client Side)

1. Clients have a dedicated Settings page where they choose their preferred units of measurement:
   * Body weight and training loads: kilograms or pounds
   * Height: centimetres or feet & inches
2. The chosen units apply consistently wherever the client sees a weight or height — including the profile, dashboard, and the Workout Viewer (live logging and the completion summary).
3. Unit preferences are stored per client and persist across sessions.

### Notes

The chat implies messaging and notifications but does not fully define client-side plan completion, exercise logging, progress tracking, or compliance features. Those should be left as future-detail stories unless you want me to infer them into v1 scope.

---

## 5. Coach Portal

### Objective

Provide the coach with the operational backend to manage clients, communication, onboarding, and program delivery.

### Functional Requirements

1. Dashboard for managed clients, check-ins, important client info, and upcoming assessment calls.
   * The "Pending Check-ins" card must pull from the check-in system (not hardcoded)
   * The "Review" action must link to the Schedule/Check-ins page
   * The dashboard subtitle must dynamically reflect actual pending counts
2. Client onboarding flow where the coach enters client details and sets the client's first goal. See *Client Onboarding (Coach Side)* below.
3. Nutrition targets are set per individual client: a daily calorie budget and a protein, carbohydrate and fat split.
4. Completing onboarding sends the client an email invitation.
5. Coach chat must support navigating directly from a conversation to that client’s profile.
6. Notification UI must adapt to available screen space and avoid rendering outside the viewport.
7. Message actions like send/attach and send icon alignment must be visually centered and polished.
8. The coach can see each client's active subscription — its term (1, 3, or 6 months) and whether it is active or expired — on the client detail page.
9. The coach has a Settings page to choose preferred measurement units (weight in kilograms or pounds; height in centimetres or feet & inches). The chosen units apply across the coach's views, including workout-history volumes and the session-volume filter.

### Client Onboarding (Coach Side)

The coach onboards a new client through a six-step wizard: basic information, fitness and measurements, dietary restrictions, goals and focus, nutrition setup, and a review before sending. A step refuses to advance while its input is incomplete or out of range, and names the field that needs attention.

**What the coach records**

* Basic information: first name, last name, email address, date of birth, and the sex the calorie calculation uses
* Fitness and measurements: height, weight, and activity level
* Dietary restrictions: allergies, intolerances and preferences, as free text
* Goals and focus: the goal type, and private notes only the coach can see
* Nutrition setup: target weight, a daily calorie budget, and a protein, carbohydrate and fat split

**Accepted values**

* Age between 16 and 100
* Height between 100 and 250 cm
* Weight and target weight between 30 and 300 kg
* Daily calorie budget between 800 and 6,000
* The macro split must add up to 100%
* Dietary restrictions and private notes are limited to 2,000 characters each

**How the nutrition figures are reached**

* The system derives the client's basal rate from her measurements, age and sex using the Mifflin-St Jeor formula, and her maintenance level from that rate and her activity level.
* Rather than asking the coach to type a calorie figure, the wizard derives the budget from a weekly rate of weight change she sets. It opens on a recommended rate for the client's bodyweight rather than at zero, and shows the date the target weight would be reached at that rate.
* The rate is capped as a share of bodyweight, and the coach is warned when a rate would drive the daily budget below the client's basal rate. She may still set a budget directly.
* Each goal type carries a recommended macro split. Changing the goal re-seeds both the calorie budget and the split, because figures that suited the previous goal do not suit the new one.
* The rate ceilings, the recommended starting rates, the energy-per-kilogram figures behind them, and the per-goal macro splits are pending the coach's sign-off.

**Sending the invitation**

The review step shows everything that will be saved. Sending it records the client's profile, her first goal and her nutrition targets together, and emails her an invitation link.

### Messaging (Coach Side)

1. Conversation list sidebar with client avatars (photo or letter initial), online status, unread count, and last message preview.
2. 3-dots menu per conversation with: Pin/Unpin, Mute/Unmute, Flag for follow-up, Archive, Delete.
3. Delete confirmation uses a styled modal dialog with warning icon.
4. No call/video button in the header (video calls are not supported yet).
5. An upcoming check-in banner must appear at the top of the active chat showing the next confirmed check-in for that client.
6. The coach can initiate an ad-hoc check-in from the messaging area, selecting a date/time with already-booked slots unavailable.
7. Pending check-in requests and reschedule proposals must appear as action cards in the message stream:
   * Show client name, requested date/time, and optional note
   * Accept and Decline action buttons
   * Accepting/declining updates the check-in status immediately and fires a notification

### Workout Review & History (Coach Side)

1. The coach can view a client's completed workout history from the client detail page.
2. Past workouts are grouped by subscription, then by the training plan within that subscription, then by the week within that plan. A subscription contains one or more training plans; a training plan contains one or more weeks.
3. The coach can filter the history by date range, session duration, session volume, and muscle groups trained (a session matches when at least one of its exercises trains a selected muscle group). Multiple muscle groups can be selected at once.
4. Session-volume filtering and all volume figures use the coach's selected unit system.
5. For the current selection — defined by the default grouping and any filters applied — the coach sees the number of sessions, the total volume, and the average volume per session and average duration per session.
6. Each individual workout review shows: logged weight and reps vs prescribed values per set, rest times taken vs prescribed, any exercise swaps made during the workout, compliance percentage, total duration, and total volume.

### Schedule / Check-ins Page (`/coach/checkins`)

A dedicated page accessible from the coach sidebar "Schedule" link for global check-in management:

1. Three tabs: **Pending**, **Upcoming**, **Past**
2. **Pending tab**:
   * Lists all pending ad-hoc check-in requests and reschedule proposals across all clients
   * Each card shows client name, type, date, time, optional note, and who initiated the request or reschedule
   * Accept and Decline action buttons per card
   * Badge on the tab showing count of pending items
   * Empty state when no pending requests exist
3. **Upcoming tab**:
   * Lists all confirmed check-ins (both recurring and approved ad-hoc) sorted by date
   * Each card shows client info, date, time, type badge (RECURRING/AD-HOC), and "Confirmed" status
   * Count shown in tab header
4. **Past tab**:
   * Lists completed, declined, and cancelled check-ins
   * Status clearly indicates whether each check-in was completed, declined, or cancelled
   * Client notes visible where present
5. The coach sidebar "Schedule" link must show an orange badge with the count of pending check-ins.

---

## 6. Exercises and Plans Management

### Objective

Let the coach create reusable exercises, assemble them into structured plans, and assign those plans to clients.

### Data Model

**Exercise**

* Name
* Description
* Equipment used
* Difficulty
* Primary muscles involved
* Secondary muscles involved
* Video demonstrating execution (`.mp4` upload)
* Tags such as Strength, Hypertrophy, Recovery. An exercise may carry several — a
  back squat is both Strength and Hypertrophy — so tags are multi-valued, and they
  are distinct from a client's Goal.
* Equipment used doubles as the no-equipment condition: an exercise needs no
  equipment when it lists nothing, or lists only Bodyweight — which describes how
  the exercise is loaded, not something the coach has to own.

**Goal**

* Unique ID
* Client ID
* Type: Muscle Building, Fat Loss, Strength, Recomposition, Maintenance, or Custom
* Target weight
* Start date
* End date, once completed
* Status: active or completed

A client has at most one active goal. Setting a new one completes the standing
goal rather than running two at once. The goal's type carries its meaning, so it
has no separate name. Which way the target weight may move follows from the
type: fat loss, maintenance and recomposition hold or lower it, muscle building
and strength hold or raise it, and a custom goal may go either way.

**Nutrition Targets**

* The goal they belong to
* Daily calorie budget
* Protein, carbohydrate and fat shares, as percentages adding up to 100
* The date they took effect

Targets are added rather than overwritten: revising them keeps what the client
was working to before, which check-ins and progress reviews rely on. Gram
amounts are not recorded — they follow from the calorie budget and the
percentages.

**Plan Template**

* Reusable program structure created by the coach
* Contains weeks, days, and exercises
* Default duration is 4 weeks with 1 deload week
* Not assigned to any client — serves as a starting point
* Can be saved as draft
* Coach can create, edit, and delete templates

**Plan Instance**

* A personalized plan assigned to a specific client
* Linked to a Goal via goal ID
* Contains weeks (may start from a template or be built from scratch)
* Tracks current week number (client progress)
* Status: active or completed
* Start date and optional end date
* Weeks can be added incrementally by the coach
* One client can have at most one active plan instance
* Past/completed instances are preserved for history

**Plan Day**

* Day type:

  * Rest
  * Recovery
  * Strength
  * Hypertrophy
  * Lighter day (yoga, pilates, mobility, flexibility)
* Rest days contain no exercises
* Other day types may contain exercises 

**Exercise Assignment Inside a Plan**

* Sets
* Reps
* RIR (Reps in Reserve)
* Superset status/grouping
* Rest time between sets (seconds, coach-configured)
* Swap variant exercises (optional list of coach-defined alternative exercises the client may substitute during a workout)

### Functional Requirements

#### Exercise Library

1. Coach can create new exercises.
2. Coach can reuse previously created exercises across multiple plans.
3. Exercise creation must support raw `.mp4` upload via drag-and-drop and upload button.
4. Exercise library must support search.
5. Exercise library must support filters for:

   * Recovery-tagged exercises
   * Hypertrophy-tagged exercises
   * Strength-tagged exercises
   * No-equipment exercises

   Tags combine as "any of" — selecting Strength and Recovery shows exercises
   carrying either. No equipment is a single filter that narrows the library when
   applied and places no constraint when not; an equipment-only view is not
   offered, because its complement is the whole library. Filters combine with
   search, and with each other as "all of".

#### Plan Builder

1. Plan builder should be a dedicated page, not a modal, due to workflow complexity and accidental-close risk.
2. Plan builder should default to 4 weeks.
3. Coach can add or remove weeks.
4. Coach can copy the contents of one week into another week.
5. Coach can swap the contents of two weeks.
6. Deload week should be visually distinguished.
7. Deload week should prompt the coach to manually reduce volume/intensity, but the system should not auto-change values.
8. Day type selector should visually distinguish day types clearly.
9. Coach can add exercises to a day from the exercise library.
10. Drag-and-drop must support:

    * dragging an exercise from the library into a day
    * reordering exercises within a day
    * creating a superset by dragging one exercise onto another
11. Superset creation must be visually obvious.
12. A more structured/non-drag alternative should also exist for accessibility and clarity.
13. Coach can save plan as draft and continue later.
14. Coach can save and share a plan with one or more clients.
15. Exercise rows in the plan must show numbered indicators/labels for tracking order, especially on smaller screens.
16. Exercise drag area must be large enough for comfortable interaction.
17. Exercise rows must not overflow their containers and must be descriptive about which exercise is being added.
18. Coach can add coaching notes per exercise (expandable text field).
18b. Coach can configure rest time (in seconds) per exercise assignment.
18c. Coach can assign swap variant exercises to any exercise, selecting from the exercise library.
19. Quick-add button ("+") in the exercise library as an alternative to drag-and-drop.
20. The coach must be able to quickly see how many exercises each day has and which training days are still empty (no exercises added).
21. The coach must be able to see the overall plan structure at a glance — which weeks exist, which days have content, and what type each day is — without scrolling through every week.
22. Copying a week's structure to other weeks must be easily discoverable (not hidden behind hover menus) and support copying to a single week or all weeks at once.
23. Coach can set a plan name when saving.
24. Coach can preview the full plan structure before saving.
25. The plan builder must use all available screen space and not feel cramped on large displays. On smaller screens, the exercise library and plan structure should be accessible on demand without cluttering the main editing area.
26. Two distinct builder contexts exist: a **Template Builder** for creating reusable templates, and a **Client Plan Builder** for building or editing a specific client's plan.
27. When editing a client's active plan, the coach must be able to see which weeks already existed vs which are newly added in this session.
28. The Client Plan Builder must allow the coach to optionally load a template as a starting point, with a preview showing each day's exercises, sets, reps, and RIR before committing.
29. The coach can insert a deload week at any position in the plan from within the builder.
30. When editing an existing template, the template name must be pre-populated and save actions must clearly indicate the coach is saving a template (not a client plan).

### Training Hub

1. Plan instance cards are clickable — clicking anywhere on the card navigates to the client plan builder for that client.
2. Each plan instance card has a context menu with actions: "Go to Client" (navigates to client profile) and "Delete Plan" (with confirmation).
3. Completed plans must be clearly distinguishable from active plans at a glance so the coach can quickly scan her workload.
4. Active plan cards show key information: client name, week progress, deload indicators, associated goal, training frequency, and start date.
5. Creating a new client plan starts by selecting a client. Templates are not required — the coach chooses a client first, then optionally loads a template inside the builder.
6. The Templates tab shows template cards with options to edit, start a plan from the template, copy, or delete.
7. Delete confirmation for both plans and templates requires explicit user confirmation (not browser-native dialogs).

### Assignment and Scheduling

1. Coach assigns a plan to one or more clients.
2. Assigned clients receive notification.
3. Coach provides a default schedule.
4. Client may adjust schedule in ways that fit their needs, with controlled flexibility rather than full plan redesign. 

---

## 7. Check-in Scheduling System

### Objective

Enable both the coach and client to propose, schedule, reschedule, and manage check-ins. Support automatic recurring check-ins tied to training plans. Both sides should have clear visibility into upcoming check-ins and an easy way to join meetings.

### Data Model

**CheckIn**

* Unique ID
* Client ID and name
* Coach ID
* Date (ISO date string)
* Time (24-hour format)
* Type: `ad-hoc` or `recurring`
* Status: `pending`, `confirmed`, `declined`, `completed`, `rescheduling`, or `cancelled`
* Source: `client-request`, `coach-request`, or `plan-schedule`
* Initiated by: `client` or `coach`
* Optional plan ID (for recurring check-ins linked to a plan)
* Created timestamp
* Optional note (from either party)
* Reschedule count (number of reschedule rounds, max 2)
* Reschedule proposed by (client or coach, when in rescheduling state)

### Business Rules

1. **Maximum 1 pending ad-hoc check-in per client.** A client cannot submit a new ad-hoc request while one is already pending approval.
2. **Recurring check-ins are auto-confirmed.** When a plan is assigned to a client, weekly check-ins are automatically generated and confirmed (configurable frequency, default 1 per week).
3. **Ad-hoc check-ins require approval from the other party.** Both the coach and the client can initiate ad-hoc check-ins. The other party can accept or decline.
4. **Either party can propose a reschedule for a confirmed check-in.** The original time slot is released and the check-in enters a rescheduling state. The other party can accept the new time, decline (cancelling the check-in), or counter-propose a different time.
5. **Maximum 2 reschedule rounds per check-in.** If no agreement is reached after 2 rounds, the check-in is automatically cancelled.
6. **Declining a reschedule cancels the check-in entirely.** The check-in does not revert to the original time.
7. **A reschedule proposal may include an optional message** that appears in the chat thread.
8. **Check-in meetings use Google Meet.** The client portal provides a "Join Meet" link (mocked URL in v1).
9. **Scheduling uses coach availability.** When selecting a date and time for any check-in (new or reschedule), already-booked time slots are unavailable for selection.

### Functional Requirements

#### Client Side

1. Client can request an ad-hoc check-in from the chat interface by selecting a date and time.
2. Past dates are disabled; time selection offers hourly slots from 9 AM to 4 PM with already-booked slots unavailable.
3. The request creates a check-in record with status `pending` and sends a message in the chat.
4. While a request is pending, the client cannot submit another ad-hoc request.
5. An upcoming check-in banner appears at the top of the chat.
6. A sidebar widget shows the next confirmed check-in with date, time, and a "Join Meet" button.
7. Client can propose a reschedule for a confirmed check-in, selecting a new date/time and optionally including a message.
8. Client can accept, decline, or counter-propose when the coach proposes a reschedule.

#### Coach Side

9. Pending check-in requests (both client-initiated and rescheduling) appear as action cards in the relevant client chat.
10. The coach can approve or decline directly from the chat.
11. The coach can initiate an ad-hoc check-in from the messaging area or from a client's profile page.
12. The coach can propose a reschedule for a confirmed check-in, selecting a new date/time and optionally including a message.
13. A dedicated `/coach/checkins` page provides global management with Pending, Upcoming, and Past tabs.
14. The coach sidebar "Schedule" link shows a badge with pending count.
15. The coach dashboard "Pending Check-ins" card pulls from the check-in system.

#### Notifications

16. When either party requests or initiates a check-in, a notification is created for the other party.
17. When a check-in is approved, the requesting party receives a notification.
18. When a reschedule is proposed, the other party receives a notification.
19. When a check-in is cancelled (via decline or auto-cancel after max reschedule rounds), both parties receive a notification.
20. Client notifications link to `/portal/messages`. Coach notifications link to `/coach/checkins`.

#### Recurring Check-in Generation

21. When a plan is assigned to a client, the system generates 4 weekly check-ins (default: Wednesdays at 10 AM).
22. Recurring check-ins are auto-confirmed and linked to the plan by plan ID.
23. Frequency is configurable (default: 1 per week).

---

## 8. Menstrual Cycle Tracking

### Objective

Enable clients to log their menstrual periods and provide the coach with visibility into the client's cycle data to support cycle-aware coaching decisions. Clients who do not currently have an active menstrual cycle (e.g., amenorrhea, post-menopause, hormonal contraception) must still be able to use the platform and receive personalized coaching; cycle tracking and cycle-driven plan adjustments are gracefully skipped or replaced with non-cycle-based coaching for these clients.

### Data Model

**Menstrual Cycle Profile**

* Client ID
* Cycle regularity: regular or irregular
* Average cycle length (days)
* Average period length (days)
* Conditions: PCOS, Endometriosis, PMDD, Heavy periods, Amenorrhea, Fibroids
* Common symptoms

**Period Log Entry**

* Client ID
* Date
* Flow intensity: light, medium, heavy, or spotting
* Symptoms: cramps, bloating, headache, fatigue, mood swings, back pain, breast tenderness, nausea, acne, insomnia
* Optional notes

### Functional Requirements

#### Client Side

1. Clients can log period entries by selecting dates, recording flow intensity, symptoms, and optional notes.
2. Clients can view a cycle calendar showing their logged period days and current cycle phase.
3. The client dashboard displays the current menstrual cycle phase, calculated from the last recorded period start date and the client's average cycle length.

#### Coach Side

4. The coach can view any client's period log from a dedicated read-only page accessible from the client detail page.
5. The client detail page shows the client's current cycle phase, cycle regularity, average cycle length, average period length, conditions, and notes.
6. The client profile section visible to the coach includes cycle regularity and conditions.

---

## 9. Client Self-Onboarding

### Objective

Collect essential client information — including menstrual cycle data — directly from the client after their first sign-in, so the coach has the data needed to begin cycle-aware coaching.

### Functional Requirements

1. When a client signs in for the first time and has not completed onboarding, the system redirects to a multi-step onboarding wizard. The client cannot access the portal until onboarding is complete.
2. **Step 1 — Basic Information:** The client reviews and can correct the basic information the coach pre-filled during coach-side onboarding (first name, last name, date of birth, gender).
3. **Step 2 — Cycle Information:** The client sets their menstrual cycle regularity (regular or irregular), average cycle length, and average period length.
4. **Step 3 — Conditions and Symptoms:** The client selects any applicable conditions (PCOS, Endometriosis, PMDD, Heavy periods, Amenorrhea, Fibroids) and common symptoms.
5. **Step 4 — Notes:** The client can write optional notes for the coach.
6. On completion, the menstrual cycle profile is saved and the client is redirected to the portal dashboard.
7. The onboarding flow is controlled by a `needsOnboarding` flag in the Dev Toggle.

---

# Shared UX / Technical Requirements

## Design Consistency

1. The product must maintain a consistent visual language across all pages and portals.
2. UI patterns (cards, modals, forms, navigation) should feel familiar and predictable throughout the experience.
3. The design system should be documented and serve as the source of truth for visual decisions.

## Accessibility

1. The product targets **WCAG AA** compliance (4.5:1 contrast ratio for normal text, 3:1 for large text, interface controls, and meaningful graphics).
2. Design must remain usable across mobile, tablet, and desktop.
3. Complex interactions should have accessible alternatives, especially in plan building.
4. UI elements must not clip or overflow at any screen size.
5. All animations must respect the user's reduced motion preference.

## Responsiveness

1. The product must work well on mobile, tablet, and desktop screen sizes.
2. Layouts must adapt gracefully between screen sizes without visual breakage.
3. Content must not clip, overflow, or become unreadable at any screen size.

## Notifications

1. Notification bell in sidebar headers for both portals.
2. Notifications must be role-aware:
   * Client notifications link to client portal routes (e.g., `/portal/messages`)
   * Coach notifications link to coach portal routes (e.g., `/coach/messages?client=id`, `/coach/checkins`)
3. Toast notifications with a "View" action button that navigates to the relevant page without losing current app state.
4. Notification types include:
   * New message
   * Check-in requested (by client or coach)
   * Check-in approved/confirmed
   * Check-in reschedule proposed
   * Check-in cancelled (via decline or auto-cancel)
5. Clicking a notification marks it as read and navigates to the appropriate page.

## Dev/Testability

1. A global floating Dev Toggle must simulate:

   * authenticated/unauthenticated states
   * client vs coach role
   * bundle purchased
   * waiting list mode
   * client needs onboarding (triggers the self-onboarding wizard)
   * other mocked states as needed
2. The mocked environment should make flows testable without backend dependencies.

---

# Key User Flows

## Flow 1: Visitor to Assessment Call

Visitor lands on homepage → watches hero video / browses sections → understands coach philosophy and cycle-aware approach → clicks CTA → books 30-minute assessment call. 

## Flow 2: Assessment to Coaching Purchase

Visitor completes assessment → receives email with unique tokenized link → opens coaching bundle page with checkout enabled → purchases coaching bundle (mocked). 

## Flow 3: Coach Onboards Client

Coach opens coach portal → enters the client's basic information → enters her fitness and measurements → records her dietary restrictions → sets her goal and private notes → sets her nutrition targets → reviews everything and sends → system records the profile, goal and targets and emails the client an invitation link valid for 30 days → client follows the link and signs in → client completes self-onboarding (see Flow 16) → client can access portal.

## Flow 4: Coach Creates Reusable Exercise

Coach opens training section → creates exercise → uploads `.mp4` demo → adds metadata and tags → saves exercise to reusable library. 

## Flow 5: Coach Builds a Plan Template

Coach opens training section → navigates to Templates tab → clicks "New Template" → full-screen template builder opens → starts with default 4-week structure → adjusts weeks → sets day types → adds exercises from library → reorders exercises → creates supersets → sets reps/sets/RIR → reviews deload week → names template → saves template.

## Flow 6: Coach Creates a Client Plan

Coach opens training section → clicks "New Client Plan" → selects client → full-screen client plan builder opens → optionally clicks "Use Template" to preview and load a template → customizes exercises/weeks for the client → saves → client receives notification and system message in chat → plan appears in client portal.

## Flow 6b: Coach Adds Weeks to Active Plan

Coach opens training section → clicks active client plan card → full-screen builder opens showing existing weeks (protected) → coach clicks "Add Week" or "Insert Deload" → adds exercises to new weeks → saves → client receives update notification and system message.

## Flow 7: Client Follows Plan

Client signs in → sees active plan with week navigation and day cards → taps "Start" on any training day → Workout Viewer opens showing exercises with sets/reps/RIR → client logs weight and reps per set → rest timer counts down between sets (client can extend or skip) → client may swap an exercise for a coach-defined variant → after all exercises, client sees completion summary with duration, volume, muscle groups, logged vs prescribed comparison, and personal records → presses back to return to plan view.

## Flow 7b: Coach Reviews Client Workout

Coach opens client detail page → views client's completed workout history → selects a workout → reviews logged vs prescribed values per set, rest times, exercise swaps, compliance percentage, duration, and volume.

## Flow 8: Store Purchase / Free Download

Visitor browses the free store → views product details → adds one or more resources to the persistent cart → provides an email, accepts the Terms, and may separately opt in to marketing → passes bot verification → receives one delivery email → follows the private link and downloads the granted file or ZIP for up to seven days.

## Flow 9: Waiting List Signup (Reduced Pricing Available)

Visitor lands on the waiting-list-mode homepage → sees nav with logo, Home, Store, Pricing, and the free-resource cart → browses all content sections (About, Platform, Workout Explanation, Cycle-aware Nutrition, My Method / Coaching Method) → sees a qualitative reduced-price availability label → enters email in the hero or footer CTA → receives the generic confirmation and celebration → visitor is added to the waitlist with the pricing allocation recorded at submission time → public availability remains unchanged until its next fixed half-hour update.

## Flow 10: Waiting List Signup (Reduced Pricing Closed or Availability Unknown)

Visitor lands on the waiting-list-mode homepage when reduced-price places are closed or availability cannot be determined → sees ordinary waitlist signup with closed or neutral surrounding copy → enters email → receives the same generic confirmation and celebration → visitor is added with the pricing allocation recorded at submission time → if that allocation is regular pricing, the confirmation email explicitly states that joining succeeded and does not include reduced pricing.

## Flow 11: Client Requests Ad-hoc Check-in

Client opens messages → initiates a check-in request → selects date and time (booked slots unavailable) → submits request → message appears in chat → coach receives notification.

## Flow 12: Coach Approves or Declines Check-in

Coach sees check-in request in client chat (or navigates to Schedule page) → reviews date, time, and note → accepts or declines → check-in status updates → notification fires → client sees result.

## Flow 13: Coach Initiates Ad-hoc Check-in

Coach opens client messaging or client profile → initiates a check-in → selects date and time (booked slots unavailable) → submits → client receives notification and can accept or decline.

## Flow 14: Reschedule a Check-in

Either party opens a confirmed check-in → proposes a new date/time with optional message → original slot is released → other party receives notification → other party accepts (check-in confirmed at new time), declines (check-in cancelled), or counter-proposes (new reschedule round) → after 2 rounds without agreement, check-in auto-cancels.

## Flow 15: Client Joins Check-in Meeting

Client sees next confirmed check-in with date, time, and "Join Meet" action → joins Google Meet (mocked URL).

## Flow 16: Client Completes Self-Onboarding

Client signs in for the first time after receiving invitation → system detects onboarding is incomplete → client is redirected to onboarding wizard → reviews and corrects basic info → sets menstrual cycle regularity, average cycle length, and average period length → selects any applicable conditions and symptoms → writes optional notes for the coach → completes onboarding → menstrual cycle profile is saved → client is redirected to portal dashboard.

## Flow 17: Client Logs Menstrual Period

Client opens cycle tracking → selects dates → records flow intensity and symptoms → adds optional notes → saves entry → logged days appear on the cycle calendar.

## Flow 18: Coach Reviews Client Cycle Data

Coach opens client detail page → views current cycle phase, regularity, average cycle/period length, conditions, and notes → navigates to the client's period log for a detailed read-only view of logged entries.

---

# MVP Recommendation

## In MVP

* Landing page (including waiting list mode variant)
* Sticky nav with role-aware portal CTA pills
* Hero video and controls
* About section with IG story widget
* Platform capabilities section
* Workout explanation section (with cycle-aware and form-teaching messaging)
* Cycle-aware nutrition section (per-phase food shifts across menstrual, follicular, ovulatory, and luteal)
* My Method / coaching method section (philosophy, audience scope, support for clients without an active menstrual cycle, nutrition adaptability, and active week-by-week plan adjustments)
* Footer CTA with sheet slide-up animation
* Waiting list email capture with delayed qualitative availability, privacy-preserving generic success, and reduced- versus regular-pricing confirmation
* Store with a persistent free-resource cart and email delivery
* Coach portal (dashboard, messages, clients, training, schedule/check-ins)
* Client onboarding basics (coach-side creation and client self-onboarding wizard with menstrual cycle profile setup)
* Client portal (dashboard, messages, plan, nutrition, resources)
* Messaging with conversation management, message status indicators, and safe destructive actions
* Check-in scheduling system (bidirectional ad-hoc requests, coach-initiated check-ins, recurring auto-generation, approve/decline, rescheduling with max 2 rounds, availability-aware scheduling)
* Check-in visibility (chat banners, sidebar widgets, Join Meet button)
* Exercise library
* Dedicated plan builder page with exercise notes, quick-add, week overview, copy-week UX
* Training hub with plan status visibility, client assignment, and plan management
* Plan draft/save/share
* Assignment notifications
* Role-aware notification system (check-in notifications, message notifications, proper routing)
* Goal system (create, assign to plan, complete)
* Plan template-instance architecture
* Iterative week addition to active plans
* Distraction-free plan builder optimized for all screen sizes
* Client Workout Viewer (mobile-optimized, distraction-free) with active workout tracking (weight/reps logging, rest timer, exercise swap variants)
* Workout completion summary (duration, volume, muscle groups, logged vs prescribed, personal records)
* Coach workout review (per-client completed workout history with compliance data)
* Template picker with exercise preview in client plan builder
* System messages for plan events
* Menstrual cycle tracking (client period logging, cycle calendar, phase display on dashboard, coach read-only access)
* Dev Toggle (roles, auth, bundle, waiting list mode, needs onboarding)
* Design system / responsiveness / accessibility foundations

## Later / Nice-to-Have

* Full blog CMS
* Rich client progress logging
* Real payment integration
* Real email service
* Real Google Meet integration (currently mocked URL)
* Rich analytics/reporting
* Plan version history / changelog
* Configurable check-in frequency per client (currently default weekly)
* Check-in reminders and calendar integrations
* Video call system (currently no call support)
* Advanced search/filtering/reporting across clients

---

# Open Questions / Product Gaps

These were not fully specified in the source chat and will need decisions before story writing gets too detailed:

1. What exact limits apply when clients adjust schedules?
2. ~~Can a plan be assigned to multiple clients while customized per client, or is it shared as one base template?~~ **Resolved:** Plans follow a template-instance model. Templates are reusable; instances are per-client copies.
3. ~~What happens when a client already has an active plan and the coach assigns another?~~ **Resolved:** The coach must end the current plan before starting a new one. Only one active plan instance per client.
4. What notification channels exist beyond in-app?
5. What product metadata is needed in the store beyond price/free status?
6. What exact blog authoring workflow is expected?
7. ~~How should workout logging (reps completed, weights used) work when introduced in a future iteration?~~ **Resolved:** Clients log actual weight and reps per set during active workouts. Rest times, exercise swaps, and a completion summary with compliance data are tracked. Coaches can review completed workouts from the client detail page.
8. Should the system track plan version history or changelog when the coach adds weeks to an active plan?
9. What happens to recurring check-ins when a plan is ended — are they cancelled automatically or do they persist independently?

---

# Acceptance Criteria Summary

The product is ready for story breakdown when:

* Roles, access rules, and gating logic are clear
* Landing page sections are defined
* Store behavior is defined
* Coach onboarding and training workflows are defined
* Plan builder structure and interactions are defined
* Accessibility, responsiveness, and design-system constraints are captured
* Draft/final plan states and assignment logic are captured
* Mocking strategy via Dev Toggle is captured 

## Suggested Epic Structure

1. Design System and Platform Foundations
2. Public Marketing Site / Landing Page
3. Waiting List / Pre-launch Flow
4. Coaching Sales and Token-Gated Purchase Flow
5. Digital Store
6. Authentication, Roles, and Dev Toggle
7. Coach Portal Core (Dashboard, Clients, Training Hub)
8. Client Onboarding
9. Messaging System (Client and Coach)
10. Exercise Library
11. Plan Builder (Template Builder + Client Plan Builder)
12. Plan Assignment and Client Schedule
13. Check-in Scheduling System
14. Notification System
15. Client Portal Experience
16. Goals System
17. Client Workout Viewer
18. Active Workout Tracking and Coach Review
19. Menstrual Cycle Tracking
20. Client Self-Onboarding

If you want, I can turn this PRD into a **story map with epics, features, and user stories** next.
