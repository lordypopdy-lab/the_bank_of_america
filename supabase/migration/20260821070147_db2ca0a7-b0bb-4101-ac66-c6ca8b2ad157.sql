CREATE OR REPLACE FUNCTION public.create_investment(_asset_id uuid, _amount numeric)
 RETURNS investment_positions
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE uid uuid := auth.uid(); a public.investment_assets; pstatus public.account_status; avail numeric; acct public.accounts; qty numeric; p public.investment_positions; amt numeric;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'You must be signed in.'; END IF;

  -- one investment request per user at a time (blocks duplicate submissions)
  PERFORM pg_advisory_xact_lock(hashtext('create_investment:' || uid::text));

  PERFORM public.release_due_fund_locks(uid);

  SELECT status INTO pstatus FROM public.profiles WHERE id = uid;
  IF pstatus <> 'active' THEN RAISE EXCEPTION 'Your account is % and cannot open investments.', pstatus; END IF;

  SELECT * INTO a FROM public.investment_assets WHERE id = _asset_id;
  IF NOT FOUND OR NOT a.enabled THEN RAISE EXCEPTION 'This investment is not available.'; END IF;

  amt := round(coalesce(_amount, 0), 2);
  IF amt IS NULL OR amt <= 0 THEN RAISE EXCEPTION 'Enter a valid investment amount.'; END IF;
  IF amt < 200 THEN RAISE EXCEPTION 'The minimum investment is 200.00.'; END IF;
  IF amt < a.min_investment THEN RAISE EXCEPTION 'The minimum investment for % is %.', a.symbol, to_char(a.min_investment,'FM999999999.00'); END IF;

  -- lock the account row first, then recompute available funds server-side
  SELECT * INTO acct FROM public.accounts WHERE user_id = uid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Account not found.'; END IF;

  avail := public.available_balance(uid);
  IF avail <= 0 THEN
    RAISE EXCEPTION 'You have no available balance to invest. Locked or pending funds cannot be invested.';
  END IF;
  IF amt > avail THEN
    RAISE EXCEPTION 'Insufficient available balance. You can invest up to %.', to_char(avail,'FM999999999.00');
  END IF;
  IF acct.total_balance - amt < acct.locked_balance THEN
    RAISE EXCEPTION 'This investment would use locked funds. Locked funds cannot be invested.';
  END IF;

  qty := round(amt / a.price, 8);

  INSERT INTO public.investment_positions (user_id, asset_id, category, amount, entry_price, quantity, current_value)
  VALUES (uid, a.id, a.category, amt, a.price, qty, amt) RETURNING * INTO p;

  UPDATE public.accounts SET total_balance = acct.total_balance - amt, updated_at = now() WHERE user_id = uid;

  INSERT INTO public.transactions (user_id, type, amount, description, balance_before, balance_after, status)
  VALUES (uid, 'investment'::public.txn_type, amt, 'Investment opened '||p.reference||' · '||a.symbol,
          acct.total_balance, acct.total_balance - amt, 'completed');

  INSERT INTO public.investment_transactions (position_id, user_id, asset_id, type, amount, price, quantity, note)
  VALUES (p.id, uid, a.id, 'open', amt, a.price, qty, 'Simulated position opened');

  INSERT INTO public.notifications (user_id, title, message, type)
  VALUES (uid, 'Investment opened', 'Your simulated position in '||a.symbol||' of '||to_char(amt,'FM999999999.00')||' is now active.', 'investment');

  RETURN p;
END;
$function$;

CREATE OR REPLACE FUNCTION public.close_investment(_id uuid, _reason text DEFAULT NULL::text)
 RETURNS investment_positions
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE uid uuid := auth.uid(); p public.investment_positions; a public.investment_assets; acct public.accounts; val numeric; is_adm boolean;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'You must be signed in.'; END IF;
  is_adm := public.has_role(uid,'admin');

  -- serialise concurrent close attempts on the same position
  PERFORM pg_advisory_xact_lock(hashtext('close_investment:' || _id::text));

  SELECT * INTO p FROM public.investment_positions WHERE id = _id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Investment not found.'; END IF;
  IF p.user_id <> uid AND NOT is_adm THEN RAISE EXCEPTION 'Not authorised.'; END IF;
  IF p.status = 'closed' OR p.closed_at IS NOT NULL THEN RAISE EXCEPTION 'This investment is already closed.'; END IF;

  SELECT * INTO a FROM public.investment_assets WHERE id = p.asset_id;
  val := round(p.quantity * a.price, 2);
  IF val IS NULL OR val < 0 THEN val := 0; END IF;

  SELECT * INTO acct FROM public.accounts WHERE user_id = p.user_id FOR UPDATE;

  UPDATE public.investment_positions
     SET status = 'closed', closed_at = now(), final_value = val, current_value = val, updated_at = now()
   WHERE id = p.id AND status <> 'closed' RETURNING * INTO p;
  IF NOT FOUND THEN RAISE EXCEPTION 'This investment is already closed.'; END IF;

  UPDATE public.accounts SET total_balance = acct.total_balance + val, updated_at = now() WHERE user_id = p.user_id;

  INSERT INTO public.transactions (user_id, type, amount, description, balance_before, balance_after, status)
  VALUES (p.user_id, 'investment_return'::public.txn_type, val, 'Investment closed '||p.reference||' · '||a.symbol,
          acct.total_balance, acct.total_balance + val, 'completed');

  INSERT INTO public.investment_transactions (position_id, user_id, asset_id, type, amount, price, quantity, note)
  VALUES (p.id, p.user_id, a.id, 'close', val, a.price, p.quantity, coalesce(_reason,'Position closed'));

  INSERT INTO public.notifications (user_id, title, message, type)
  VALUES (p.user_id, 'Investment closed', 'Your simulated position '||p.reference||' in '||a.symbol||' closed at '||to_char(val,'FM999999999.00')||'.', 'investment');

  IF is_adm AND p.user_id <> uid THEN
    PERFORM public.log_admin(uid, 'investment_closed', p.user_id, 'active', val::text, _reason);
  END IF;
  RETURN p;
END;
$function$;