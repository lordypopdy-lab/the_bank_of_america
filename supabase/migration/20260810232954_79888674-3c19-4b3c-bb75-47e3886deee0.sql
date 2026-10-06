
-- ENUMS
create type public.app_role as enum ('admin','user');
create type public.account_status as enum ('active','restricted','suspended');
create type public.txn_type as enum ('deposit','withdrawal','adjustment','fund_lock','fund_unlock');
create type public.withdrawal_status as enum ('pending','under_review','approved','rejected','processing','completed');

-- PROFILES
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text not null default '',
  phone text,
  avatar_url text,
  account_number text not null unique default (lpad((floor(random()*1000000000))::bigint::text, 10, '0')),
  status public.account_status not null default 'active',
  status_message text,
  created_at timestamptz not null default now(),
  last_active_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

-- ROLES
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "own profile" on public.profiles for select to authenticated using (id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "update own profile" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "own roles" on public.user_roles for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));

-- ACCOUNTS
create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  total_balance numeric(14,2) not null default 0,
  locked_balance numeric(14,2) not null default 0,
  currency text not null default 'USD',
  updated_at timestamptz not null default now()
);
grant select on public.accounts to authenticated;
grant all on public.accounts to service_role;
alter table public.accounts enable row level security;
create policy "own account" on public.accounts for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));

-- TRANSACTIONS
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type public.txn_type not null,
  amount numeric(14,2) not null,
  description text not null default '',
  reference text not null unique default ('TXN-' || upper(substr(md5(random()::text),1,10))),
  balance_before numeric(14,2) not null default 0,
  balance_after numeric(14,2) not null default 0,
  status text not null default 'completed',
  created_by uuid,
  created_at timestamptz not null default now()
);
create index on public.transactions (user_id, created_at desc);
grant select on public.transactions to authenticated;
grant all on public.transactions to service_role;
alter table public.transactions enable row level security;
create policy "own txns" on public.transactions for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));

-- WITHDRAWALS
create table public.withdrawals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount numeric(14,2) not null,
  bank_name text not null,
  account_name text not null,
  account_number text not null,
  note text,
  status public.withdrawal_status not null default 'pending',
  reference text not null unique default ('WDR-' || upper(substr(md5(random()::text),1,10))),
  requested_at timestamptz not null default now(),
  processing_date timestamptz,
  expected_completion_date timestamptz,
  completed_at timestamptz,
  rejected_at timestamptz,
  rejection_reason text,
  reviewed_by uuid,
  updated_at timestamptz not null default now()
);
create index on public.withdrawals (user_id, requested_at desc);
create index on public.withdrawals (status);
grant select on public.withdrawals to authenticated;
grant all on public.withdrawals to service_role;
alter table public.withdrawals enable row level security;
create policy "own withdrawals" on public.withdrawals for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));

-- FUND LOCKS
create table public.fund_locks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount numeric(14,2) not null,
  locked_at timestamptz not null default now(),
  unlock_date timestamptz not null,
  status text not null default 'active',
  released_at timestamptz,
  reference text not null unique default ('LCK-' || upper(substr(md5(random()::text),1,10)))
);
create index on public.fund_locks (user_id, status);
grant select on public.fund_locks to authenticated;
grant all on public.fund_locks to service_role;
alter table public.fund_locks enable row level security;
create policy "own locks" on public.fund_locks for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));

-- NOTIFICATIONS
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  message text not null default '',
  type text not null default 'info',
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index on public.notifications (user_id, created_at desc);
grant select, update on public.notifications to authenticated;
grant all on public.notifications to service_role;
alter table public.notifications enable row level security;
create policy "own notifications" on public.notifications for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "mark own read" on public.notifications for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- WITHDRAWAL RESTRICTIONS
create table public.withdrawal_restrictions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  is_restricted boolean not null default false,
  message text,
  reason text,
  start_date timestamptz,
  end_date timestamptz,
  updated_by uuid,
  updated_at timestamptz not null default now()
);
grant select on public.withdrawal_restrictions to authenticated;
grant all on public.withdrawal_restrictions to service_role;
alter table public.withdrawal_restrictions enable row level security;
create policy "own restriction" on public.withdrawal_restrictions for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));

