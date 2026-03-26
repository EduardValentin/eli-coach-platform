## Non-Negotiable Rules

1. Mock all backend and third-party connections.
2. Use a global floating **Dev Toggle** to simulate app states.
3. Leave the codebase cleaner or equal after every change.
4. Prefer reusable components over one-off implementations.
5. Extend existing components before creating new ones.
6. Use only semantic Tailwind design tokens.
7. Keep all UI accessible and responsive across **sm / md / lg**.
8. Verify layouts at breakpoint edges for overflow, clipping, and bad resizing.
9. Keep visuals consistent with the app’s design system and aesthetic.
10. Keep `DESIGN.md` and `brand-voice.md` updated and follow them at all times.

---

## Design Guidelines

- Use a base font-size of 16px
- Keep the design consistent with the current vibe of the application.
- Always check at the breakpoint cut points, right before the breakpoint will hit and right after it hits to see if elements overflow from their container or get clipped, or overlap with other elements or generaly look bad and fix them.
- Strike a good balance of warmness and competence visually.
- The design must be appealing to a women based audience of 18-40 years old.
- The design must feel elegant, premium but also warm and empowering.
- Keep the copy text in line with brand-voce.md.
- Don't leave inconsistent empty spaces around sections.
- We should aim for a visually impresive design but never at the detriment of accessibility and generally good UX.
- The landing page should be more visually impresive than the rest of the pages in terms of visual impact and animations.
- Don't use a dropdown if there are 2 or fewer options

## Button

The Button component is a fundamental interactive element in our design system, designed to trigger actions or navigate
users through the application. It provides visual feedback and clear affordances to enhance user experience.

### Usage

Buttons should be used for important actions that users need to take, such as form submissions, confirming choices,
or initiating processes. They communicate interactivity and should have clear, action-oriented labels.

### Variants

- Primary Button
  - Purpose : Used for the main action in a section or page
  - Visual Style : Bold, filled with the primary brand color
  - Usage : One primary button per section to guide users toward the most important action
- Secondary Button
  - Purpose : Used for alternative or supporting actions
  - Visual Style : Outlined with the primary color, transparent background
  - Usage : Can appear alongside a primary button for less important actions
- Tertiary Button
  - Purpose : Used for the least important actions
  - Visual Style : Text-only with no border, using primary color
  - Usage : For actions that should be available but not emphasized