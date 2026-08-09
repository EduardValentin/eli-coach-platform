# Waitlist

Lets visitors join Eli's waiting list from the public marketing site, shows a
qualitative read on availability, and confirms signup by email — the entry
point coaching runs through while `WAITLIST_MODE` is enabled.

## Flows

- **Join** — a visitor submits their email from the hero, footer CTA, or
  pricing page form. The submission passes the browser bot-detection gate,
  then `POST /api/waitlist`. A duplicate email keeps its original pricing
  allocation and triggers no new email; every successful submission, new or
  duplicate, gets the same generic success response, so the browser can never
  reveal whether an email was already registered.
- **Availability display** — public surfaces read `GET /api/waitlist` for a
  qualitative label ("Reduced-price spots available", "Limited spots",
  "Reduced-price spots closed") that only changes at fixed half-hour
  intervals, never an exact count. If the check fails, surfaces fall back to
  a generic outage message and joining stays open.
- **Confirmation email** — on a new registration the service fires the
  confirmation email without blocking the response, stating whether the
  visitor landed reduced or regular pricing. A failed send is logged, not
  retried inline, and never fails the join request.

## Surfaces

Public site only: the hero section, the footer CTA, and the pricing page.
Waitlist has no coach- or client-portal presence.

## Structure

- `contracts/` — wire schemas shared by browser and server.
- `data/` — the Drizzle schema and repository.
- `api/` — the route module and controller behind `/api/waitlist`.
- `email/` — the confirmation email template and send adapters.
- `ui/public/` — the form, availability status, query hooks, submission
  wiring, confetti, and client helpers.

The pure rules — pricing allocation, availability banding, duplicate
handling — live in `packages/domain/src/waitlist/`, which this feature
depends on and never reimplements.
