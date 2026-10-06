-- Ensure every transaction insert supplies a properly typed txn_type value.

CREATE OR REPLACE FUNCTION public.admin_adjust_balance(_target uuid, _amount numeric, _direction text, _reason text)
 RETURNS accounts
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare adm uuid := public.assert_admin(); acct public.accounts; prev numeric; delta numeric; ttype public.txn_type;
begin
  if _amount is null or _amount <= 0 then raise exception 'Enter a valid amount.'; end if;
  if coalesce(trim(_reason),'')='' then raise exception 'A reason is required.'; end if;
  if _direction not in ('debit','credit') then raise exception 'Direction must be debit or credit.'; end if;
  select * into acct from public.accounts where user_id = _target for update;
  if not found then raise exception 'Account not found.'; end if;
  prev := acct.total_balance;
  delta := case when _direction = 'debit' then -_amount else _amount end;
  ttype := (case when _direction = 'debit' then 'adjustment' else 'deposit' end)::public.txn_type;
  if prev + delta < acct.locked_balance then raise exception 'Adjustment would drop the balance below locked funds.'; end if;
  if prev + delta < 0 then raise exception 'Adjustment would make the balance negative.'; end if;
  update public.accounts set total_balance = prev + delta, updated_at = now() where user_id = _target returning * into acct;
  insert into public.transactions (user_id, type, amount, description, balance_before, balance_after, created_by)
  values (_target, ttype, abs(delta),
          case when _direction='debit' then 'Administrative debit: ' else 'Administrative credit: ' end || _reason,
          prev, acct.total_balance, adm);
  insert into public.notifications (user_id, title, message, type)
  values (_target, 'Balance updated', 'Your account balance was '||case when _direction='debit' then 'debited' else 'credited' end||' by '||to_char(abs(delta),'FM999999999.00')||'.', 'balance');
  perform public.log_admin(adm, case when _direction='debit' then 'balance_debited' else 'balance_credited' end, _target, prev::text, acct.total_balance::text, _reason);
  return acct;
end;
$function$;

CREATE OR REPLACE FUNCTION public.create_fund_lock(_amount numeric, _unlock_date timestamp with time zone)
 RETURNS fund_locks
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  select uid, 'fund_lock'::public.txn_type, _amount, 'Funds locked ('||l.reference||') until '||to_char(_unlock_date,'DD Mon YYYY'), a.total_balance, a.total_balance
  from public.accounts a where a.user_id = uid;
  insert into public.notifications (user_id, title, message, type)
  values (uid, 'Funds locked', to_char(_amount,'FM999999999.00')||' locked until '||to_char(_unlock_date,'DD Mon YYYY')||'.', 'fund_lock');
  return l;
end;
$function$;

CREATE OR REPLACE FUNCTION public.release_due_fund_locks(_user_id uuid DEFAULT NULL::uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare r record;
begin
  for r in select * from public.fund_locks
           where status = 'active' and unlock_date <= now()
             and (_user_id is null or user_id = _user_id)
  loop
    update public.fund_locks set status='released', released_at=now() where id = r.id;
    update public.accounts set locked_balance = greatest(locked_balance - r.amount, 0), updated_at=now() where user_id = r.user_id;
    insert into public.transactions (user_id, type, amount, description, balance_before, balance_after)
    select r.user_id, 'fund_unlock'::public.txn_type, r.amount,
      'Fund lock released ('||r.reference||') locked on '||to_char(r.locked_at,'DD Mon YYYY'),
      a.total_balance, a.total_balance from public.accounts a where a.user_id = r.user_id;
    insert into public.notifications (user_id, title, message, type)
    values (r.user_id, 'Funds unlocked', 'Your locked funds of '||to_char(r.amount,'FM999999999.00')||' are now available.', 'fund_lock');
  end loop;
end;
$function$;

CREATE OR REPLACE FUNCTION public.request_withdrawal(_amount numeric, _bank_name text, _account_name text, _account_number text, _note text DEFAULT NULL::text)
 RETURNS withdrawals
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  select uid, 'withdrawal'::public.txn_type, _amount, 'Withdrawal request '||w.reference||' to '||_bank_name, 'pending', a.total_balance, a.total_balance
  from public.accounts a where a.user_id = uid;
  insert into public.notifications (user_id, title, message, type)
  values (uid, 'Withdrawal submitted', 'Your withdrawal request '||w.reference||' is pending review.', 'withdrawal');
  return w;
end;
$function$;

CREATE OR REPLACE FUNCTION public.admin_update_withdrawal(_id uuid, _status withdrawal_status DEFAULT NULL::withdrawal_status, _processing_date timestamp with time zone DEFAULT NULL::timestamp with time zone, _expected_date timestamp with time zone DEFAULT NULL::timestamp with time zone, _completed_at timestamp with time zone DEFAULT NULL::timestamp with time zone, _reason text DEFAULT NULL::text)
 RETURNS withdrawals
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
      values (prev.user_id, 'withdrawal'::public.txn_type, w.amount, 'Withdrawal completed '||w.reference, acct.total_balance, greatest(acct.total_balance - w.amount,0), adm, 'completed');
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
$function$;