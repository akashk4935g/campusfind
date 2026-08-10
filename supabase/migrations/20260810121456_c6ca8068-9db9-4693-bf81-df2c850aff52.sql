-- Enums
CREATE TYPE public.app_role AS ENUM ('admin', 'student');
CREATE TYPE public.item_category AS ENUM ('ID Card', 'Electronics', 'Stationery', 'Bottle', 'Clothing', 'Books', 'Other');
CREATE TYPE public.lost_status AS ENUM ('open', 'matched', 'resolved');
CREATE TYPE public.found_status AS ENUM ('open', 'matched', 'claimed');
CREATE TYPE public.claim_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE public.resource_availability AS ENUM ('available', 'lent', 'unavailable');
CREATE TYPE public.borrow_status AS ENUM ('pending', 'approved', 'rejected', 'returned');

-- Shared updated_at helper
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY,
  full_name TEXT NOT NULL DEFAULT 'Student',
  campus TEXT,
  contact_info TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- USER ROLES
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  );
$$;

CREATE POLICY "Users read own profile" ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users insert own profile" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "Users read own roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- LOST ITEMS
CREATE TABLE public.lost_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category public.item_category NOT NULL DEFAULT 'Other',
  location_lost TEXT NOT NULL,
  date_lost DATE NOT NULL DEFAULT CURRENT_DATE,
  image_url TEXT,
  status public.lost_status NOT NULL DEFAULT 'open',
  matched_found_item_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.lost_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lost_items TO authenticated;
GRANT ALL ON public.lost_items TO service_role;
ALTER TABLE public.lost_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can browse lost items" ON public.lost_items
  FOR SELECT USING (true);
