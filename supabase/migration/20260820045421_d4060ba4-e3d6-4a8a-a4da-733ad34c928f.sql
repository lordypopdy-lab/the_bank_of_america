DO $$
DECLARE n int; lo numeric; hi numeric; bid uuid;
BEGIN
  PERFORM public.tick_market();
  SELECT id INTO bid FROM public.investment_assets WHERE symbol = 'BTC';
  SELECT count(*), min(price), max(price) INTO n, lo, hi FROM public.asset_series(bid, '1W');
  RAISE NOTICE 'series points=% low=% high=%', n, lo, hi;
  IF n < 10 OR lo IS NULL THEN RAISE EXCEPTION 'Chart series check failed'; END IF;
END $$;