CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
begin
  insert into public.profiles (id, full_name, email, phone)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name',''), coalesce(new.email,''), new.raw_user_meta_data->>'phone');
  insert into public.accounts (user_id) values (new.id);
  insert into public.withdrawal_restrictions (user_id) values (new.id);
  insert into public.user_roles (user_id, role) values (new.id, 'user') on conflict do nothing;
  insert into public.notifications (user_id, title, message, type)
  values (new.id, 'Welcome to Vaultline', 'Your account has been created successfully.', 'account');
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.active_admin_count(_exclude uuid DEFAULT NULL)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  select count(distinct r.user_id)::int from public.user_roles r
  join public.profiles p on p.id = r.user_id
  where r.role = 'admin' and p.status = 'active' and (_exclude is null or r.user_id <> _exclude)
$$;
REVOKE EXECUTE ON FUNCTION public.active_admin_count(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.guard_last_admin_role()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
begin
  if old.role = 'admin' and (tg_op = 'DELETE' or new.role <> 'admin') then
    if exists (select 1 from public.user_roles where role='admin')
       and public.active_admin_count(old.user_id) = 0 then
      raise exception 'At least one active administrator must remain.';
    end if;
  end if;
  return coalesce(new, old);
end $$;
DROP TRIGGER IF EXISTS guard_last_admin_role ON public.user_roles;
CREATE TRIGGER guard_last_admin_role BEFORE DELETE OR UPDATE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.guard_last_admin_role();

CREATE OR REPLACE FUNCTION public.guard_last_admin_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
begin
  if old.status = 'active' and new.status <> 'active'
     and public.has_role(new.id, 'admin')
     and public.active_admin_count(new.id) = 0 then
    raise exception 'You cannot disable the last active administrator.';
  end if;
  return new;
end $$;
DROP TRIGGER IF EXISTS guard_last_admin_status ON public.profiles;
CREATE TRIGGER guard_last_admin_status BEFORE UPDATE OF status ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.guard_last_admin_status();

CREATE OR REPLACE FUNCTION public.admin_setup_available()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  select not exists (select 1 from public.user_roles where role = 'admin')
$$;
GRANT EXECUTE ON FUNCTION public.admin_setup_available() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.claim_first_admin()
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'Sign in required.'; end if;
  perform pg_advisory_xact_lock(hashtext('claim_first_admin'));
  if exists (select 1 from public.user_roles where role = 'admin') then
    raise exception 'Initial setup is no longer available.';
  end if;
  insert into public.user_roles (user_id, role) values (uid, 'admin') on conflict do nothing;
  perform public.log_admin(uid, 'first_admin_created', uid, 'user', 'admin', 'Initial administrator setup');
  return true;
end $$;
REVOKE EXECUTE ON FUNCTION public.claim_first_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_first_admin() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_set_role(_target uuid, _make_admin boolean, _reason text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
declare adm uuid := public.assert_admin(); was boolean;
begin
  if not exists (select 1 from public.profiles where id = _target) then raise exception 'User not found.'; end if;
  was := public.has_role(_target, 'admin');
  if _make_admin then
    insert into public.user_roles (user_id, role) values (_target, 'admin') on conflict do nothing;
  else
    delete from public.user_roles where user_id = _target and role = 'admin';
  end if;
  perform public.log_admin(adm, case when _make_admin then 'admin_role_granted' else 'admin_role_revoked' end,
    _target, case when was then 'admin' else 'user' end, case when _make_admin then 'admin' else 'user' end, _reason);
  return _make_admin;
end $$;
REVOKE EXECUTE ON FUNCTION public.admin_set_role(uuid, boolean, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_role(uuid, boolean, text) TO authenticated;