CREATE POLICY "Users report their own lost items" ON public.lost_items
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "Reporters update their lost items" ON public.lost_items
  FOR UPDATE TO authenticated
  USING (auth.uid() = reporter_id OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (auth.uid() = reporter_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Reporters delete their lost items" ON public.lost_items
  FOR DELETE TO authenticated
  USING (auth.uid() = reporter_id OR public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER lost_items_updated_at BEFORE UPDATE ON public.lost_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- FOUND ITEMS
CREATE TABLE public.found_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  finder_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category public.item_category NOT NULL DEFAULT 'Other',
  location_found TEXT NOT NULL,
  date_found DATE NOT NULL DEFAULT CURRENT_DATE,
  image_url TEXT,
  status public.found_status NOT NULL DEFAULT 'open',
  matched_lost_item_id UUID,
  claimed_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.found_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.found_items TO authenticated;
GRANT ALL ON public.found_items TO service_role;
ALTER TABLE public.found_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can browse found items" ON public.found_items
  FOR SELECT USING (true);
CREATE POLICY "Users report their own found items" ON public.found_items
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = finder_id);
CREATE POLICY "Finders update their found items" ON public.found_items
  FOR UPDATE TO authenticated
  USING (auth.uid() = finder_id OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (auth.uid() = finder_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Finders delete their found items" ON public.found_items
  FOR DELETE TO authenticated
  USING (auth.uid() = finder_id OR public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER found_items_updated_at BEFORE UPDATE ON public.found_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ITEM CONTACTS (PII kept out of browsable rows)
CREATE TABLE public.item_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_type TEXT NOT NULL CHECK (item_type IN ('lost', 'found', 'resource')),
  item_id UUID NOT NULL,
  owner_id UUID NOT NULL,
  contact_info TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (item_type, item_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.item_contacts TO authenticated;
GRANT ALL ON public.item_contacts TO service_role;
ALTER TABLE public.item_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners read their item contacts" ON public.item_contacts
  FOR SELECT TO authenticated
  USING (auth.uid() = owner_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Owners write their item contacts" ON public.item_contacts
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owners update their item contacts" ON public.item_contacts
  FOR UPDATE TO authenticated
  USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owners delete their item contacts" ON public.item_contacts
  FOR DELETE TO authenticated USING (auth.uid() = owner_id);

-- CLAIMS
CREATE TABLE public.item_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  found_item_id UUID NOT NULL REFERENCES public.found_items(id) ON DELETE CASCADE,
  claimant_id UUID NOT NULL,
  lost_item_id UUID REFERENCES public.lost_items(id) ON DELETE SET NULL,
  message TEXT NOT NULL DEFAULT '',
  status public.claim_status NOT NULL DEFAULT 'pending',
  decided_by UUID,
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.item_claims TO authenticated;
GRANT ALL ON public.item_claims TO service_role;
ALTER TABLE public.item_claims ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Claim parties read claims" ON public.item_claims
  FOR SELECT TO authenticated
  USING (
    auth.uid() = claimant_id
    OR public.has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM public.found_items f WHERE f.id = found_item_id AND f.finder_id = auth.uid())
  );
CREATE POLICY "Users create their own claims" ON public.item_claims
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = claimant_id);
CREATE POLICY "Finders decide claims" ON public.item_claims
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM public.found_items f WHERE f.id = found_item_id AND f.finder_id = auth.uid())
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM public.found_items f WHERE f.id = found_item_id AND f.finder_id = auth.uid())
  );

-- RESOURCE LISTINGS
CREATE TABLE public.resource_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'Other',
  item_condition TEXT NOT NULL DEFAULT 'Good',
  availability public.resource_availability NOT NULL DEFAULT 'available',
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.resource_listings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.resource_listings TO authenticated;
GRANT ALL ON public.resource_listings TO service_role;
ALTER TABLE public.resource_listings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can browse resources" ON public.resource_listings
  FOR SELECT USING (true);
CREATE POLICY "Owners create resources" ON public.resource_listings
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owners update resources" ON public.resource_listings
  FOR UPDATE TO authenticated
  USING (auth.uid() = owner_id OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (auth.uid() = owner_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Owners delete resources" ON public.resource_listings
  FOR DELETE TO authenticated
  USING (auth.uid() = owner_id OR public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER resource_listings_updated_at BEFORE UPDATE ON public.resource_listings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- BORROW REQUESTS
CREATE TABLE public.borrow_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID NOT NULL REFERENCES public.resource_listings(id) ON DELETE CASCADE,
  requester_id UUID NOT NULL,
  lender_id UUID NOT NULL,
  message TEXT NOT NULL DEFAULT '',
  requested_duration TEXT NOT NULL DEFAULT '1 week',
  status public.borrow_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.borrow_requests TO authenticated;
GRANT ALL ON public.borrow_requests TO service_role;
ALTER TABLE public.borrow_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Borrow parties read requests" ON public.borrow_requests
  FOR SELECT TO authenticated
  USING (auth.uid() = requester_id OR auth.uid() = lender_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Requesters create requests" ON public.borrow_requests
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = requester_id AND auth.uid() <> lender_id);
CREATE POLICY "Lenders decide requests" ON public.borrow_requests
  FOR UPDATE TO authenticated
  USING (auth.uid() = lender_id OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (auth.uid() = lender_id OR public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER borrow_requests_updated_at BEFORE UPDATE ON public.borrow_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- NOTIFICATIONS
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  kind TEXT NOT NULL DEFAULT 'info',
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own notifications" ON public.notifications
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users mark own notifications read" ON public.notifications
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Indexes
CREATE INDEX lost_items_category_idx ON public.lost_items (category);
CREATE INDEX lost_items_reporter_idx ON public.lost_items (reporter_id);
CREATE INDEX found_items_category_idx ON public.found_items (category);
CREATE INDEX found_items_finder_idx ON public.found_items (finder_id);
CREATE INDEX resource_listings_owner_idx ON public.resource_listings (owner_id);
CREATE INDEX notifications_user_idx ON public.notifications (user_id, read);

-- Demo seed data
INSERT INTO public.profiles (id, full_name, campus) VALUES
  ('11111111-1111-4111-8111-111111111111', 'Campus Desk', 'Central Campus'),
  ('22222222-2222-4222-8222-222222222222', 'Student Union', 'Central Campus');

INSERT INTO public.lost_items (id, reporter_id, title, description, category, location_lost, date_lost) VALUES
  ('aaaaaaa1-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', 'Black steel water bottle', 'Matte black 750ml bottle with a small dent near the base and a faded sticker.', 'Bottle', 'Library, 2nd floor', CURRENT_DATE - 2),
  ('aaaaaaa1-0000-4000-8000-000000000002', '22222222-2222-4222-8222-222222222222', 'Student ID card - second year', 'Blue lanyard attached, ID card for a second year electronics student.', 'ID Card', 'Canteen entrance', CURRENT_DATE - 1),
  ('aaaaaaa1-0000-4000-8000-000000000003', '11111111-1111-4111-8111-111111111111', 'Grey wired earphones', 'Grey braided cable, small crack on the left earbud.', 'Electronics', 'Bus bay 3', CURRENT_DATE - 5);

INSERT INTO public.found_items (id, finder_id, title, description, category, location_found, date_found) VALUES
  ('bbbbbbb1-0000-4000-8000-000000000001', '22222222-2222-4222-8222-222222222222', 'Black bottle found near reading room', 'Found a black metal bottle on a reading room desk, dented at the bottom.', 'Bottle', 'Library, reading room', CURRENT_DATE - 1),
  ('bbbbbbb1-0000-4000-8000-000000000002', '11111111-1111-4111-8111-111111111111', 'Scientific calculator', 'Casio scientific calculator with initials scratched on the back cover.', 'Electronics', 'Lab block, room 204', CURRENT_DATE - 3),
  ('bbbbbbb1-0000-4000-8000-000000000003', '22222222-2222-4222-8222-222222222222', 'Spiral notebook with physics notes', 'A4 spiral notebook, physics notes up to chapter 7, no name inside.', 'Stationery', 'Lecture hall B', CURRENT_DATE);

INSERT INTO public.resource_listings (id, owner_id, title, description, category, item_condition, availability) VALUES
  ('ccccccc1-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', 'Engineering Mathematics vol. 2', 'Third edition, all chapters intact, light pencil marks.', 'Books', 'Good', 'available'),
  ('ccccccc1-0000-4000-8000-000000000002', '22222222-2222-4222-8222-222222222222', 'Scientific calculator (FX-991)', 'Works fine, happy to lend for exam weeks.', 'Electronics', 'Good', 'lent'),
  ('ccccccc1-0000-4000-8000-000000000003', '11111111-1111-4111-8111-111111111111', 'Basic electronics lab kit', 'Breadboard, jumper set, multimeter. Return within two weeks.', 'Lab Kit', 'Fair', 'available');
