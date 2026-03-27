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

An invited paying customer with an active subscription. She can access the client portal, receive assigned plans, view her next workout/day, receive notifications, and adjust the default workout schedule within allowed limits. 

### 3. Coach

The trainer running the business. She can access the coach portal, onboard clients, calculate calorie/macro targets per client, manage chats, jump from chat to profile, create exercises, build plans, save drafts, assign plans, and manage upcoming work. 

## Product Principles

The product should consistently feel:

* Premium and elegant
* Warm, supportive, and women-focused
* Competent and trustworthy
* Clean, modern, and pleasant to use
* Responsive and accessible
* Built from reusable components and semantic design tokens rather than ad hoc styling 

## Brand and Content Principles

Brand voice must feel personal, human, empowering, supportive, and confident. It should avoid generic AI-sounding phrases such as “unlock your potential,” “world-class,” “seamless experience,” and “transformative.” Emoji-heavy copy and excessive exclamation marks should be avoided. Primary brand color is `#C81D6B`; secondary brand color is `#00796B`. The codebase should maintain a `DESIGN.md` and `brand-voice.md`. 

---

# Scope Overview

## Public Experience

* Landing page
* Blog
* Digital store
* Coaching bundles visibility
* Assessment call conversion flow

## Private Experience

* Client portal
* Coach portal
* Messaging/chat
* Client onboarding
* Plan and exercise management

## Shared Platform Utilities

* Global Dev Toggle to simulate roles and states
* Responsive navigation
* Notification UI
* Reusable component system
* Mocked cart/session/auth/payment/backend behaviors 

---

# Business Rules

1. **Client accounts are invite-only.**
   The coach creates client accounts from the coach portal during onboarding. After onboarding, the client receives an email to sign in. 

2. **Client portal access requires both invitation and active subscription.**
   Only invited clients with an active subscription may access the client portal. 

3. **Coach portal access is restricted to the coach role only.** 

4. **1-on-1 coaching checkout is token-gated.**
   Bundle pricing is visible on the landing page, but checkout is unavailable unless the user has a unique token in the URL, received after the assessment call. 

5. **Digital store is public, but purchase/download capture requires email at minimum for logged-out users.** 

6. **Clients may have at most one active plan at a time.** 

7. **Plans default to 4 weeks and include 1 deload week by default.**
   The deload week should be visually distinguished and the coach should be prompted to manually adjust volume/intensity. The system should not auto-modify plan variables. 

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

13. **Ad-hoc check-in requests require coach approval.**
    The coach can approve or decline. Counter-offers are not supported in v1.

14. **In waiting list mode, all non-essential navigation and CTAs are hidden.**
    Only the brand logo, waitlist email capture, and related messaging are shown. Store, Pricing, auth, and portal links are suppressed.

---

# Functional Requirements

## 1. Landing Page

### Objective

Convert visitors into assessment calls and introduce the coaching philosophy, training approach, and cycle-aware nutrition model in a premium and memorable way. 

### Functional Requirements

1. A full-viewport hero section with a background video of the coach training people.
2. Hero content must include title, subtitle, and CTA placement that visually guides action.
3. Video controls must include play, pause, and restart.
4. A sticky responsive navigation bar must include brand/logo and useful links.
5. When authenticated, the navbar must show "Client Portal" or "Coach Portal" as a visually prominent pill-style CTA:
   * Over the dark hero (transparent navbar): frosted glass pill with white text and subtle border
   * Over scrolled white navbar: solid brand-pink pill with white text
   * These must be clearly visible against both backgrounds
5. An About section must include:

   * Text content about the coach
   * Glowing circular avatar
   * Short bio
   * Phone-style Instagram story widget
6. The Instagram story widget must allow:

   * Clicking the Instagram handle to open her Instagram page
   * Tapping/clicking through 4–5 story items
   * Updating top progress/story segment bars
   * Tapping a like button for delight
7. A Principles section must:

   * Follow the referenced design direction
   * Show principle titles and linked media behavior
   * Play a video on hover over a principle title
   * Update a visible principle index/counter
   * Remain responsive on mobile
8. A workout explanation section must:

   * Keep the same visual vibe as the provided design direction
   * Use one row instead of three weeks
   * Make day cards obviously interactive
   * Show concise explanatory detail when clicked
   * Include content for Strength, Recovery, Rest, and Hypertrophy days