-- ADMIN ACTIVITY
create table public.admin_activity (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null,
  admin_email text,
  action text not null,
  target_user_id uuid,
  previous_value text,
  new_value text,
  reason text,
  reference text not null unique default ('AUD-' || upper(substr(md5(random()::text),1,10))),
  created_at timestamptz not null default now()
);
create index on public.admin_activity (created_at desc);
grant select on public.admin_activity to authenticated;
grant all on public.admin_activity to service_role;
alter table public.admin_activity enable row level security;
create policy "admins read audit" on public.admin_activity for select to authenticated using (public.has_role(auth.uid(),'admin'));

-- SIGNUP TRIGGER
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email, phone)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name',''), coalesce(new.email,''), new.raw_user_meta_data->>'phone');
  insert into public.accounts (user_id) values (new.id);
  insert into public.withdrawal_restrictions (user_id) values (new.id);
  insert into public.user_roles (user_id, role) values (new.id, 'user') on conflict do nothing;
  if lower(coalesce(new.email,'')) = 'deelordpopdy@gmail.com' then
    insert into public.user_roles (user_id, role) values (new.id, 'admin') on conflict do nothing;
  end if;
  insert into public.notifications (user_id, title, message, type)
  values (new.id, 'Welcome to Vaultline', 'Your account has been created successfully.', 'account');
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

-- HELPERS
create or replace function public.pending_withdrawal_total(_user_id uuid)
returns numeric language sql stable security definer set search_path = public as $$
  select coalesce(sum(amount),0) from public.withdrawals
  where user_id = _user_id and status in ('pending','under_review','approved','processing')
$$;

create or replace function public.available_balance(_user_id uuid)
returns numeric language sql stable security definer set search_path = public as $$
  select coalesce((select total_balance - locked_balance from public.accounts where user_id = _user_id),0)
         - public.pending_withdrawal_total(_user_id)
$$;

-- RELEASE DUE LOCKS
create or replace function public.release_due_fund_locks(_user_id uuid default null)
returns void language plpgsql security definer set search_path = public as $$
declare r record;
begin
  for r in select * from public.fund_locks
           where status = 'active' and unlock_date <= now()
             and (_user_id is null or user_id = _user_id)
  loop
    update public.fund_locks set status='released', released_at=now() where id = r.id;
    update public.accounts set locked_balance = greatest(locked_balance - r.amount, 0), updated_at=now() where user_id = r.user_id;
    insert into public.transactions (user_id, type, amount, description, balance_before, balance_after)
    select r.user_id, 'fund_unlock', r.amount,
      'Fund lock released ('||r.reference||') locked on '||to_char(r.locked_at,'DD Mon YYYY'),
      a.total_balance, a.total_balance from public.accounts a where a.user_id = r.user_id;
    insert into public.notifications (user_id, title, message, type)
    values (r.user_id, 'Funds unlocked', 'Your locked funds of '||to_char(r.amount,'FM999999999.00')||' are now available.', 'fund_lock');
  end loop;
end;
$$;

-- CUSTOMER: REQUEST WITHDRAWAL
create or replace function public.request_withdrawal(_amount numeric, _bank_name text, _account_name text, _account_number text, _note text default null)
returns public.withdrawals language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); pstatus public.account_status; res record; avail numeric; w public.withdrawals;
begin
  if uid is null then raise exception 'You must be signed in.'; end if;
  perform public.release_due_fund_locks(uid);
  if _amount is null or _amount <= 0 then raise exception 'Enter a valid withdrawal amount.'; end if;
  if coalesce(trim(_bank_name),'')='' or coalesce(trim(_account_name),'')='' or coalesce(trim(_account_number),'')='' then
    raise exception 'Complete destination account details are required.'; end if;
  select status into pstatus from public.profiles where id = uid;
  if pstatus <> 'active' then raise exception 'Your account is % and cannot request withdrawals.', pstatus; end if;
  select * into res from public.withdrawal_restrictions where user_id = uid;
  if res.is_restricted and (res.start_date is null or res.start_date <= now()) and (res.end_date is null or res.end_date > now()) then
    raise exception 'Withdrawals are currently unavailable on this account.';
  end if;
  avail := public.available_balance(uid);
  if _amount > avail then raise exception 'Amount exceeds your available balance.'; end if;
  insert into public.withdrawals (user_id, amount, bank_name, account_name, account_number, note, expected_completion_date)
  values (uid, _amount, _bank_name, _account_name, _account_number, _note, now() + interval '3 days')
  returning * into w;
  insert into public.transactions (user_id, type, amount, description, status, balance_before, balance_after)
  select uid, 'withdrawal', _amount, 'Withdrawal request '||w.reference||' to '||_bank_name, 'pending', a.total_balance, a.total_balance
  from public.accounts a where a.user_id = uid;
  insert into public.notifications (user_id, title, message, type)
  values (uid, 'Withdrawal submitted', 'Your withdrawal request '||w.reference||' is pending review.', 'withdrawal');
  return w;
