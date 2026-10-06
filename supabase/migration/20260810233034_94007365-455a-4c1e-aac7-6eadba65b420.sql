
create policy "avatars readable by signed in" on storage.objects for select to authenticated using (bucket_id = 'avatars');
create policy "avatars own write" on storage.objects for insert to authenticated with check (bucket_id='avatars' and ((storage.foldername(name))[1] = auth.uid()::text or public.has_role(auth.uid(),'admin')));
create policy "avatars own update" on storage.objects for update to authenticated using (bucket_id='avatars' and ((storage.foldername(name))[1] = auth.uid()::text or public.has_role(auth.uid(),'admin')));
create policy "avatars own delete" on storage.objects for delete to authenticated using (bucket_id='avatars' and ((storage.foldername(name))[1] = auth.uid()::text or public.has_role(auth.uid(),'admin')));
