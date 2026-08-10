# CampusFind: Google sign-in prompt, demo items, and a new Gen-Z look

## 1. Why Google sign-in shows an "approve Lovable" screen

Sign-in currently runs through the platform's managed Google login. That means Google shows its consent screen with Lovable's name on it, because Lovable's verified OAuth app is the one asking for your email and profile. It's safe, and no setup is needed — but the branding is Lovable's, not CampusFind's.

Two ways to change it:

- **Keep as-is** — one extra approval the first time only, then it never appears again for that account.
- **Use your own Google credentials** — you create a Google OAuth client for "CampusFind" and paste the client ID + secret into the backend's auth settings. Then the consent screen says CampusFind. This is a dashboard step you do; I'll write the exact walkthrough.

Nothing in the code changes either way, so this part of the plan is documentation plus a short in-app note on the sign-in card explaining what the approval is for.

## 2. Demo listings become a guided tutorial

Instead of deleting the seeded rows, they get repositioned as a teaching demo:

- Signed-out visitors see the sample items on the board, each tagged with a clear "Sample" marker so nobody mistakes them for real posts.
- A short "How CampusFind works" tutorial strip appears above the board for signed-out visitors: report a lost item → post something you found → attach a photo → get notified when a match appears.
- Once signed in, the sample items are hidden everywhere (board, resource shelf, matching, counts) so your real board is clean from day one.
- Sample rows stay untouched in the database, so nothing is destroyed and the tutorial keeps working for every new visitor.

## 3. "Post a found item" gets its own front-door

The found-item form already exists but is hard to reach — the header only links to the lost-item form. Fixes:

- Header gets a compact "Post" menu with three entries: Lost something, Found something, Lend a resource.
- The home page gets two side-by-side primary actions: "I lost something" and "I found something".
- The board gets an inline "Found this? Post it" button next to each lost item.

## 4. New visual direction: iridescent-pastel, editorial, minimal

Replacing the current warm paper-noticeboard theme entirely.

- **Palette** — Vapor Chrome: soft lavender and periwinkle bases (#c4b5fd, #818cf8) with cyan/aqua accents (#67e8f9, #a5f3fc), on a near-white canvas with a matching dark mode. Iridescent gradient used sparingly, one accent per screen.
- **Type** — classy editorial pairing: **Instrument Serif** for headlines (large, tight, high-contrast) and **Plus Jakarta Sans** for body and UI. Replaces Bebas Neue + Barlow.
- **Layout** — bento grid: the board and home page become mixed-size tiles, with featured/urgent items taking bigger cells and quieter items in small ones.
- **Minimalism** — flat surfaces, hairline borders, generous whitespace, no offset "riso" shadows, subtle blur/soft-glow on hover only, rounded corners increased. Status is communicated by a single small colored dot plus a label rather than heavy blocks.
- Mobile-first: the bento grid collapses to a single column, and the header collapses to a sheet menu.

## Technical notes

- `src/styles.css`: replace all OKLCH tokens for both themes with the Vapor Chrome scale; drop the `notice-card` / `pin-label` utilities in favour of `tile` and `tag` utilities; new `--font-display` / `--font-sans`. Fonts loaded via `<link>` in `src/routes/__root.tsx` head (never a CSS URL import).
- New `src/components/bento-grid.tsx`; `item-card.tsx` rewritten with a `size` variant ("wide" | "tall" | "standard") and the new flat styling.
- `src/components/site-chrome.tsx`: add the Post dropdown (shadcn `dropdown-menu`) and a mobile sheet.
- Sample data: add an `is_sample` boolean flag (default false) to `lost_items`, `found_items`, `resource_listings` via migration, set true on the existing seeded rows. Public read server functions in `src/lib/campus.server.ts` accept a flag so signed-out board queries include samples and authenticated queries exclude them; matching and counts always exclude samples.
- Tutorial strip is a new signed-out-only component on `/`, `/lost-found`, `/resources`; no new backend surface.
- Head metadata on each route refreshed to match the new copy.
