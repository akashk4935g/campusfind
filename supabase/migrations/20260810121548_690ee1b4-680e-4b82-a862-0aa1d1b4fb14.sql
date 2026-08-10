CREATE POLICY "Signed-in users view item photos" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'item-photos');
CREATE POLICY "Users upload own item photos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'item-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users update own item photos" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'item-photos' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'item-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users delete own item photos" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'item-photos' AND (storage.foldername(name))[1] = auth.uid()::text);