# Fix claim options, add claim details and handover contact, darker theme

## 1. No claim option on your own posts
- Sign in as a test student, post a lost item and a found item, and confirm exactly where the "This is mine" / claim option wrongly shows up (lost tab, found tab, home board, match results).
- Hide claim actions anywhere the post belongs to the signed-in student. Show a "Your post" tag and a link to review claims instead.
- Match results under "Find matches" get their own "This is mine" button, shown only on other people's found items.
- The server keeps refusing claims on your own items, so a stale screen can't get around it.

## 2. More info when claiming
The claim form gets proper fields instead of one text box:
- Where and when you lost it
- Identifying details (colour, marks, contents, stickers)
- Optional link to your own lost report
- Optional photo as proof

After sending, the claimant can **add more info** to a pending claim from My activity. The finder can **ask a question** from their review screen, and the claimant gets a notification to reply. This makes a short back-and-forth thread on each claim.

## 3. How people contact each other after approval
- When the finder approves a claim, both people see a **Handover card** in My activity and on the dashboard. It shows the other person's name, their contact details, and a suggested meeting spot (the finder picks it when approving, for example "Library front desk, 4pm").
- Both get a notification with a link to the card.
- If either person hasn't added contact info, they're asked to add it in Profile before approving or claiming.
- Once the item is handed over, the finder taps "Mark handed over". The contact details then hide again for both people.
- Borrowing on the resource shelf works the same way: contact details show while a loan is approved and hide once the item is returned.

## 4. Darker theme
- Make the whole app dark by default: deep near-black background, slightly lighter cards, soft borders.
- Keep the lavender, periwinkle and cyan accents, the logo and the current fonts, so it still feels like CampusFind.
- Check contrast on badges, buttons and form fields.

## Technical details
- Claims and borrow requests: only the server can set status. Students can't insert or update status themselves anymore. Approve, reject and handed-over all go through server checks that confirm the caller is the finder or lender. This also closes the open findings where a user could approve their own claim or borrow request.
- New `claim_messages` table (claim_id, author_id, body, created_at). Only the claimant, the finder and admins can read it, and inserts are limited to those two people while the claim is open.
- New `meeting_note` column on `item_claims` (nullable), plus a `handed_over` claim status.
- Contact access: allowed only while the claim or borrow is `approved`. `returned` and `handed_over` revoke it.
- Theme: switch the `:root` tokens in `src/styles.css` to the dark palette (the semantic tokens stay the same).
- Verify the full flow end to end with two signed-in test accounts: post, claim, ask a question, reply, approve, see contact, mark handed over, and confirm the contact is hidden.
