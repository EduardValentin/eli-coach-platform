---
name: plan-user-stories
description: Use when explicitly asked to plan a feature area into technically coherent vertical user stories from a reference prototype and an existing production codebase.
disable-model-invocation: true
---

# Plan User Stories

## Purpose

Act as the technical lead for prototype-backed feature planning. Discover the
whole requested area, agree the vertical story split, then plan and draft one
story at a time.

## Required skills

- Use `feature-work-planning` throughout.
- Use `prototype-backed-workflow` during prototype and production discovery.
- Use `software-architecture-principles` while evaluating boundaries.
- Use `writing-in-owner-voice` and `ticket-writing` only after one story's
  technical plan is settled.

## Workflow

### 1. Establish current truth

1. Read the repository instructions and binding architecture, design, product,
   and command documents.
2. Fetch `origin/main`. Inspect referenced files and commits from that fresh
   remote state; do not rely on memory or a stale preview.
3. Inspect the requested prototype area first. Record routes, states, actions,
   validation, data, business rules, emails, integrations, error states, and
   connected coach or client surfaces.
4. Inspect the corresponding production UI, domain, API, data, infrastructure,
   email, tests, and composition code.
5. Produce a functionality inventory: prototype behavior, stated requirement,
   production state, and implementation gap. Distinguish evidence from
   assumptions.

### 2. Align and split

Create the `feature-work-planning` Requirements Alignment and Draft Planning
Packet. A high-impact unknown that changes actors, permissions, core flow,
data lifecycle, provider contract, feasibility, or delivery approach is a
blocker: ask one focused question and wait.

Preferences such as “free,” “easy to integrate,” “provider-neutral,” or “not a
hard requirement” constrain a provider decision; they do not settle it. Never
choose a material contract because the user is rushed, unavailable, or asks
for complete output. Do not propose slices until blockers are resolved.

Propose stories as vertical user outcomes. Each story should exercise the
relevant UI, domain, persistence, provider, and notification boundaries needed
for its outcome. Use an enabling story only when no honest user outcome can
validate the prerequisite.

For every proposed story include:

- outcome and scope;
- why this boundary is independently verifiable;
- dependencies and order;
- integration points;
- important exclusions.

Stop and obtain explicit approval of the split. Do not draft final tickets or
plan all stories in detail at this stage.

### 3. Plan one story

For the next approved story, reconcile prototype behavior, requirements, and
current production architecture. Specify:

- user flow and observable states;
- domain rules, entities, lifecycle, permissions, and concurrency;
- UI, route/API, persistence, email, provider, configuration, and composition
  changes;
- failure behavior, idempotency, privacy, and operational concerns;
- tests, browser checks, parity evidence, and acceptance themes;
- dependencies, non-goals, and source-of-truth follow-ups.

Do not invent a material contract. Return to alignment when new evidence
reveals one.

### 4. Draft and gate

After the technical plan is settled, use `writing-in-owner-voice` and
`ticket-writing` to draft that story. Do not publish it.

Ask the user to approve or revise the plan and draft. Move to the next story
only after explicit approval.

## Stage contract

- Discovery output: evidence-backed inventory.
- Split output: provisional epic packet and story outlines.
- Story output: one technical plan followed by one ticket draft.
- Approval output: accepted decisions, then the next story.

## Common mistakes

- Treating prototype placeholders as production contracts.
- Silently selecting a calendar, video, email, or timezone policy.
- Calling an invented contract a decision, default, recommendation, or
  assumption to bypass alignment.
- Splitting into frontend, backend, database, and email stories.
- Drafting every ticket before the split or prior story is approved.
- Expanding source-of-truth cleanup into implementation scope without request.