9. A cycle-syncing nutrition section must:

   * Explain the relationship between menstrual cycle phases and nutrition
   * Include a rotating cycle wheel inspired by Apple Health cycle tracking
   * Change current day/phase based on scroll interaction
   * Update both wheel labels and explanatory card content by phase
   * Include examples for Luteal, Ovulatory, Follicular, and Menstrual phases
10. The landing page must end with a CTA section for users not ready for 1-on-1 coaching, directing them to the digital store for free and paid products.
11. The footer CTA section must animate as a sliding sheet:
    * Rounded top-left and top-right corners to visually overlap the section above
    * Sheet slides up as the user scrolls (scroll-linked, not a one-shot animation)
    * Text content fades in after the sheet settles into position
    * Creates a dramatic visual grab to capture attention
12. The cycle-syncing wheel must rotate based on normal page scrolling:
    * The wheel rotates as the user scrolls down the page
    * After one full 28-day cycle, the wheel stops and normal scrolling resumes
    * The day indicator should be a sleek, minimal design (not a plain triangle)
    * The section uses sticky positioning to keep the wheel visible while scrolling through it

### Waiting List Mode

The landing page must support a **waiting list mode** controlled from the Dev Toggle. When active:

1. The navigation bar hides all standard links (Home, Store, Pricing, cart, auth/sign-in) — only the brand logo remains visible.
2. The hero CTA changes from "Start" to a waiting list email capture form.
3. The "About" section CTA ("Start my plan") is hidden.
4. The footer CTA section changes messaging to waiting list focus and includes an email capture form and spot counter.
5. A spot counter must show remaining spots (e.g., "38 of 50 spots left") and update in real-time when a user signs up.
6. The system creates urgency by promising a discount on the 12-month 1-on-1 coaching program for the first 50 signups.
7. Email capture must validate format before submission.
8. Backend submission is mocked; successful submission shows a confirmation state.
9. The Dev Toggle must include a "Waiting List Mode" checkbox to activate this mode.

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
7. Cart/session behavior is mocked.
8. Logged-out buyers must provide at least an email to buy something. 

### UX Requirements

* Clear product differentiation between free and paid
* Clean commerce flow despite mocked backend
* Consistent visual language with rest of platform 

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

### Messaging (Client Side)

1. Client chat with the coach must include:
   * Coach profile sidebar with photo, name, role, and response-time note
   * Real-time-style message bubbles with timestamps and read receipts
   * 3-dots menu with: Search in chat, Mute/Unmute notifications, Archive conversation, Delete conversation
   * Delete confirmation uses a styled modal dialog (not browser native confirm)
   * No call/video button in the header (video calls are not supported yet)
2. A "Schedule check-in" button must appear in the chat header (next to the 3-dots menu):
   * Opens an inline calendar date picker and time grid
   * Client selects a date (no past dates) and a time slot (9 AM – 4 PM, hourly)
   * Submits an ad-hoc check-in request to the coach
   * Maximum 1 pending ad-hoc check-in request at a time per client
   * When a pending request exists, the button shows a disabled "Pending" state
   * A pulsing dot indicator draws attention when no pending request exists
3. An upcoming check-in banner must appear at the top of the chat:
   * Shows the next confirmed check-in date, time, and type (e.g., "Weekly")
4. The client sidebar must include a "Next Check-in" widget:
   * Shows the date and time of the next confirmed check-in
   * Includes a "Join Meet" button linking to Google Meet (mocked URL)

### Notes

The chat implies messaging and notifications but does not fully define client-side plan completion, exercise logging, progress tracking, or adherence features. Those should be left as future-detail stories unless you want me to infer them into v1 scope.

---

## 5. Coach Portal

### Objective

Provide the coach with the operational backend to manage clients, communication, onboarding, and program delivery.

### Functional Requirements

1. Dashboard for managed clients, check-ins, important client info, and upcoming assessment calls.
   * The "Pending Check-ins" card must pull from the check-in system (not hardcoded)
   * The "Review" action must link to the Schedule/Check-ins page
   * The dashboard subtitle must dynamically reflect actual pending counts
