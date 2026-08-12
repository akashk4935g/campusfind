# Fix data issues, add Profile + notification badge, premium dashboard

## What's wrong today (verified)

1. **Claim / borrow buttons show on your own posts.** The public board query returns only safe columns and leaves out the poster's id, so the page can't tell which items are yours. The server does block it (`You reported this item yourself.`) but only after you click — it looks like a bug.
2. **Your account info is thin.** There is no signup trigger creating a profile; a profile row is created lazily and named from your email address, so Google users show up as their email instead of their real name. There is no page to view or edit name, campus, or contact details, even though the save-profile function already exists.
3. **No unread signal.** Notifications exist (3 stored) but the bell in the header never shows a count, so approvals/claims go unnoticed.
4. **Landing after sign-in is the plain activity list**, not a dashboard.

## What I'll change

### Data / backend
- Add a database trigger so a profile row is created automatically the moment an account is created, using the real name from email or Google sign-up (name, avatar).
- Backfill names for existing accounts that were saved as an email address.
- Include the poster's id (`reporter_id` / `finder_id` / `owner_id`) in the public board data. These are opaque ids, not personal info — no contact details are exposed.
- Add a summary reader for the dashboard: counts of my lost/found posts, my listings, pending claims to review, pending borrow requests, unread notifications, and approved matches.

### Ownership-aware actions
- On the board and shelf, your own items show an "Your post" tag with a manage link instead of "This is mine" / "Request to borrow".
- Sample/demo items keep their demo label and never offer claim actions.
- Claim/borrow buttons stay disabled with a reason when the item is already claimed or lent.

### Profile page (`/profile`, protected)
- Avatar/initials, name, campus, contact details, member-since date.
- Edit form wired to the existing save-profile function, with validation.
- Counters for your posts and quick links to your activity.
- Sign-out here too.

### Notifications
- Bell in the header shows an unread dot/count, polled with the existing notifications query.
- Notification list gets read/unread styling, per-item mark-as-read, "mark all read", and grouped icons by kind (claim, borrow, match).

### Premium dashboard (`/dashboard`, protected)
- Becomes the post-sign-in landing page (sign-in redirects here; `/activity` stays as the detail view).
- Hero row: greeting by first name, campus, and a "Post" action cluster.
- Stat tiles for pending claims, active listings, unread alerts, reunited items, with subtle iridescent accents matching the current Vapor Chrome theme.
- Action queue card: anything waiting on you (claims to decide, borrow requests) with approve/decline inline.
- Recent activity timeline and a "Suggested matches" strip.
- Empty states with a single clear next step.

### Header / nav
- Replace the bare "Sign out" button with an account menu: avatar, name, Profile, Dashboard, Activity, Admin (admins only), Sign out.

## Technical notes
- One migration: `handle_new_user` trigger + function on account creation inserting into `public.profiles` (security definer, `search_path = public`), plus a one-off name backfill. No RLS relaxation.
- Public column lists in `campus.server.ts` gain the owner id columns; new `fetchDashboardSummary` runs through the caller's authenticated client so RLS still scopes every count.
- New server fn `getDashboard` with `requireSupabaseAuth`; new routes `src/routes/_authenticated/profile.tsx` and `src/routes/_authenticated/dashboard.tsx`, each with its own `head()` metadata.
- Auth page and sign-in redirects point to `/dashboard`.
- Contact reveal rules are unchanged: details still unlock only for owners, admins, and approved claims/borrows.