end;
$$;

-- CUSTOMER: FUND LOCK
create or replace function public.create_fund_lock(_amount numeric, _unlock_date timestamptz)
returns public.fund_locks language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); avail numeric; l public.fund_locks;
begin
  if uid is null then raise exception 'You must be signed in.'; end if;
  perform public.release_due_fund_locks(uid);
  if _amount is null or _amount <= 0 then raise exception 'Enter a valid amount to lock.'; end if;
  if _unlock_date is null or _unlock_date <= now() then raise exception 'The unlock date must be in the future.'; end if;
  avail := public.available_balance(uid);
  if _amount > avail then raise exception 'Amount exceeds your available balance.'; end if;
  insert into public.fund_locks (user_id, amount, unlock_date) values (uid, _amount, _unlock_date) returning * into l;
  update public.accounts set locked_balance = locked_balance + _amount, updated_at = now() where user_id = uid;
  insert into public.transactions (user_id, type, amount, description, balance_before, balance_after)
  select uid, 'fund_lock', _amount, 'Funds locked ('||l.reference||') until '||to_char(_unlock_date,'DD Mon YYYY'), a.total_balance, a.total_balance
  from public.accounts a where a.user_id = uid;
  insert into public.notifications (user_id, title, message, type)
  values (uid, 'Funds locked', to_char(_amount,'FM999999999.00')||' locked until '||to_char(_unlock_date,'DD Mon YYYY')||'.', 'fund_lock');
  return l;
end;
$$;

-- ADMIN GUARD
create or replace function public.assert_admin()
returns uuid language plpgsql stable security definer set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if uid is null or not public.has_role(uid,'admin') then raise exception 'Not authorised.'; end if;
  return uid;
end;
$$;

create or replace function public.log_admin(_admin uuid, _action text, _target uuid, _prev text, _new text, _reason text)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.admin_activity (admin_id, admin_email, action, target_user_id, previous_value, new_value, reason)
  values (_admin, (select email from public.profiles where id=_admin), _action, _target, _prev, _new, _reason);
end;
$$;

-- ADMIN: BALANCE ADJUSTMENT
create or replace function public.admin_adjust_balance(_target uuid, _amount numeric, _direction text, _reason text)
returns public.accounts language plpgsql security definer set search_path = public as $$
declare adm uuid := public.assert_admin(); acct public.accounts; prev numeric; delta numeric;
begin
  if _amount is null or _amount <= 0 then raise exception 'Enter a valid amount.'; end if;
  if coalesce(trim(_reason),'')='' then raise exception 'A reason is required.'; end if;
  select * into acct from public.accounts where user_id = _target for update;
  if not found then raise exception 'Account not found.'; end if;
  prev := acct.total_balance;
  delta := case when _direction = 'debit' then -_amount else _amount end;
  if prev + delta < acct.locked_balance then raise exception 'Adjustment would drop the balance below locked funds.'; end if;
  if prev + delta < 0 then raise exception 'Adjustment would make the balance negative.'; end if;
  update public.accounts set total_balance = prev + delta, updated_at = now() where user_id = _target returning * into acct;
  insert into public.transactions (user_id, type, amount, description, balance_before, balance_after, created_by)
  values (_target, case when _direction='debit' then 'adjustment' else 'deposit' end, abs(delta),
          case when _direction='debit' then 'Administrative debit: ' else 'Administrative credit: ' end || _reason,
          prev, acct.total_balance, adm);
  insert into public.notifications (user_id, title, message, type)
  values (_target, 'Balance updated', 'Your account balance was '||case when _direction='debit' then 'debited' else 'credited' end||' by '||to_char(abs(delta),'FM999999999.00')||'.', 'balance');
  perform public.log_admin(adm, case when _direction='debit' then 'balance_debited' else 'balance_credited' end, _target, prev::text, acct.total_balance::text, _reason);
  return acct;