2. Client onboarding flow where the coach enters client details.
3. Client onboarding flow must support coach-defined calorie and macro formulas per individual client.
4. Onboarding completion triggers an email invitation flow (mocked).
5. Coach chat must support navigating directly from a conversation to that client’s profile.
6. Notification UI must adapt to available screen space and avoid rendering outside the viewport.
7. Message actions like send/attach and send icon alignment must be visually centered and polished.

### Messaging (Coach Side)

1. Conversation list sidebar with client avatars (photo or letter initial), online status, unread count, and last message preview.
2. 3-dots menu per conversation with: Pin/Unpin, Mute/Unmute, Flag for follow-up, Archive, Delete.
3. Delete confirmation uses a styled modal dialog with warning icon.
4. No call/video button in the header (video calls are not supported yet).
5. An upcoming check-in banner must appear at the top of the active chat showing the next confirmed check-in for that client.
6. Pending ad-hoc check-in requests must appear as special styled cards at the bottom of the message stream (where the coach is looking):
   * Orange accent border and background
   * "CHECK-IN REQUEST" label
   * Client name, requested date/time, and optional note
   * Approve (dark) and Decline (outlined) action buttons inline
   * Approving/declining updates the check-in status immediately and fires a notification

### Schedule / Check-ins Page (`/coach/checkins`)

A dedicated page accessible from the coach sidebar "Schedule" link for global check-in management:

1. Three tabs: **Pending**, **Upcoming**, **Past**
2. **Pending tab**:
   * Lists all pending ad-hoc check-in requests across all clients
   * Each card shows client avatar, name, type badge (AD-HOC), date, time, optional note
   * Approve and Decline action buttons per card
   * Orange badge on the tab showing count of pending items
   * Empty state when no pending requests exist
3. **Upcoming tab**:
   * Lists all confirmed check-ins (both recurring and approved ad-hoc) sorted by date
   * Each card shows client info, date, time, type badge (RECURRING/AD-HOC), and "Confirmed" status
   * Count shown in tab header
4. **Past tab**:
   * Lists completed and declined check-ins
   * Status badges: green "Completed" with checkmark, red "Declined" with X icon
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
* Tags such as Strength, Hypertrophy, Recovery
* Equipment/no-equipment filterability 

**Plan**

* Shared object assigned to clients
* Contains weeks, days, and exercises
* Default duration is 4 weeks
* Includes one deload week by default
* One client can have at most one active plan
* Can be saved as draft
* Can be shared with one or more clients 

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
   * Equipment
   * No equipment 

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
19. Quick-add button ("+") in the exercise library as an alternative to drag-and-drop.
20. Day summary chips in the sidebar showing exercise count per day and warning indicators for empty training days.
21. Week overview bar at the top showing compact week pills with color-coded day dots for at-a-glance structure review.
22. Visible copy-week button (not hidden in hover menus) with popover to select target week(s) or "Apply to all."

### Training Hub

1. Training plan cards must show a clear visual distinction for draft plans (e.g., amber badge), not just appended text.
2. Plan cards must avoid redundancy between inline action buttons and the 3-dots menu — consolidate into a clean single set of actions.
3. Plan cards must include an intuitive way to assign a plan to a client directly from the card (popover with client search).
4. Delete plan confirmation must use a styled modal dialog with warning icon (not browser native confirm).

### Assignment and Scheduling

1. Coach assigns a plan to one or more clients.
2. Assigned clients receive notification.
3. Coach provides a default schedule.
4. Client may adjust schedule in ways that fit their needs, with controlled flexibility rather than full plan redesign. 

---

## 7. Check-in Scheduling System

### Objective

Enable clients to request ad-hoc check-ins with their coach, and support automatic recurring check-ins tied to training plans. Both sides should have clear visibility into upcoming check-ins and an easy way to join meetings.

### Data Model

**CheckIn**

* Unique ID
* Client ID and name
* Coach ID
* Date (ISO date string)
* Time (24-hour format)
* Type: `ad-hoc` or `recurring`
* Status: `pending`, `confirmed`, `declined`, or `completed`
* Source: `client-request` or `plan-schedule`
* Optional plan ID (for recurring check-ins linked to a plan)
* Created timestamp
* Optional client note

### Business Rules

