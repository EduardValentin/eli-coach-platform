# Terms Updates

The current Website and Store Terms live in `packages/content/src/website-and-store-terms/current.ts`. The public page at `/terms` and the PDF are both rendered from it.

To change the Terms:

1. Edit `current.ts`, bump its version, and set the new effective date.
2. Run `pnpm terms:pdf` to render the PDF for the new version.
3. Review `/terms` in the running app.
4. Commit the source and the PDF together.

Never overwrite an older Terms PDF. Each version keeps its own file so past acceptances stay traceable.
