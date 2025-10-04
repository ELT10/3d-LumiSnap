# Initial Choice Screen – Refined UI

## Summary
- Adopted dark, studio-inspired palette driven by theme tokens (`--bg-ink`, `--primary`, `--secondary`).
- Applied new typography stack (`Manrope`, `Epilogue`) through `theme.css`.
- Rewrote layout to emphasize clarity and hierarchy without gradient blobs.

## Visual Decisions
- **Container**: centered column, generous breathing room using clamp-based padding.
- **Eyebrow**: uppercase label to set professional tone.
- **Heading**: Epilogue, tight letter-spacing for architectural feel.
- **Body copy**: muted `rgba(230,234,241,0.7)` in Manrope to reduce contrast fatigue.
- **Cards**:
  - Gradient from `surface-1` to `surface-2` for subtle depth with glass blur.
  - Card accent icons use `primary` (amber), `secondary` (teal), and cool cyan variant for demo.
  - Features rendered as pill tags with transparent backgrounds.
- **Buttons**:
  - Primary CTA uses amber gradient; secondary CTA is ghost with cyan border.
  - Hover states elevate with softer shadows, not glow.
- **Footer**: hairline border top, capsule tags for tech stack.

## Implementation Files
- `src/components/AIWorkflow/InitialChoice.tsx`
- `src/components/AIWorkflow/InitialChoice.css`
- `src/index.css` (background gradients + noise)
- `src/styles/theme.css`
- `index.html` (Google Fonts)

## Next Steps
- Cascade the palette to TextPrompt, ImageUpload, ModelPreview.
- Update 3D scene overlay UI to use theme tokens.
- Evaluate light/dark adjustments for readability.
- Explore animated lighting gradients behind cards.
