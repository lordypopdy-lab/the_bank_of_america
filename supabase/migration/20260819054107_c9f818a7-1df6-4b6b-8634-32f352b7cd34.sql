REVOKE ALL ON FUNCTION public.tick_market() FROM anon, public;
REVOKE ALL ON FUNCTION public.asset_series(uuid, text) FROM anon, public;
REVOKE ALL ON FUNCTION public.create_investment(uuid, numeric) FROM anon, public;
REVOKE ALL ON FUNCTION public.close_investment(uuid, text) FROM anon, public;
REVOKE ALL ON FUNCTION public.admin_set_investment_status(uuid, public.invest_status, text) FROM anon, public;
REVOKE ALL ON FUNCTION public.admin_upsert_asset(uuid, text, text, public.invest_category, text, text, numeric, public.risk_level, boolean, numeric, numeric, numeric, numeric, integer, text) FROM anon, public;
REVOKE ALL ON FUNCTION public.admin_update_simulation(boolean, integer, numeric, numeric, numeric, text) FROM anon, public;
REVOKE ALL ON FUNCTION public.admin_investments() FROM anon, public;

GRANT EXECUTE ON FUNCTION public.tick_market() TO authenticated;
GRANT EXECUTE ON FUNCTION public.asset_series(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_investment(uuid, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.close_investment(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_investment_status(uuid, public.invest_status, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_upsert_asset(uuid, text, text, public.invest_category, text, text, numeric, public.risk_level, boolean, numeric, numeric, numeric, numeric, integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_simulation(boolean, integer, numeric, numeric, numeric, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_investments() TO authenticated;