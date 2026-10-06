-- ENUMS
DO $$ BEGIN CREATE TYPE public.invest_category AS ENUM ('stocks','crypto','forex'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.invest_status AS ENUM ('active','paused','closed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.risk_level AS ENUM ('low','medium','high'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ASSETS
CREATE TABLE IF NOT EXISTS public.investment_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  symbol text NOT NULL UNIQUE,
  category public.invest_category NOT NULL,
  description text NOT NULL DEFAULT '',
  icon_url text,
  min_investment numeric NOT NULL DEFAULT 200 CHECK (min_investment >= 200),
  risk public.risk_level NOT NULL DEFAULT 'medium',
  enabled boolean NOT NULL DEFAULT true,
  price numeric NOT NULL CHECK (price > 0),
  day_open numeric NOT NULL DEFAULT 0,
  day_open_at timestamptz NOT NULL DEFAULT now(),
  volatility numeric NOT NULL DEFAULT 0.015 CHECK (volatility >= 0 AND volatility <= 0.25),
  trend numeric NOT NULL DEFAULT 0 CHECK (trend >= -0.05 AND trend <= 0.05),
  max_daily_move numeric NOT NULL DEFAULT 0.12 CHECK (max_daily_move > 0 AND max_daily_move <= 0.5),
  update_interval_seconds integer NOT NULL DEFAULT 20 CHECK (update_interval_seconds >= 5),
  last_tick_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.investment_assets TO authenticated;
GRANT ALL ON public.investment_assets TO service_role;
ALTER TABLE public.investment_assets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "assets readable" ON public.investment_assets;
CREATE POLICY "assets readable" ON public.investment_assets FOR SELECT TO authenticated USING (true);

-- POSITIONS
CREATE TABLE IF NOT EXISTS public.investment_positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  asset_id uuid NOT NULL REFERENCES public.investment_assets(id),
  category public.invest_category NOT NULL,
  amount numeric NOT NULL CHECK (amount >= 200),
  entry_price numeric NOT NULL CHECK (entry_price > 0),
  quantity numeric NOT NULL CHECK (quantity > 0),
  current_value numeric NOT NULL DEFAULT 0,
  status public.invest_status NOT NULL DEFAULT 'active',
  reference text NOT NULL DEFAULT ('INV-' || upper(substr(md5(random()::text),1,10))),
  paused_at timestamptz,
  closed_at timestamptz,
  final_value numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS investment_positions_user_idx ON public.investment_positions(user_id);
GRANT SELECT ON public.investment_positions TO authenticated;
GRANT ALL ON public.investment_positions TO service_role;
ALTER TABLE public.investment_positions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own positions" ON public.investment_positions;
CREATE POLICY "own positions" ON public.investment_positions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- INVESTMENT TRANSACTIONS
CREATE TABLE IF NOT EXISTS public.investment_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  position_id uuid NOT NULL REFERENCES public.investment_positions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  asset_id uuid NOT NULL REFERENCES public.investment_assets(id),
  type text NOT NULL,
  amount numeric NOT NULL,
  price numeric NOT NULL,
  quantity numeric NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.investment_transactions TO authenticated;
GRANT ALL ON public.investment_transactions TO service_role;
ALTER TABLE public.investment_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own investment txns" ON public.investment_transactions;
CREATE POLICY "own investment txns" ON public.investment_transactions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- PRICE HISTORY
CREATE TABLE IF NOT EXISTS public.investment_price_history (
  id bigserial PRIMARY KEY,
  asset_id uuid NOT NULL REFERENCES public.investment_assets(id) ON DELETE CASCADE,
  price numeric NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS price_history_asset_idx ON public.investment_price_history(asset_id, recorded_at DESC);
GRANT SELECT ON public.investment_price_history TO authenticated;
GRANT ALL ON public.investment_price_history TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.investment_price_history_id_seq TO service_role;
ALTER TABLE public.investment_price_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "price history readable" ON public.investment_price_history;
CREATE POLICY "price history readable" ON public.investment_price_history FOR SELECT TO authenticated USING (true);

-- SIMULATION SETTINGS (singleton)
CREATE TABLE IF NOT EXISTS public.investment_simulation_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton boolean NOT NULL DEFAULT true UNIQUE,
  engine_enabled boolean NOT NULL DEFAULT true,
  update_interval_seconds integer NOT NULL DEFAULT 20 CHECK (update_interval_seconds >= 5),
  max_daily_move numeric NOT NULL DEFAULT 0.12 CHECK (max_daily_move > 0 AND max_daily_move <= 0.5),
  default_volatility numeric NOT NULL DEFAULT 0.015 CHECK (default_volatility >= 0 AND default_volatility <= 0.25),
  market_trend numeric NOT NULL DEFAULT 0 CHECK (market_trend >= -0.05 AND market_trend <= 0.05),
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.investment_simulation_settings TO authenticated;
GRANT ALL ON public.investment_simulation_settings TO service_role;
ALTER TABLE public.investment_simulation_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "simulation settings readable" ON public.investment_simulation_settings;
CREATE POLICY "simulation settings readable" ON public.investment_simulation_settings FOR SELECT TO authenticated USING (true);
INSERT INTO public.investment_simulation_settings (singleton) VALUES (true) ON CONFLICT (singleton) DO NOTHING;

-- SEED ASSETS
INSERT INTO public.investment_assets (name, symbol, category, description, price, day_open, min_investment, risk, volatility, trend, max_daily_move)
VALUES
 ('Apple Inc.','AAPL','stocks','Consumer technology leader with hardware, services and wearables revenue streams.',214.35,212.90,200,'low',0.010,0.0008,0.08),
 ('NVIDIA Corp.','NVDA','stocks','Semiconductor designer powering accelerated computing and AI infrastructure.',121.80,118.40,200,'high',0.028,0.0015,0.15),
 ('Tesla, Inc.','TSLA','stocks','Electric vehicle and energy storage manufacturer with a high-beta profile.',248.10,254.70,250,'high',0.030,-0.0005,0.15),
 ('Nike, Inc.','NKE','stocks','Global athletic apparel and footwear brand with broad retail distribution.',78.20,77.65,200,'medium',0.014,0.0002,0.09),
 ('Bitcoin','BTC','crypto','The largest digital asset by market capitalisation, traded around the clock.',67350.00,66120.00,200,'high',0.032,0.0010,0.18),
 ('Ethereum','ETH','crypto','Smart-contract network asset underpinning decentralised applications.',3412.55,3488.20,200,'high',0.035,0.0006,0.18),
 ('Solana','SOL','crypto','High-throughput blockchain asset with elevated volatility.',148.90,143.10,200,'high',0.042,0.0012,0.20),
 ('Euro / US Dollar','EURUSD','forex','The most traded currency pair in global foreign exchange markets.',1.0862,1.0879,200,'low',0.004,0.0000,0.03),
 ('British Pound / US Dollar','GBPUSD','forex','Major currency pair sensitive to UK and US rate expectations.',1.2714,1.2688,200,'medium',0.005,0.0001,0.04)
ON CONFLICT (symbol) DO NOTHING;

-- SIMULATION ENGINE
CREATE OR REPLACE FUNCTION public.tick_market()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cfg public.investment_simulation_settings; a record; shock numeric; np numeric; cap numeric;
BEGIN
  SELECT * INTO cfg FROM public.investment_simulation_settings LIMIT 1;
  IF cfg IS NULL OR NOT cfg.engine_enabled THEN RETURN; END IF;

  FOR a IN SELECT * FROM public.investment_assets WHERE enabled = true FOR UPDATE LOOP
    IF now() - a.last_tick_at < make_interval(secs => greatest(a.update_interval_seconds, cfg.update_interval_seconds)) THEN
      CONTINUE;
    END IF;
    IF now() - a.day_open_at > interval '24 hours' OR a.day_open <= 0 THEN
      UPDATE public.investment_assets SET day_open = a.price, day_open_at = now() WHERE id = a.id;
      a.day_open := a.price; a.day_open_at := now();
    END IF;

    shock := (random() - 0.5) * 2 * a.volatility + a.trend + cfg.market_trend;
    np := round(a.price * (1 + shock), 6);
    cap := least(a.max_daily_move, cfg.max_daily_move);
    np := least(a.day_open * (1 + cap), greatest(a.day_open * (1 - cap), np));
    IF np <= 0 THEN np := a.price; END IF;

    UPDATE public.investment_assets SET price = np, last_tick_at = now(), updated_at = now() WHERE id = a.id;
    INSERT INTO public.investment_price_history (asset_id, price) VALUES (a.id, np);

    UPDATE public.investment_positions p
       SET current_value = round(p.quantity * np, 2), updated_at = now()
     WHERE p.asset_id = a.id AND p.status = 'active';
  END LOOP;

  DELETE FROM public.investment_price_history WHERE recorded_at < now() - interval '30 days';
END;
$$;

-- DETERMINISTIC SIMULATED SERIES FOR CHARTS
CREATE OR REPLACE FUNCTION public.asset_series(_asset_id uuid, _period text)
RETURNS TABLE(t timestamptz, price numeric) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE a public.investment_assets; pts int; span interval; i int; seed int; dev numeric; scale numeric; noise numeric;
BEGIN
  SELECT * INTO a FROM public.investment_assets WHERE id = _asset_id;
  IF NOT FOUND THEN RETURN; END IF;
  CASE upper(coalesce(_period,'1D'))
    WHEN '1W' THEN span := interval '7 days'; pts := 56; scale := 2.2;
    WHEN '1M' THEN span := interval '30 days'; pts := 60; scale := 4.0;
    WHEN '3M' THEN span := interval '90 days'; pts := 90; scale := 6.5;
    WHEN '1Y' THEN span := interval '365 days'; pts := 73; scale := 11.0;
    ELSE span := interval '1 day'; pts := 48; scale := 1.0;
  END CASE;
  seed := abs(hashtext(a.id::text || upper(coalesce(_period,'1D'))));
  FOR i IN 0..pts LOOP
    noise := ((abs(hashtext(seed::text || i::text)) % 2000)::numeric / 1000.0) - 1.0;
    dev := a.volatility * scale * (0.6 * sin((i + (seed % 19))::numeric / 3.4) + 0.7 * noise);
    dev := dev * (1 - (i::numeric / pts));
    t := now() - span + (span * i / pts);
    price := round(greatest(a.price * (1 + dev), a.price * 0.2), 6);
    RETURN NEXT;
  END LOOP;
END;
$$;

-- CREATE INVESTMENT
CREATE OR REPLACE FUNCTION public.create_investment(_asset_id uuid, _amount numeric)
RETURNS public.investment_positions LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); a public.investment_assets; pstatus public.account_status; avail numeric; acct public.accounts; qty numeric; p public.investment_positions;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'You must be signed in.'; END IF;
  PERFORM public.release_due_fund_locks(uid);
  SELECT status INTO pstatus FROM public.profiles WHERE id = uid;
  IF pstatus <> 'active' THEN RAISE EXCEPTION 'Your account is % and cannot open investments.', pstatus; END IF;
  SELECT * INTO a FROM public.investment_assets WHERE id = _asset_id;
  IF NOT FOUND OR NOT a.enabled THEN RAISE EXCEPTION 'This investment is not available.'; END IF;
  IF _amount IS NULL OR _amount < 200 THEN RAISE EXCEPTION 'The minimum investment is 200.00.'; END IF;
  IF _amount < a.min_investment THEN RAISE EXCEPTION 'The minimum investment for % is %.', a.symbol, to_char(a.min_investment,'FM999999999.00'); END IF;
  avail := public.available_balance(uid);
  IF _amount > avail THEN RAISE EXCEPTION 'Amount exceeds your available balance.'; END IF;

  SELECT * INTO acct FROM public.accounts WHERE user_id = uid FOR UPDATE;
  qty := round(_amount / a.price, 8);

  INSERT INTO public.investment_positions (user_id, asset_id, category, amount, entry_price, quantity, current_value)
  VALUES (uid, a.id, a.category, _amount, a.price, qty, _amount) RETURNING * INTO p;

  UPDATE public.accounts SET total_balance = acct.total_balance - _amount, updated_at = now() WHERE user_id = uid;

  INSERT INTO public.transactions (user_id, type, amount, description, balance_before, balance_after, status)
  VALUES (uid, 'investment'::public.txn_type, _amount, 'Investment opened '||p.reference||' · '||a.symbol,
          acct.total_balance, acct.total_balance - _amount, 'completed');

  INSERT INTO public.investment_transactions (position_id, user_id, asset_id, type, amount, price, quantity, note)
  VALUES (p.id, uid, a.id, 'open', _amount, a.price, qty, 'Simulated position opened');

  INSERT INTO public.notifications (user_id, title, message, type)
  VALUES (uid, 'Investment opened', 'Your simulated position in '||a.symbol||' of '||to_char(_amount,'FM999999999.00')||' is now active.', 'investment');

  RETURN p;
END;
$$;

-- CLOSE (owner or admin)
CREATE OR REPLACE FUNCTION public.close_investment(_id uuid, _reason text DEFAULT NULL)
RETURNS public.investment_positions LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); p public.investment_positions; a public.investment_assets; acct public.accounts; val numeric; is_adm boolean;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'You must be signed in.'; END IF;
  is_adm := public.has_role(uid,'admin');
  SELECT * INTO p FROM public.investment_positions WHERE id = _id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Investment not found.'; END IF;
  IF p.user_id <> uid AND NOT is_adm THEN RAISE EXCEPTION 'Not authorised.'; END IF;
  IF p.status = 'closed' THEN RAISE EXCEPTION 'This investment is already closed.'; END IF;

  SELECT * INTO a FROM public.investment_assets WHERE id = p.asset_id;
  val := round(p.quantity * a.price, 2);
  SELECT * INTO acct FROM public.accounts WHERE user_id = p.user_id FOR UPDATE;

  UPDATE public.investment_positions
     SET status = 'closed', closed_at = now(), final_value = val, current_value = val, updated_at = now()
   WHERE id = p.id RETURNING * INTO p;

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
$$;

-- ADMIN: pause / resume
CREATE OR REPLACE FUNCTION public.admin_set_investment_status(_id uuid, _status public.invest_status, _reason text DEFAULT NULL)
RETURNS public.investment_positions LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE adm uuid := public.assert_admin(); prev public.invest_status; p public.investment_positions;
BEGIN
  IF _status = 'closed' THEN RETURN public.close_investment(_id, _reason); END IF;
  SELECT status INTO prev FROM public.investment_positions WHERE id = _id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Investment not found.'; END IF;
  IF prev = 'closed' THEN RAISE EXCEPTION 'A closed investment cannot be reopened.'; END IF;
  UPDATE public.investment_positions
     SET status = _status, paused_at = CASE WHEN _status = 'paused' THEN now() ELSE NULL END, updated_at = now()
   WHERE id = _id RETURNING * INTO p;
  PERFORM public.log_admin(adm, CASE WHEN _status='paused' THEN 'investment_paused' ELSE 'investment_resumed' END,
                           p.user_id, prev::text, _status::text, _reason);
  INSERT INTO public.notifications (user_id, title, message, type)
  VALUES (p.user_id, 'Investment '||_status::text, 'Your simulated position '||p.reference||' is now '||_status::text||'.', 'investment');
  RETURN p;
END;
$$;

-- ADMIN: assets
CREATE OR REPLACE FUNCTION public.admin_upsert_asset(
  _id uuid, _name text, _symbol text, _category public.invest_category, _description text,
  _icon_url text, _min_investment numeric, _risk public.risk_level, _enabled boolean,
  _price numeric, _volatility numeric, _trend numeric, _max_daily_move numeric,
  _update_interval_seconds integer, _reason text DEFAULT NULL)
RETURNS public.investment_assets LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE adm uuid := public.assert_admin(); prev public.investment_assets; a public.investment_assets;
BEGIN
  IF coalesce(btrim(_name),'') = '' OR coalesce(btrim(_symbol),'') = '' THEN RAISE EXCEPTION 'Name and symbol are required.'; END IF;
  IF coalesce(_min_investment,200) < 200 THEN RAISE EXCEPTION 'The minimum investment cannot be below 200.00.'; END IF;
  IF _id IS NULL THEN
    IF _price IS NULL OR _price <= 0 THEN RAISE EXCEPTION 'A starting price is required.'; END IF;
    INSERT INTO public.investment_assets (name, symbol, category, description, icon_url, min_investment, risk, enabled, price, day_open, volatility, trend, max_daily_move, update_interval_seconds)
    VALUES (btrim(_name), upper(btrim(_symbol)), _category, coalesce(_description,''), _icon_url, coalesce(_min_investment,200), coalesce(_risk,'medium'), coalesce(_enabled,true),
            _price, _price, coalesce(_volatility,0.015), coalesce(_trend,0), coalesce(_max_daily_move,0.12), coalesce(_update_interval_seconds,20))
    RETURNING * INTO a;
    PERFORM public.log_admin(adm, 'asset_created', NULL, NULL, a.symbol||' @ '||to_char(a.price,'FM999999999.000000'), _reason);
  ELSE
    SELECT * INTO prev FROM public.investment_assets WHERE id = _id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Asset not found.'; END IF;
    UPDATE public.investment_assets SET
      name = coalesce(nullif(btrim(_name),''), name),
      symbol = coalesce(nullif(upper(btrim(_symbol)),''), symbol),
      category = coalesce(_category, category),
      description = coalesce(_description, description),
      icon_url = _icon_url,
      min_investment = coalesce(_min_investment, min_investment),
      risk = coalesce(_risk, risk),
      enabled = coalesce(_enabled, enabled),
      price = coalesce(nullif(_price,0), price),
      day_open = CASE WHEN _price IS NOT NULL AND _price <> 0 AND prev.day_open = 0 THEN _price ELSE day_open END,
      volatility = coalesce(_volatility, volatility),
      trend = coalesce(_trend, trend),
      max_daily_move = coalesce(_max_daily_move, max_daily_move),
      update_interval_seconds = coalesce(_update_interval_seconds, update_interval_seconds),
      updated_at = now()
    WHERE id = _id RETURNING * INTO a;
    PERFORM public.log_admin(adm,
      CASE WHEN prev.enabled AND NOT a.enabled THEN 'asset_disabled'
           WHEN NOT prev.enabled AND a.enabled THEN 'asset_enabled'
           ELSE 'asset_edited' END,
      NULL,
      prev.symbol||' · '||prev.category::text||' · min '||to_char(prev.min_investment,'FM999999999.00')||' · '||prev.enabled::text,
      a.symbol||' · '||a.category::text||' · min '||to_char(a.min_investment,'FM999999999.00')||' · '||a.enabled::text,
      _reason);
  END IF;
  RETURN a;
END;
$$;

-- ADMIN: simulation settings
CREATE OR REPLACE FUNCTION public.admin_update_simulation(
  _engine_enabled boolean, _update_interval_seconds integer, _max_daily_move numeric,
  _default_volatility numeric, _market_trend numeric, _reason text DEFAULT NULL)
RETURNS public.investment_simulation_settings LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE adm uuid := public.assert_admin(); prev public.investment_simulation_settings; s public.investment_simulation_settings;
BEGIN
  SELECT * INTO prev FROM public.investment_simulation_settings LIMIT 1;
  UPDATE public.investment_simulation_settings SET
    engine_enabled = coalesce(_engine_enabled, engine_enabled),
    update_interval_seconds = coalesce(_update_interval_seconds, update_interval_seconds),
    max_daily_move = coalesce(_max_daily_move, max_daily_move),
    default_volatility = coalesce(_default_volatility, default_volatility),
    market_trend = coalesce(_market_trend, market_trend),
    updated_by = adm, updated_at = now()
  WHERE singleton = true RETURNING * INTO s;
  PERFORM public.log_admin(adm, 'simulation_config_changed', NULL,
    prev.update_interval_seconds::text||'s · cap '||prev.max_daily_move::text||' · vol '||prev.default_volatility::text||' · trend '||prev.market_trend::text||' · on '||prev.engine_enabled::text,
    s.update_interval_seconds::text||'s · cap '||s.max_daily_move::text||' · vol '||s.default_volatility::text||' · trend '||s.market_trend::text||' · on '||s.engine_enabled::text,
    _reason);
  RETURN s;
END;
$$;

-- ADMIN: all investments
CREATE OR REPLACE FUNCTION public.admin_investments()
RETURNS TABLE(id uuid, user_id uuid, full_name text, email text, avatar_url text, asset_id uuid, symbol text, asset_name text,
  category public.invest_category, amount numeric, entry_price numeric, quantity numeric, current_price numeric,
  current_value numeric, status public.invest_status, reference text, created_at timestamptz, updated_at timestamptz,
  closed_at timestamptz, final_value numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE adm uuid := public.assert_admin();
BEGIN
  RETURN QUERY
  SELECT p.id, p.user_id, pr.full_name, pr.email, pr.avatar_url, a.id, a.symbol, a.name, p.category,
         p.amount, p.entry_price, p.quantity, a.price,
         CASE WHEN p.status = 'active' THEN round(p.quantity * a.price,2) ELSE p.current_value END,
         p.status, p.reference, p.created_at, p.updated_at, p.closed_at, p.final_value
  FROM public.investment_positions p
  JOIN public.investment_assets a ON a.id = p.asset_id
  LEFT JOIN public.profiles pr ON pr.id = p.user_id
  ORDER BY p.created_at DESC;
END;
$$;