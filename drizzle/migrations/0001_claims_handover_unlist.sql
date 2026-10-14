ALTER TYPE public.claim_status ADD VALUE IF NOT EXISTS 'handed_over';
ALTER TYPE public.claim_status ADD VALUE IF NOT EXISTS 'cancelled';
ALTER TYPE public.borrow_status ADD VALUE IF NOT EXISTS 'cancelled';

ALTER TABLE public.item_claims
  ADD COLUMN IF NOT EXISTS where_when text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS identifying_details text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS proof_photo text,
  ADD COLUMN IF NOT EXISTS meeting_note text;

ALTER TABLE public.lost_items ADD COLUMN IF NOT EXISTS is_listed boolean NOT NULL DEFAULT true;
ALTER TABLE public.found_items ADD COLUMN IF NOT EXISTS is_listed boolean NOT NULL DEFAULT true;
ALTER TABLE public.resource_listings ADD COLUMN IF NOT EXISTS is_listed boolean NOT NULL DEFAULT true;

-- Status is decided only by the server; students can only create pending rows.
DROP POLICY IF EXISTS "Users create their own claims" ON public.item_claims;
CREATE POLICY "Users create their own pending claims" ON public.item_claims FOR INSERT TO authenticated
WITH CHECK (auth.uid() = claimant_id AND status = 'pending' AND decided_by IS NULL AND meeting_note IS NULL
  AND EXISTS (SELECT 1 FROM public.found_items f WHERE f.id = found_item_id AND f.finder_id <> auth.uid() AND f.is_listed AND f.status <> 'claimed'));
DROP POLICY IF EXISTS "Finders decide claims" ON public.item_claims;

DROP POLICY IF EXISTS "Requesters create requests" ON public.borrow_requests;
CREATE POLICY "Requesters create pending requests" ON public.borrow_requests FOR INSERT TO authenticated
WITH CHECK (auth.uid() = requester_id AND status = 'pending'
  AND EXISTS (SELECT 1 FROM public.resource_listings r WHERE r.id = resource_id AND r.owner_id = lender_id AND r.owner_id <> auth.uid() AND r.is_listed));
DROP POLICY IF EXISTS "Lenders decide requests" ON public.borrow_requests;

-- Browse: signed-in students see listed posts plus their own.
DROP POLICY IF EXISTS "Signed-in users browse lost items" ON public.lost_items;
CREATE POLICY "Signed-in users browse lost items" ON public.lost_items FOR SELECT TO authenticated USING (is_listed OR reporter_id = auth.uid() OR private.has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Signed-in users browse found items" ON public.found_items;
CREATE POLICY "Signed-in users browse found items" ON public.found_items FOR SELECT TO authenticated USING (is_listed OR finder_id = auth.uid() OR private.has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Signed-in users browse resources" ON public.resource_listings;
CREATE POLICY "Signed-in users browse resources" ON public.resource_listings FOR SELECT TO authenticated USING (is_listed OR owner_id = auth.uid() OR private.has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE public.claim_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id uuid NOT NULL REFERENCES public.item_claims(id) ON DELETE CASCADE,
  author_id uuid NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.claim_messages TO authenticated;
GRANT ALL ON public.claim_messages TO service_role;
ALTER TABLE public.claim_messages ENABLE ROW LEVEL SECURITY;
CREATE INDEX claim_messages_claim_idx ON public.claim_messages(claim_id, created_at);

CREATE POLICY "Claim parties read messages" ON public.claim_messages FOR SELECT TO authenticated
USING (private.has_role(auth.uid(), 'admin'::app_role) OR EXISTS (
  SELECT 1 FROM public.item_claims c JOIN public.found_items f ON f.id = c.found_item_id
  WHERE c.id = claim_id AND (c.claimant_id = auth.uid() OR f.finder_id = auth.uid())));
CREATE POLICY "Claim parties post on open claims" ON public.claim_messages FOR INSERT TO authenticated
WITH CHECK (author_id = auth.uid() AND char_length(body) BETWEEN 1 AND 1000 AND EXISTS (
  SELECT 1 FROM public.item_claims c JOIN public.found_items f ON f.id = c.found_item_id
  WHERE c.id = claim_id AND c.status = 'pending' AND (c.claimant_id = auth.uid() OR f.finder_id = auth.uid())));