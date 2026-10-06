CREATE OR REPLACE FUNCTION public.admin_update_profile(
  _target uuid,
  _full_name text,
  _phone text,
  _account_number text,
  _created_at timestamptz,
  _reason text DEFAULT NULL
) RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _admin uuid := public.assert_admin();
  _prev public.profiles;
  _row public.profiles;
BEGIN
  SELECT * INTO _prev FROM public.profiles WHERE id = _target;
  IF NOT FOUND THEN RAISE EXCEPTION 'Customer not found'; END IF;

  IF _account_number IS NOT NULL AND btrim(_account_number) <> ''
     AND EXISTS (SELECT 1 FROM public.profiles WHERE account_number = btrim(_account_number) AND id <> _target) THEN
    RAISE EXCEPTION 'That account number is already in use';
  END IF;

  UPDATE public.profiles SET
    full_name = COALESCE(NULLIF(btrim(_full_name), ''), full_name),
    phone = CASE WHEN _phone IS NULL THEN phone ELSE NULLIF(btrim(_phone), '') END,
    account_number = COALESCE(NULLIF(btrim(_account_number), ''), account_number),
    created_at = COALESCE(_created_at, created_at)
  WHERE id = _target
  RETURNING * INTO _row;

  PERFORM public.log_admin(
    _admin,
    'profile_updated',
    _target,
    _prev.full_name || ' · ' || COALESCE(_prev.phone, '—') || ' · ' || _prev.account_number || ' · ' || to_char(_prev.created_at, 'YYYY-MM-DD'),
    _row.full_name || ' · ' || COALESCE(_row.phone, '—') || ' · ' || _row.account_number || ' · ' || to_char(_row.created_at, 'YYYY-MM-DD'),
    _reason
  );

  RETURN _row;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_upsert_notification(
  _id uuid,
  _target uuid,
  _title text,
  _message text,
  _type text,
  _created_at timestamptz,
  _read boolean DEFAULT NULL
) RETURNS public.notifications
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _admin uuid := public.assert_admin();
  _row public.notifications;
BEGIN
  IF _title IS NULL OR btrim(_title) = '' THEN RAISE EXCEPTION 'A title is required'; END IF;

  IF _id IS NULL THEN
    INSERT INTO public.notifications (user_id, title, message, type, read, created_at)
    VALUES (_target, btrim(_title), COALESCE(_message, ''), COALESCE(NULLIF(btrim(_type), ''), 'info'), COALESCE(_read, false), COALESCE(_created_at, now()))
    RETURNING * INTO _row;
    PERFORM public.log_admin(_admin, 'notification_created', _target, NULL, _row.title, NULL);
  ELSE
    UPDATE public.notifications SET
      title = btrim(_title),
      message = COALESCE(_message, message),
      type = COALESCE(NULLIF(btrim(_type), ''), type),
      read = COALESCE(_read, read),
      created_at = COALESCE(_created_at, created_at)
    WHERE id = _id
    RETURNING * INTO _row;
    IF NOT FOUND THEN RAISE EXCEPTION 'Notification not found'; END IF;
    PERFORM public.log_admin(_admin, 'notification_updated', _row.user_id, _row.id::text, _row.title || ' · ' || to_char(_row.created_at, 'YYYY-MM-DD HH24:MI'), NULL);
  END IF;

  RETURN _row;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_notification(_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _admin uuid := public.assert_admin();
  _row public.notifications;
BEGIN
  DELETE FROM public.notifications WHERE id = _id RETURNING * INTO _row;
  IF NOT FOUND THEN RAISE EXCEPTION 'Notification not found'; END IF;
  PERFORM public.log_admin(_admin, 'notification_deleted', _row.user_id, _row.title, NULL, NULL);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_profile(uuid, text, text, text, timestamptz, text) FROM public, anon;
REVOKE ALL ON FUNCTION public.admin_upsert_notification(uuid, uuid, text, text, text, timestamptz, boolean) FROM public, anon;
REVOKE ALL ON FUNCTION public.admin_delete_notification(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_profile(uuid, text, text, text, timestamptz, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_upsert_notification(uuid, uuid, text, text, text, timestamptz, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_notification(uuid) TO authenticated;