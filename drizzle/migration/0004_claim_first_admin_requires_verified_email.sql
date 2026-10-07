CREATE OR REPLACE FUNCTION public.claim_first_admin()
 RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'Sign in required.'; end if;
  if not exists (select 1 from auth.users where id = uid and email_confirmed_at is not null) then
    raise exception 'Please verify your email address first.';
  end if;
  perform pg_advisory_xact_lock(hashtext('claim_first_admin'));
  if exists (select 1 from public.user_roles where role = 'admin') then
    raise exception 'Initial setup is no longer available.';
  end if;
  insert into public.user_roles (user_id, role) values (uid, 'admin') on conflict do nothing;
  perform public.log_admin(uid, 'first_admin_created', uid, 'user', 'admin', 'Initial administrator setup');
  return true;
end $function$;