1. **Maximum 1 pending ad-hoc check-in per client.** A client cannot submit a new ad-hoc request while one is already pending approval.
2. **Recurring check-ins are auto-confirmed.** When a plan is assigned to a client, weekly check-ins are automatically generated and confirmed (configurable frequency, default 1 per week).
3. **Ad-hoc check-ins require coach approval.** The coach can approve or decline. Counter-offers (suggesting a different time) are not supported in v1.
4. **Check-in meetings use Google Meet.** The client portal provides a "Join Meet" link (mocked URL in v1).

### Functional Requirements

#### Client Side

1. Client can request an ad-hoc check-in from the chat interface via a calendar date picker and time grid.
2. Calendar disables past dates; time grid offers hourly slots from 9 AM to 4 PM.
3. The request creates a check-in record with status `pending` and sends a message in the chat.
4. While a request is pending, the check-in button shows a disabled "Pending" state.
5. An upcoming check-in banner appears at the top of the chat.
6. A sidebar widget shows the next confirmed check-in with date, time, and a "Join Meet" button.

#### Coach Side

7. Pending ad-hoc requests appear as styled action cards at the bottom of the relevant client chat.
8. The coach can approve or decline directly from the chat card.
9. A dedicated `/coach/checkins` page provides global management with Pending, Upcoming, and Past tabs.
10. The coach sidebar "Schedule" link shows an orange badge with pending count.
11. The coach dashboard "Pending Check-ins" card pulls from the check-in system.

#### Notifications

12. When a client requests a check-in, a notification is created (visible to both roles with role-appropriate links).
13. When the coach approves a check-in, a notification is created.
14. Client notifications link to `/portal/messages`. Coach notifications link to `/coach/checkins`.

#### Recurring Check-in Generation

15. When a plan is assigned to a client, the system generates 4 weekly check-ins (default: Wednesdays at 10 AM).
16. Recurring check-ins are auto-confirmed and linked to the plan by plan ID.
17. Frequency is configurable (default: 1 per week).

---

# Shared UX / Technical Requirements

## Design System

1. Use reusable components wherever possible.
2. Prefer extending components over one-off implementations.
3. Use semantic token-based Tailwind styling.
4. Avoid ad hoc colors, sizes, and CSS.
5. Keep the codebase at equal or better quality after each pass. 

## Accessibility

1. UI must follow web accessibility standards.
2. Design must remain usable across mobile, tablet, and desktop.
3. Complex interactions should have accessible alternatives, especially in plan building.
4. UI elements must not clip or overflow at breakpoint boundaries. 

## Responsiveness

1. Support `sm`, `md`, and `lg` breakpoints.
2. Verify design quality right before and after breakpoints take effect.
3. Avoid clipping, overflow, and unnecessary shrinking. 

## Notifications

1. Notification bell in sidebar headers for both portals.
2. Notifications must be role-aware:
   * Client notifications link to client portal routes (e.g., `/portal/messages`)
   * Coach notifications link to coach portal routes (e.g., `/coach/messages?client=id`, `/coach/checkins`)
3. Toast notifications (top-right) with a "View" action button that uses client-side routing (not full page reload, to preserve app state).
4. Notification types include:
   * New message
   * Check-in requested (by client)
   * Check-in approved/scheduled (by coach)
5. Clicking a notification marks it as read and navigates to the appropriate page.

## Dev/Testability

1. A global floating Dev Toggle must simulate:

   * authenticated/unauthenticated states
   * client vs coach role
   * bundle purchased
   * waiting list mode
   * other mocked states as needed
2. The mocked environment should make flows testable without backend dependencies.

---

# Key User Flows

## Flow 1: Visitor to Assessment Call

Visitor lands on homepage → watches hero video / browses sections → understands coach philosophy and cycle-aware approach → clicks CTA → books 30-minute assessment call. 

## Flow 2: Assessment to Coaching Purchase

Visitor completes assessment → receives email with unique tokenized link → opens coaching bundle page with checkout enabled → purchases coaching bundle (mocked). 

## Flow 3: Coach Onboards Client

Coach opens coach portal → creates client → inputs client details → sets calorie and macro formulas → completes onboarding → system sends invitation email (mocked) → client can sign in. 

## Flow 4: Coach Creates Reusable Exercise

Coach opens training section → creates exercise → uploads `.mp4` demo → adds metadata and tags → saves exercise to reusable library. 

## Flow 5: Coach Builds a Plan

