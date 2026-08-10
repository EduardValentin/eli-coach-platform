# Domain

The pure half of every feature: rules, models, and the ports through which a
rule asks for something it cannot do itself. No I/O, no framework, no vendor
SDK. Its adapters — the repository, the asset store, the email sender — live
with the feature that owns them, in `apps/platform/src/features/<name>/data/`
and `email/`, or in `packages/infrastructure` when more than one feature needs
them.

## Why it has no `dependencies` key

`package.json` here declares no `dependencies`, no `devDependencies` and no
`peerDependencies` — no dependency field at all. That absence *is* the
enforcement. Under pnpm's per-package resolution a workspace package resolves
what it declares and little else, so a file in `src/` that reached for the
imports that would end purity does not compile — `pnpm --filter
@eli-coach-platform/domain typecheck` on a scratch file importing all five:

```
error TS2307: Cannot find module 'react' or its corresponding type declarations.
error TS2307: Cannot find module 'drizzle-orm/node-postgres' or its corresponding type declarations.
error TS2307: Cannot find module 'resend' or its corresponding type declarations.
error TS2307: Cannot find module 'pg' or its corresponding type declarations.
error TS2307: Cannot find module 'zod' or its corresponding type declarations.
```

The other boundaries in this repo announce themselves. R1–R7 in
`eslint.config.mjs` fail with a message naming what you imported and what to
reach for instead; the `.server` suffix and `packages/infrastructure`'s export
map fail at build time pointing at the file. This one announces nothing —
there is no rule to trip and no key to read, only a resolution that does not
happen. That is exactly why it is written down here: the likeliest way to lose
the guarantee is someone adding the key in good faith to reach for one small
library, and nothing in `package.json` would have told them not to.

**If you find yourself needing a dependency in here, the code belongs on the
other side of a port.** Define the port here as a type, implement it in the
feature's `data/` or `email/`, and let the composition root wire the two
together.

## The one thing that still resolves

Anything the **workspace root** declares in its own `devDependencies` is
linked at the root and stays reachable by walking up, so `vitest` — and, were
anyone to try, `msw` or `testcontainers` — resolves here. Seven test files use
it; that is the whole of it, and tests are not shipped. Production source in
`src/` imports nothing outside this package. The physics stops every runtime
and vendor dependency; the root's test tooling is the gap, and review is what
closes it.

## Layout

One directory per feature, mirroring `apps/platform/src/features/`:
`coaching-bundles/`, `store/`, `waitlist/` — plus `feature-flags/`, whose
adapters live in `packages/infrastructure` rather than in a feature, because
the flags are the platform's rather than any one product feature's.

`src/index.ts` is the package's single public entry, named by the `exports` map
so no consumer can deep-import a file. The two consumers are `apps/platform`
and `packages/infrastructure`, both of which declare it `workspace:*`.
