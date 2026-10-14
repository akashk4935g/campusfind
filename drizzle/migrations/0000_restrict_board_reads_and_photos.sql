DROP POLICY IF EXISTS "Anyone can browse lost items" ON public.lost_items;
DROP POLICY IF EXISTS "Anyone can browse found items" ON public.found_items;
DROP POLICY IF EXISTS "Anyone can browse resources" ON public.resource_listings;

CREATE POLICY "Signed-in users browse lost items" ON public.lost_items FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Guests see tutorial lost items" ON public.lost_items FOR SELECT TO anon USING (is_sample = true);
CREATE POLICY "Signed-in users browse found items" ON public.found_items FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Guests see tutorial found items" ON public.found_items FOR SELECT TO anon USING (is_sample = true);
CREATE POLICY "Signed-in users browse resources" ON public.resource_listings FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Guests see tutorial resources" ON public.resource_listings FOR SELECT TO anon USING (is_sample = true);

DROP POLICY IF EXISTS "Signed-in users view item photos" ON storage.objects;
CREATE POLICY "Uploaders view own item photos" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'item-photos' AND ((storage.foldername(name))[1] = (auth.uid())::text OR private.has_role(auth.uid(), 'admin'::app_role)));