end;
$$;

-- ADMIN: WITHDRAWAL MANAGEMENT
create or replace function public.admin_update_withdrawal(
  _id uuid, _status public.withdrawal_status default null, _processing_date timestamptz default null,
  _expected_date timestamptz default null, _completed_at timestamptz default null, _reason text default null)
returns public.withdrawals language plpgsql security definer set search_path = public as $$
declare adm uuid := public.assert_admin(); w public.withdrawals; prev public.withdrawals; acct public.accounts;
begin
  select * into prev from public.withdrawals where id = _id for update;
  if not found then raise exception 'Withdrawal not found.'; end if;
  if _status = 'rejected' and coalesce(trim(_reason),'')='' then raise exception 'A rejection reason is required.'; end if;

  update public.withdrawals set
    status = coalesce(_status, prev.status),
    processing_date = coalesce(_processing_date, prev.processing_date),
    expected_completion_date = coalesce(_expected_date, prev.expected_completion_date),
    completed_at = case when coalesce(_status, prev.status) = 'completed' then coalesce(_completed_at, prev.completed_at, now()) else coalesce(_completed_at, prev.completed_at) end,
    rejected_at = case when _status = 'rejected' then now() else prev.rejected_at end,
    rejection_reason = case when _status = 'rejected' then _reason else prev.rejection_reason end,
    reviewed_by = adm, updated_at = now()
  where id = _id returning * into w;

  if _status is not null and _status <> prev.status then
    perform public.log_admin(adm, 'withdrawal_status_changed', prev.user_id, prev.status::text, w.status::text, _reason);
    insert into public.notifications (user_id, title, message, type)
    values (prev.user_id, 'Withdrawal '||replace(w.status::text,'_',' '), 'Your withdrawal '||w.reference||' is now '||replace(w.status::text,'_',' ')||coalesce('. Reason: '||_reason,'')||'.', 'withdrawal');
    update public.transactions set status = w.status::text where user_id = prev.user_id and description like '%'||w.reference||'%';

    if w.status = 'completed' then
      select * into acct from public.accounts where user_id = prev.user_id for update;
      update public.accounts set total_balance = greatest(acct.total_balance - w.amount,0), updated_at=now() where user_id = prev.user_id;
      insert into public.transactions (user_id, type, amount, description, balance_before, balance_after, created_by, status)
      values (prev.user_id, 'withdrawal', w.amount, 'Withdrawal completed '||w.reference, acct.total_balance, greatest(acct.total_balance - w.amount,0), adm, 'completed');
    end if;
  end if;

  if _processing_date is distinct from null and _processing_date is distinct from prev.processing_date then
    perform public.log_admin(adm, 'withdrawal_date_changed', prev.user_id, coalesce(prev.processing_date::text,'none'), _processing_date::text, coalesce(_reason,'Processing date updated'));
  end if;
  if _expected_date is distinct from null and _expected_date is distinct from prev.expected_completion_date then
    perform public.log_admin(adm, 'withdrawal_date_changed', prev.user_id, coalesce(prev.expected_completion_date::text,'none'), _expected_date::text, coalesce(_reason,'Expected completion date updated'));
  end if;
  return w;
end;
$$;

-- ADMIN: RESTRICTIONS
create or replace function public.admin_set_restriction(_target uuid, _is_restricted boolean, _message text, _reason text, _start timestamptz, _end timestamptz)
returns public.withdrawal_restrictions language plpgsql security definer set search_path = public as $$
declare adm uuid := public.assert_admin(); prev public.withdrawal_restrictions; r public.withdrawal_restrictions;
begin
  select * into prev from public.withdrawal_restrictions where user_id = _target;
  insert into public.withdrawal_restrictions (user_id, is_restricted, message, reason, start_date, end_date, updated_by, updated_at)
  values (_target, coalesce(_is_restricted,false), _message, _reason, _start, _end, adm, now())
  on conflict (user_id) do update set is_restricted = excluded.is_restricted, message = excluded.message,
    reason = excluded.reason, start_date = excluded.start_date, end_date = excluded.end_date,
    updated_by = adm, updated_at = now()
  returning * into r;
  perform public.log_admin(adm, case when r.is_restricted then 'withdrawal_restriction_enabled' else 'withdrawal_restriction_disabled' end,
    _target, coalesce(prev.is_restricted::text,'false'), r.is_restricted::text, _reason);
  insert into public.notifications (user_id, title, message, type)
  values (_target, case when r.is_restricted then 'Withdrawals restricted' else 'Withdrawal restriction removed' end,
    coalesce(nullif(_message,''), case when r.is_restricted then 'Withdrawals are currently unavailable on your account.' else 'You can now request withdrawals again.' end), 'withdrawal');
  return r;
