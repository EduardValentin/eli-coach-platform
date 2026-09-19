---
name: plan-user-stories
description: Use when explicitly asked to plan a feature area into technically coherent vertical user stories from a reference prototype and an existing production codebase.
disable-model-invocation: true
---

# Plan User Stories

## Purpose

Act as the technical lead for feature planning. Discover the
whole requested area, agree the vertical story split, then plan and draft one
story at a time.

## Required skills

- Use `feature-work-planning` throughout.
- Use `prototype-backed-workflow` during prototype and production discovery.
- Use `software-architecture-principles` while evaluating boundaries.
- Use `writing-in-owner-voice` and `ticket-writing` only after one story's
  technical plan is settled.

## Workflow

### 1. Context gathering

1. Fetch the latest `origin/main`.
2. Read the repository instructions, architecture, design, and documents.
3. Inspect the mocked functionality we are planning in the prototype app first.
   Pay attention at functionalities exposed, user flows and mocked interactions.
   Those serve as guidance for planning our work and figuring out what we need 
   to implement in the real app.
4. Inspect referenced files and commits from that fresh
   remote state; do not rely on memory or a stale preview.
5. Inspect the corresponding production code that might relate to our future 
   implementation of this planned feature. Scope this inspection accordingly.
6. Keep a durable artifact where you keep track of what you figured out during 
   the context gathering phase. You will use this file to also keep track of 
   the planned work as we go.

### 2. Align and split

Propose user stories as vertical slices. Vertical slices let a user story implementation
go through multiple integration points so we fail fast if something is not working.

Stop and obtain explicit approval of the split. Do not draft final tickets or
plan all stories in detail at this stage.

### 3. Plan one story

For the next approved story, reconcile prototype behavior, requirements, and
current production architecture.

Produce a high level spec of how the implementation would look like.

Think about important unknowns that we should settle and ask me for any clarifications.

The outcome of this stage is a design spec of the future user story.

### 4. Draft 

After the story is planned, use `writing-in-owner-voice` and
`ticket-writing` to draft that story. Do not publish it.

Keep the technical notes lean: a handful of one-line nudges naming the
pattern to follow, the slice or port the work touches, and what to be careful
about. Schema definitions, port and method names, file paths for every module
and step-by-step design belong in the design document and implementation
plan, not in the ticket.

Present the whole draft verbatim, technical notes included. Never summarise a
section of the draft in the approval message.

Ask the user to approve or revise the spec and draft. 

If approval is given, the draft must be published under the correct project and 
epic in Linear using the available MCP connection.

Model every dependency as a native Linear relation: parent, blocked by, blocks
and related are set on the issue, never repeated as a "Dependencies" list in
the body. When a related story does not exist yet, add the relation after it
is published rather than writing a placeholder line.

Only after the user story is published, we can move to planning the next one and
repeat from stage 3 until we go through all the stories in the proposed split.
