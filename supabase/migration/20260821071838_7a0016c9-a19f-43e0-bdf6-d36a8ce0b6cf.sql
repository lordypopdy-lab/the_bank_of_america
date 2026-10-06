
do $$ begin
  if not exists (select 1 from pg_type where typname = 'kyc_status') then
    create type public.kyc_status as enum ('not_verified','pending','verified','declined');
  end if;
end $$;

create table if not exists public.kyc_verifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  country text not null,
  id_type text not null,
  document_path text not null,
  selfie_path text not null,
  status public.kyc_status not null default 'pending',
  rejection_reason text,
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid,
  created_at timestamptz not null default now()
);

create index if not exists kyc_verifications_user_idx on public.kyc_verifications(user_id);

grant select on public.kyc_verifications to authenticated;
grant all on public.kyc_verifications to service_role;

alter table public.kyc_verifications enable row level security;

drop policy if exists "own kyc" on public.kyc_verifications;
create policy "own kyc" on public.kyc_verifications for select to authenticated
  using ((user_id = auth.uid()) or public.has_role(auth.uid(),'admin'));

-- storage policies for private kyc bucket
drop policy if exists "kyc own read" on storage.objects;
create policy "kyc own read" on storage.objects for select to authenticated
  using (bucket_id = 'kyc' and ((storage.foldername(name))[1] = auth.uid()::text or public.has_role(auth.uid(),'admin')));

drop policy if exists "kyc own upload" on storage.objects;
create policy "kyc own upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'kyc' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "kyc own delete" on storage.objects;
create policy "kyc own delete" on storage.objects for delete to authenticated
  using (bucket_id = 'kyc' and ((storage.foldername(name))[1] = auth.uid()::text or public.has_role(auth.uid(),'admin')));

-- submit
create or replace function public.submit_kyc(_country text, _id_type text, _document_path text, _selfie_path text)
returns public.kyc_verifications
language plpgsql security definer set search_path to 'public'
as $$
declare uid uuid := auth.uid(); k public.kyc_verifications;
begin
  if uid is null then raise exception 'You must be signed in.'; end if;
  if coalesce(btrim(_country),'') = '' then raise exception 'Select your country.'; end if;
  if coalesce(btrim(_id_type),'') = '' then raise exception 'Select an ID type.'; end if;
  if coalesce(btrim(_document_path),'') = '' then raise exception 'Upload your ID document.'; end if;
  if coalesce(btrim(_selfie_path),'') = '' then raise exception 'Complete the face capture.'; end if;
  if split_part(_document_path,'/',1) <> uid::text or split_part(_selfie_path,'/',1) <> uid::text then
    raise exception 'Invalid upload location.';
  end if;

  perform pg_advisory_xact_lock(hashtext('submit_kyc:'||uid::text));

  if exists (select 1 from public.kyc_verifications where user_id = uid and status in ('pending','verified')) then
    raise exception 'You already have a verification in progress or approved.';
  end if;

  insert into public.kyc_verifications (user_id, country, id_type, document_path, selfie_path, status)
  values (uid, btrim(_country), btrim(_id_type), _document_path, _selfie_path, 'pending')
  returning * into k;

  insert into public.notifications (user_id, title, message, type)
  values (uid, 'KYC submitted', 'Your identity verification has been submitted and is pending review.', 'account');

  return k;
end;
$$;

-- admin list
create or replace function public.admin_kyc()
returns table(id uuid, user_id uuid, full_name text, email text, account_number text, country text, id_type text,
              document_path text, selfie_path text, status public.kyc_status, rejection_reason text,
              submitted_at timestamptz, reviewed_at timestamptz, reviewed_by uuid, reviewer_email text)
language plpgsql stable security definer set search_path to 'public'
as $$
declare adm uuid := public.assert_admin();
begin
  return query
  select k.id, k.user_id, p.full_name, p.email, p.account_number, k.country, k.id_type,
         k.document_path, k.selfie_path, k.status, k.rejection_reason,
         k.submitted_at, k.reviewed_at, k.reviewed_by, rp.email
  from public.kyc_verifications k
  left join public.profiles p on p.id = k.user_id
  left join public.profiles rp on rp.id = k.reviewed_by
  order by k.submitted_at desc;
end;
$$;

-- review
create or replace function public.admin_review_kyc(_id uuid, _status public.kyc_status, _reason text default null)
returns public.kyc_verifications
language plpgsql security definer set search_path to 'public'
as $$
declare adm uuid := public.assert_admin(); prev public.kyc_verifications; k public.kyc_verifications;
begin
  if _status not in ('verified','declined') then raise exception 'Choose approve or decline.'; end if;
  if _status = 'declined' and coalesce(btrim(_reason),'') = '' then raise exception 'A decline reason is required.'; end if;

  select * into prev from public.kyc_verifications where id = _id for update;
  if not found then raise exception 'Submission not found.'; end if;

  update public.kyc_verifications
     set status = _status,
         rejection_reason = case when _status = 'declined' then btrim(_reason) else null end,
         reviewed_at = now(), reviewed_by = adm
   where id = _id returning * into k;

  perform public.log_admin(adm, case when _status='verified' then 'kyc_approved' else 'kyc_declined' end,
                           k.user_id, prev.status::text, k.status::text, _reason);

  insert into public.notifications (user_id, title, message, type)
  values (k.user_id,
          case when _status='verified' then 'KYC verified' else 'KYC declined' end,
          case when _status='verified' then 'Your identity has been verified. Thank you.'
               else 'Your identity verification was declined. Reason: '||coalesce(btrim(_reason),'Not specified')||'. You may submit again.' end,
          'account');
  return k;
end;
$$;

-- delete
create or replace function public.admin_delete_kyc(_id uuid, _reason text default null)
returns void
language plpgsql security definer set search_path to 'public'
as $$
declare adm uuid := public.assert_admin(); k public.kyc_verifications;
begin
  delete from public.kyc_verifications where id = _id returning * into k;
  if not found then raise exception 'Submission not found.'; end if;
  perform public.log_admin(adm, 'kyc_deleted', k.user_id, k.status::text, 'deleted', _reason);
end;
$$;

revoke all on function public.submit_kyc(text,text,text,text) from public, anon;
revoke all on function public.admin_kyc() from public, anon;
revoke all on function public.admin_review_kyc(uuid, public.kyc_status, text) from public, anon;
revoke all on function public.admin_delete_kyc(uuid, text) from public, anon;
grant execute on function public.submit_kyc(text,text,text,text) to authenticated;
grant execute on function public.admin_kyc() to authenticated;
grant execute on function public.admin_review_kyc(uuid, public.kyc_status, text) to authenticated;
grant execute on function public.admin_delete_kyc(uuid, text) to authenticated;
