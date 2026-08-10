# CampusFind — rebuild on Lovable stack

Rebuild the uploaded CampusFind app (lost & found + resource sharing for campuses) as a TanStack Start app backed by Lovable Cloud, replacing the Express/MongoDB/Firestore backend. Fresh, distinctive visual direction (not the original indigo/slate look).

## Features carried over

- Accounts: email/password + Google sign-in, with profiles (name, campus/college, contact info) and roles (student, admin).
- Report a lost item: title, description, category (ID Card, Electronics, Stationery, Bottle, Clothing, Books, Other), location lost, date, optional photo, contact info.
- Report a found item: same fields, plus finder and status (open / matched / claimed).
- Lost & Found browse page: search, category / type / date filters, item cards.
- Smart match suggestions: the original scoring algorithm (category 40 pts, title+description keyword overlap 40 pts, location similarity 20 pts) re-implemented server-side, shown in a match modal with confidence score and human-readable reasons.
- Claim flow: a user claims a found item; claim goes pending, the finder or an admin approves or rejects; item status updates.
- Resource sharing: listings (books, calculators, lab kits, etc.) plus borrow requests with pending / approved / rejected / returned states.
- My Activity: my reports, my claims, my listings, my borrow requests.
- Notifications: in-app list for matches, claim decisions, borrow decisions.
- Admin view: moderate items, approve claims, resolve disputes.

## Design

Generate three rendered design directions for a campus lost & found product and let you pick one before the UI is built out. Locked afterwards: same tokens, type, and composition as the chosen direction.

## Technical notes

- Lovable Cloud (Postgres + auth + storage) replaces MongoDB/Firestore; Express routes/controllers become TanStack `createServerFn` server functions. No `react-router-dom` — routes live under `src/routes/`.
- Tables: `profiles`, `user_roles` (separate table + `has_role` security-definer function), `lost_items`, `found_items`, `item_claims`, `resource_listings`, `borrow_requests`, `notifications`. Every table gets explicit GRANTs and RLS policies (owners manage their own rows, authenticated users read open listings, admins via `has_role`).
- Item photos go to a Cloud storage bucket with signed upload from the client.
- Matching algorithm ported to TypeScript as a pure helper called from a server function so scores are never computed on untrusted client input.
- Contact info is only revealed to the item owner, the matched counterparty, and admins — not to anonymous or unrelated users.
- Migration includes a small set of seeded demo items and resources so the first screens aren't empty.
- Routes: `/` (landing), `/lost-found`, `/report/lost`, `/report/found`, `/resources`, `/activity`, `/notifications`, `/admin`, `/auth`, `/reset-password`. Authenticated pages sit under an `_authenticated` layout.

## Not carried over

Gemini/AI Studio wiring, Firebase rules, and the Express server files — none of that runs on this stack. If you want AI-assisted matching later, it can be added through the built-in AI gateway.
