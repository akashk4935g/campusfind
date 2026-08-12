# CampusFind logo

## What I'll make

A simple, distinctive brand mark that fits the current iridescent-pastel, editorial look: a rounded square/pin shape with a subtle magnifier-meets-locator motif, in the app's lavender/periwinkle/cyan palette, on a transparent background. Square, clean at small sizes.

## Where it goes

- **Header** — mark next to the "CampusFind" wordmark in the site header (replaces the current text-only lockup, keeps the wordmark).
- **Footer** — small mark beside the footer line.
- **Auth page** — mark above the sign-in card for a branded first impression.
- **Favicon / browser tab** — square version wired into the root route, replacing the default Lovable icon.
- **Social preview** — the logo image reused as the og/twitter image on the home route.

## Technical notes

- Generate the mark as a transparent PNG in `src/assets/`, imported directly.
- Downscaled square copy written to `public/favicon.png`, referenced from `head().links` in `src/routes/__root.tsx`; the default `public/favicon.ico` is removed.
- No backend, data, or auth changes.