end;
$$;

-- ADMIN: ACCOUNT STATUS
create or replace function public.admin_set_status(_target uuid, _status public.account_status, _message text, _reason text)
returns public.profiles language plpgsql security definer set search_path = public as $$
declare adm uuid := public.assert_admin(); prev public.account_status; p public.profiles;
begin
  select status into prev from public.profiles where id = _target;
  update public.profiles set status = _status, status_message = _message where id = _target returning * into p;
  perform public.log_admin(adm, 'account_status_changed', _target, prev::text, _status::text, _reason);
  insert into public.notifications (user_id, title, message, type)
  values (_target, 'Account status updated', 'Your account status is now '||_status::text||'.'||coalesce(' '||_message,''), 'account');
  return p;
end;
$$;

-- ADMIN: AVATAR
create or replace function public.admin_set_avatar(_target uuid, _url text)
returns public.profiles language plpgsql security definer set search_path = public as $$
declare adm uuid := public.assert_admin(); prev text; p public.profiles;
begin
  select avatar_url into prev from public.profiles where id = _target;
  update public.profiles set avatar_url = _url where id = _target returning * into p;
  perform public.log_admin(adm, 'profile_picture_changed', _target, coalesce(prev,'none'), coalesce(_url,'removed'), null);
  return p;
end;
$$;

create or replace function public.admin_log_event(_action text, _target uuid default null, _reason text default null)
returns void language plpgsql security definer set search_path = public as $$
declare adm uuid := public.assert_admin();
begin perform public.log_admin(adm, _action, _target, null, null, _reason); end;
$$;

-- ADMIN OVERVIEW (aggregates)
create or replace function public.admin_overview()
returns json language plpgsql stable security definer set search_path = public as $$
declare adm uuid := public.assert_admin();
begin
  return (select json_build_object(
    'total_users', (select count(*) from public.profiles),
    'active_users', (select count(*) from public.profiles where status='active'),
    'restricted_users', (select count(*) from public.profiles where status<>'active'),
    'total_balance', (select coalesce(sum(total_balance),0) from public.accounts),
    'locked_balance', (select coalesce(sum(locked_balance),0) from public.accounts),
    'pending_withdrawals', (select coalesce(sum(amount),0) from public.withdrawals where status in ('pending','under_review','approved')),
    'processing_withdrawals', (select coalesce(sum(amount),0) from public.withdrawals where status='processing'),
    'completed_withdrawals', (select coalesce(sum(amount),0) from public.withdrawals where status='completed'),
    'pending_count', (select count(*) from public.withdrawals where status in ('pending','under_review'))
  ));
end;
$$;

-- ADMIN: LIST USERS WITH FINANCIALS
create or replace function public.admin_users()
returns table (
  id uuid, full_name text, email text, phone text, avatar_url text, account_number text,
  status public.account_status, created_at timestamptz, last_active_at timestamptz,
  total_balance numeric, locked_balance numeric, available_balance numeric, pending_withdrawals numeric, is_restricted boolean
) language plpgsql stable security definer set search_path = public as $$
declare adm uuid := public.assert_admin();
begin
  return query
  select p.id, p.full_name, p.email, p.phone, p.avatar_url, p.account_number, p.status, p.created_at, p.last_active_at,
    coalesce(a.total_balance,0), coalesce(a.locked_balance,0),
    public.available_balance(p.id), public.pending_withdrawal_total(p.id), coalesce(r.is_restricted,false)
  from public.profiles p
  left join public.accounts a on a.user_id = p.id
  left join public.withdrawal_restrictions r on r.user_id = p.id
  order by p.created_at desc;
end;
$$;

grant execute on all functions in schema public to authenticated;