Coach opens dedicated plan builder page → starts with default 4-week structure → adjusts weeks → sets day types → adds exercises from library or creates new ones → reorders exercises → creates supersets → sets reps/sets/RIR → reviews deload week → saves as draft or saves final plan. 

## Flow 6: Coach Assigns Plan

Coach selects one or more clients → shares plan → client receives notification → plan becomes visible in client portal as current active plan. 

## Flow 7: Client Follows Plan

Client signs in → sees assigned plan and next scheduled workout/day → adjusts schedule within allowed bounds → follows plan. 

## Flow 8: Store Purchase / Free Download

Visitor browses store → views product details → adds free or paid item to cart → provides email if not logged in → completes mocked purchase/download flow.

## Flow 9: Waiting List Signup

Visitor lands on waiting-list-mode homepage → sees limited nav (logo only) → reads value proposition → enters email in hero or footer CTA → sees spot counter decrement → receives confirmation state → email captured (mocked).

## Flow 10: Client Requests Ad-hoc Check-in

Client opens messages → clicks "Check-in" button in chat header → calendar and time picker open inline → selects date and time → clicks "Request Check-in" → message appears in chat → button shows "Pending" state → coach receives notification.

## Flow 11: Coach Approves Check-in

Coach sees orange "Check-in Request" card in client chat (or navigates to Schedule page via notification/sidebar) → reviews date, time, and client note → clicks "Approve" → check-in status changes to confirmed → notification fires → client sees confirmed check-in in banner and sidebar widget.

## Flow 12: Client Joins Check-in Meeting

Client sees "Next Check-in" widget in sidebar with date, time, and "Join Meet" button → clicks "Join Meet" → opens Google Meet link in new tab (mocked URL).

---

# MVP Recommendation

## In MVP

* Landing page (including waiting list mode variant)
* Sticky nav with role-aware portal CTA pills
* Hero video and controls
* About section with IG story widget
* Principles section
* Workout explanation section
* Cycle-syncing section with scroll-linked wheel (stops after 1 cycle)
* Footer CTA with sheet slide-up animation
* Waiting list email capture with spot counter and urgency messaging
* Store with mocked cart
* Coach portal (dashboard, messages, clients, training, schedule/check-ins)
* Client onboarding basics
* Client portal (dashboard, messages, plan, nutrition, resources)
* Messaging with 3-dots menu, delete confirmation dialogs, read receipts
* Check-in scheduling system (ad-hoc requests, recurring auto-generation, approve/decline, calendar picker)
* Check-in visibility (chat banners, sidebar widgets, Join Meet button)
* Exercise library
* Dedicated plan builder page with exercise notes, quick-add, week overview, copy-week UX
* Training hub with draft badges, assign popovers, styled delete confirmation
* Plan draft/save/share
* Assignment notifications
* Role-aware notification system (check-in notifications, message notifications, proper routing)
* Dev Toggle (roles, auth, bundle, waiting list mode)
* Design system / responsiveness / accessibility foundations

## Later / Nice-to-Have

* Full blog CMS
* Rich client progress logging
* Real payment integration
* Real email service
* Real Google Meet integration (currently mocked URL)
* Rich analytics/reporting
* Version history for plans
* Check-in counter-offers (coach suggests alternative time)
* Configurable check-in frequency per client (currently default weekly)
* Check-in reminders and calendar integrations
* Video call system (currently no call support)
* Advanced search/filtering/reporting across clients

---

# Open Questions / Product Gaps

These were not fully specified in the source chat and will need decisions before story writing gets too detailed:

1. What exact limits apply when clients adjust schedules?
2. Can a plan be assigned to multiple clients while customized per client, or is it shared as one base template?
3. What happens when a client already has an active plan and the coach assigns another?
4. What notification channels exist beyond in-app?
5. What product metadata is needed in the store beyond price/free status?
6. What exact blog authoring workflow is expected?
7. Should client portal include exercise demo playback, completion tracking, and adherence logging in v1?
   These are not contradictions; they are simply areas the chat did not fully define. 

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
11. Plan Builder
12. Plan Assignment and Client Schedule
13. Check-in Scheduling System
14. Notification System
15. Client Portal Experience

If you want, I can turn this PRD into a **story map with epics, features, and user stories** next.

